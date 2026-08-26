import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { loadLayeredEnv } from '@deepseek-ai/dsh-app-boot'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { bootAha } from '../src/composition.js'

describe('official DSH Web composition', () => {
  let context: Context
  let home: string

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
  }, 30_000)

  afterAll(async () => {
    await context.fiber.dispose()
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
    const response = await fetch(`http://127.0.0.1:${String(port)}/`)
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('<title>DeepSeek Harness</title>')
    expect(html).toContain('__DSH_BOOT__')
  })
})
