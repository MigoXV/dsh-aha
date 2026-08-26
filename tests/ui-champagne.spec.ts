import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import type { Context } from '@deepseek-ai/cordis'
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'
import { describe, expect, it, vi } from 'vitest'
import {
  CHAMPAGNE_THEME_TOKENS,
  HERO_GLOW_SUPPRESSION_CSS,
  LIGHT_BOOTSTRAP_SCRIPT,
  apply,
  champagneBootstrapCss,
} from '../packages/ui-champagne/src/index.js'

describe('Champagne Light host plugin', () => {
  it('injects one boot palette and a light-only pre-render guard', () => {
    let collect: ((table: IndexInjection[]) => void) | undefined
    const context = {
      on: vi.fn((event: string, listener: (table: IndexInjection[]) => void) => {
        expect(event).toBe('webserver/index-inject')
        collect = listener
      }),
    } as unknown as Context

    apply(context)
    const table: IndexInjection[] = []
    expect(collect).toBeDefined()
    collect?.(table)

    expect(table).toEqual([
      { kind: 'global', name: '__DSH_AHA_THEME__', value: CHAMPAGNE_THEME_TOKENS },
      { kind: 'style', text: champagneBootstrapCss() },
      { kind: 'script', placement: 'head', text: LIGHT_BOOTSTRAP_SCRIPT },
    ])
    expect(champagneBootstrapCss()).toContain('--dsw-alias-bg-base:#FBF9F4!important')
    expect(champagneBootstrapCss()).toContain(HERO_GLOW_SUPPRESSION_CSS)
    expect(HERO_GLOW_SUPPRESSION_CSS).toContain('[data-phase="hero"]')
    expect(HERO_GLOW_SUPPRESSION_CSS).toContain('[data-composer-seat]')
    expect(HERO_GLOW_SUPPRESSION_CSS).not.toMatch(/\.[\w-]{6,}/)
    expect(CHAMPAGNE_THEME_TOKENS).not.toHaveProperty('--dsw-shadow-lv2')
    expect(LIGHT_BOOTSTRAP_SCRIPT).toContain("removeAttribute('data-ds-dark-theme')")
    expect(LIGHT_BOOTSTRAP_SCRIPT).not.toContain('</script')
  })
})

interface ClientPluginExports {
  apply: (context: ClientPluginContext) => void
  inject: string[]
}

interface ClientPluginContext {
  effect: (install: () => () => void, label: string) => void
  theme: {
    overrideTokens: (source: string, tokens: Record<string, { light: string; dark: string }>) => () => void
    setTheme: (id: string) => void
  }
  slots: {
    inject: (name: string, register: () => () => void) => void
    register: (
      options: Record<string, unknown>,
      component: () => null,
    ) => () => void
  }
}

interface ClientRegistration {
  id: string
  factory: () => ClientPluginExports
}

describe('Champagne Light client plugin', () => {
  it('forces light, installs token overrides, and shadows Appearance by slot id', async () => {
    let registration: ClientRegistration | undefined
    const stopGuard = vi.fn()
    const sandbox = {
      __DSH_AHA_THEME__: CHAMPAGNE_THEME_TOKENS,
      __DSH_AHA_STOP_LIGHT_GUARD__: stopGuard,
      window: {
        __ModuleLoader__: {
          load(value: ClientRegistration) { registration = value },
        },
      },
    }
    Object.assign(sandbox, { globalThis: sandbox })
    const source = await readFile(new URL('../packages/ui-champagne/client.js', import.meta.url), 'utf8')
    runInNewContext(source, sandbox)

    expect(registration?.id).toBe('@dsh-aha/ui-champagne')
    const plugin = registration?.factory()
    expect(plugin?.inject).toEqual(['theme', 'slots'])

    const tokenDisposer = vi.fn()
    const slotDisposer = vi.fn()
    const overrideTokens = vi.fn<ClientPluginContext['theme']['overrideTokens']>(() => tokenDisposer)
    const setTheme = vi.fn<ClientPluginContext['theme']['setTheme']>()
    let slotOptions: Record<string, unknown> | undefined
    let slotComponent: (() => null) | undefined
    const context: ClientPluginContext = {
      effect(install, label) {
        expect(label).toBe('dsh-aha: Champagne Light theme tokens')
        install()
      },
      theme: { overrideTokens, setTheme },
      slots: {
        inject(name, register) {
          expect(name).toBe('settings.general.item')
          register()
        },
        register(options, component) {
          slotOptions = options
          slotComponent = component
          return slotDisposer
        },
      },
    }

    plugin?.apply(context)

    expect(setTheme).toHaveBeenCalledWith('light')
    expect(stopGuard).toHaveBeenCalledOnce()
    expect(overrideTokens).toHaveBeenCalledOnce()
    const [, overrides] = overrideTokens.mock.calls[0] ?? []
    expect(overrides?.['--dsw-alias-bg-base']).toEqual({ light: '#FBF9F4', dark: '#FBF9F4' })
    expect(Object.keys(overrides ?? {})).toHaveLength(Object.keys(CHAMPAGNE_THEME_TOKENS).length)
    expect(slotOptions).toEqual({
      name: 'settings.general.item',
      id: 'appearance',
      priority: -100,
      registrant: '@dsh-aha/ui-champagne',
    })
    expect(slotComponent?.()).toBeNull()
  })
})
