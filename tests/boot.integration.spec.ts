import { mkdtemp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { loadLayeredEnv } from '@deepseek-ai/dsh-app-boot'
import type {} from '@deepseek-ai/dsh-client-connection'
import { resolveLanTrust } from '@deepseek-ai/dsh-web-app'
import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { bootAha } from '../src/composition.js'

describe('official DSH Web composition', () => {
  let context: Context
  let home: string
  let baseUrl: string

  async function authenticate(url: string): Promise<string> {
    const connection = context.get('connection')
    if (connection === undefined) throw new Error('Connection not ready')
    const response = await fetch(connection.authenticatedUrl(url), { redirect: 'manual' })
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe('/')
    const cookie = response.headers.getSetCookie()[0]
    expect(cookie).toContain('HttpOnly')
    expect(cookie).not.toContain('; Secure')
    return cookie!.split(';')[0]!
  }

  beforeAll(async () => {
    home = await mkdtemp(join(tmpdir(), 'dsh-aha-test-'))
    vi.stubEnv('DSH_HOME', home)
    vi.stubEnv('DSH_TELEMETRY_DISABLED', '1')
    context = await bootAha({
      port: 0,
      trustedHosts: [],
      environment: loadLayeredEnv('dsh-aha-test'),
      requestExit: () => {},
    })
    baseUrl = `http://127.0.0.1:${String(context.get('webServer')?.port)}`
  }, 30_000)

  afterAll(async () => {
    await context?.fiber.dispose()
    vi.unstubAllEnvs()
    await rm(home, { recursive: true, force: true })
  })

  it('binds the official WebServer to all interfaces', () => {
    const webServer = context.get('webServer')
    expect(webServer?.host).toBe('0.0.0.0')
    expect(webServer?.port).toBeGreaterThan(0)
  })

  it('serves the official Web UI and boot roster', async () => {
    const port = context.get('webServer')?.port
    expect(port).toBeDefined()
    const cookie = await authenticate(baseUrl)
    const response = await fetch(baseUrl, { headers: { cookie } })
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('<title>DeepSeek Harness</title>')
    expect(html).toContain('__DSH_BOOT__')
    expect(html).toContain('__DSH_AHA_THEME__')
    expect(html).toContain('@dsh-aha/ui-champagne/client.js')
    expect(html).toContain("removeAttribute('data-ds-dark-theme')")
  })

  it('requires browser authentication and rejects untrusted origins', async () => {
    expect((await fetch(baseUrl)).status).toBe(401)
    expect((await fetch(`${baseUrl}/api/unknown`)).status).toBe(401)
    const cookie = await authenticate(baseUrl)
    expect((await fetch(`${baseUrl}/api/unknown`, {
      headers: { cookie, origin: 'http://untrusted.invalid' },
    })).status).toBe(403)
    const status = await new Promise<number | undefined>((resolve, reject) => {
      const req = request(`${baseUrl}/api/unknown`, {
        headers: { cookie, host: 'untrusted.invalid' },
      }, response => {
        response.resume()
        resolve(response.statusCode)
      })
      req.on('error', reject)
      req.end()
    })
    expect(status).toBe(403)
  })

  it('authenticates HTTP LAN access with an authority-specific cookie', async () => {
    const address = resolveLanTrust('0.0.0.0', []).lanAddresses[0]
    if (address === undefined) return
    const lanUrl = `http://${address}:${String(context.get('webServer')?.port)}`
    const localCookie = await authenticate(baseUrl)
    expect((await fetch(lanUrl, { headers: { cookie: localCookie } })).status).toBe(401)
    const cookie = await authenticate(lanUrl)
    expect((await fetch(lanUrl, { headers: { cookie } })).status).toBe(200)
    for (const path of ['/api/events.mux', '/api/events.host']) {
      expect((await fetch(`${lanUrl}${path}`, { headers: { cookie } })).status).toBe(404)
    }
  })

  it('loads and reconnects the browser over insecure LAN HTTP', async () => {
    const address = resolveLanTrust('0.0.0.0', []).lanAddresses[0]
    if (address === undefined) throw new Error('LAN browser test requires a non-loopback IPv4 interface')
    const url = `http://${address}:${String(context.get('webServer')?.port)}`
    const executablePath = process.env['CHROMIUM_PATH']
      ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
    const browser = await chromium.launch({
      ...(executablePath === undefined ? {} : { executablePath }),
      args: ['--no-sandbox', '--no-proxy-server'],
    })
    try {
      const browserContext = await browser.newContext()
      const page = await browserContext.newPage()
      const errors: string[] = []
      const sockets: string[] = []
      let readyCount = 0
      page.on('pageerror', error => errors.push(error.message))
      page.on('websocket', socket => {
        sockets.push(new URL(socket.url()).pathname)
        socket.on('framereceived', frame => {
          const message = JSON.parse(String(frame.payload)) as { value?: { type?: string } }
          if (message.value?.type === 'ready') readyCount++
        })
      })
      await page.goto(context.get('connection')!.authenticatedUrl(url))
      expect(await page.evaluate('window.isSecureContext')).toBe(false)
      await vi.waitFor(() => expect(readyCount).toBeGreaterThan(0), { timeout: 15_000 })
      expect(page.url()).toBe(`${url}/`)
      await page.getByRole('button', { name: 'Continue', exact: true }).click()
      await page.getByRole('button', { name: 'Choose workspace', exact: true }).click()
      await page.getByRole('button', { name: 'Edit path', exact: true }).click()
      await page.getByRole('textbox', { name: 'Edit path', exact: true }).fill(home)
      await page.getByRole('textbox', { name: 'Edit path', exact: true }).press('Enter')
      await page.getByRole('button', { name: 'Open', exact: true }).click()
      await vi.waitFor(async () => {
        expect(await page.getByRole('dialog', { name: 'Select Workspace Directory' }).count()).toBe(0)
      }, { timeout: 10_000 })
      const created = await page.request.post(`${url}/api/session/create`, {
        data: {
          type: 'client-request',
          rpcId: 'lan-session-create',
          method: 'session/create',
          payload: { args: { request: { cwd: home } } },
        },
      })
      expect(created.status()).toBe(200)
      const session = await created.json() as {
        result: { ok: boolean; value?: { sessionId: string; agentPreset: string } }
      }
      expect(session.result).toMatchObject({ ok: true, value: { agentPreset: 'standard' } })
      expect(session.result.value?.sessionId).toBeTruthy()
      await vi.waitFor(async () => {
        expect(await page.locator('body').innerText()).not.toMatch(/Loading|加载中/)
      }, { timeout: 10_000 })
      expect(await page.evaluate('getComputedStyle(document.body).getPropertyValue("--dsw-alias-bg-base").trim()'))
        .toBe('#FBF9F4')
      const initialReady = readyCount
      await page.reload()
      await vi.waitFor(() => expect(readyCount).toBeGreaterThan(initialReady), { timeout: 15_000 })
      await browserContext.setOffline(true)
      const beforeReconnect = readyCount
      await browserContext.setOffline(false)
      await vi.waitFor(() => expect(readyCount).toBeGreaterThan(beforeReconnect), { timeout: 15_000 })
      expect(sockets.length).toBeGreaterThanOrEqual(3)
      expect(sockets.every(path => path === '/api/remote.mux')).toBe(true)
      expect(errors).toEqual([])
    } finally {
      await browser.close()
    }
  }, 60_000)

  it('persists provider settings across LAN page reloads and new browsers', async () => {
    const address = resolveLanTrust('0.0.0.0', []).lanAddresses[0]
    if (address === undefined) throw new Error('LAN settings test requires a non-loopback IPv4 interface')
    const url = `http://${address}:${String(context.get('webServer')?.port)}`
    const executablePath = process.env['CHROMIUM_PATH']
      ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
    const launch = () => chromium.launch({
      ...(executablePath === undefined ? {} : { executablePath }),
      args: ['--no-sandbox', '--no-proxy-server'],
    })
    const failures: string[] = []
    const observe = (page: Page): void => {
      page.on('pageerror', error => failures.push(error.message))
      page.on('response', response => {
        if (response.status() >= 400) {
          failures.push(`${String(response.status())} ${new URL(response.url()).pathname}`)
        }
      })
    }
    const openModels = async (page: Page): Promise<void> => {
      await page.getByRole('button', { name: 'Settings', exact: true }).waitFor()
      const notice = page.getByRole('button', { name: 'Continue', exact: true })
      if (await notice.isVisible()) await notice.click()
      if (!await page.getByRole('dialog', { name: 'Settings', exact: true }).isVisible()) {
        await page.getByRole('button', { name: 'Settings', exact: true }).click()
      }
      await page.getByRole('button', { name: 'Models', exact: true }).click()
      await page.getByRole('heading', { name: 'Models', exact: true }).waitFor()
      expect(await page.locator('body').innerText()).not.toContain('settings are unavailable')
    }
    const verifyProvider = async (page: Page): Promise<void> => {
      await openModels(page)
      await page.getByRole('button', { name: /Edit .*openai/i }).click()
      await page.getByPlaceholder('Configured — enter a new value to replace').waitFor()
      await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    }
    let browser = await launch()
    try {
      const browserContext = await browser.newContext()
      const page = await browserContext.newPage()
      observe(page)
      await page.goto(context.get('connection')!.authenticatedUrl(url))
      expect(await page.evaluate('window.isSecureContext')).toBe(false)
      await openModels(page)
      await page.getByRole('button', { name: 'Add provider', exact: true }).click()
      await page.getByRole('combobox', { name: 'Provider', exact: true }).selectOption('openai')
      await page.getByRole('textbox', { name: 'API key', exact: true }).fill('dsh-aha-test-only')
      await page.getByRole('button', { name: 'Apply', exact: true }).click()
      await page.getByRole('button', { name: /Edit .*openai/i }).waitFor()

      await page.reload()
      await verifyProvider(page)
      await browserContext.setOffline(true)
      await browserContext.setOffline(false)
      await verifyProvider(page)

      await browser.close()
      browser = await launch()
      const reopened = await browser.newPage()
      observe(reopened)
      await reopened.goto(context.get('connection')!.authenticatedUrl(url))
      await verifyProvider(reopened)
      await reopened.getByRole('button', { name: 'General', exact: true }).click()
      await reopened.getByRole('button', { name: 'Increase font size', exact: true }).waitFor()
      expect(failures).toEqual([])
    } finally {
      await browser.close()
    }
  }, 60_000)
})
