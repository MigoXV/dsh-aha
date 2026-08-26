window.__ModuleLoader__.load({
  id: '@dsh-aha/ui-champagne',
  factory: () => {
    const module = { exports: {} }

    // Cordis waits on provided service names here. Package-level ordering remains
    // declared separately in package.json under dsh.client.inject.
    const inject = ['theme', 'slots']

    function readThemeTokens() {
      const tokens = globalThis.__DSH_AHA_THEME__
      if (tokens === null || typeof tokens !== 'object' || Array.isArray(tokens)) {
        throw new Error('dsh-aha: Champagne Light boot tokens are unavailable')
      }
      const overrides = {}
      for (const [name, value] of Object.entries(tokens)) {
        if (!name.startsWith('--dsw-') || typeof value !== 'string') {
          throw new Error(`dsh-aha: invalid Champagne Light token ${JSON.stringify(name)}`)
        }
        overrides[name] = { light: value, dark: value }
      }
      return overrides
    }

    function HiddenAppearanceRow() {
      return null
    }

    function apply(ctx) {
      const overrides = readThemeTokens()
      ctx.effect(
        () => ctx.theme.overrideTokens('@dsh-aha/ui-champagne', overrides),
        'dsh-aha: Champagne Light theme tokens',
      )

      // Light is the product contract, not a user-selectable appearance preference.
      ctx.theme.setTheme('light')
      globalThis.__DSH_AHA_STOP_LIGHT_GUARD__?.()
      delete globalThis.__DSH_AHA_STOP_LIGHT_GUARD__

      // The slot registry supports same-cell priority shadowing. This removes the
      // official Appearance contribution without depending on DOM text or build hashes.
      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'appearance',
        priority: -100,
        registrant: '@dsh-aha/ui-champagne',
      }, HiddenAppearanceRow))
    }

    module.exports.apply = apply
    module.exports.inject = inject
    return module.exports
  },
})
