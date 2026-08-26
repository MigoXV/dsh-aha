import type { Context } from '@deepseek-ai/cordis'
import type { IndexInjection } from '@deepseek-ai/dsh-host-webserver'

/** Figma「Champagne Light」映射到官方 DSH 语义变量的固定亮色调色板。 */
export const CHAMPAGNE_THEME_TOKENS = {
  '--dsw-alias-bg-base': '#FBF9F4',
  '--dsw-alias-bg-layer-1': '#FFFDF9',
  '--dsw-alias-bg-layer-2': '#FFFDF9',
  '--dsw-alias-bg-layer-3': '#FFFDF9',
  '--dsw-alias-bg-mask-1': '#0000001F',
  '--dsw-alias-bg-mask-2': '#0000001F',
  '--dsw-alias-bg-mask-3': '#0000007A',
  '--dsw-alias-bg-module-platform': '#F1ECE2',
  '--dsw-alias-bg-multi-select': '#F1ECE2',
  '--dsw-alias-bg-overlay': '#E8E1D6',
  '--dsw-alias-bg-skeleton': '#24231F0A',
  '--dsw-alias-border-l1': '#E8E1D6',
  '--dsw-alias-border-l2-darkmode-thin': '#DDD6C9',
  '--dsw-alias-border-l2': '#DDD6C9',
  '--dsw-alias-border-l3': '#B9B1A5',
  '--dsw-alias-border-l4': '#898278',
  '--dsw-alias-brand-primary-invert': '#FFFDF9',
  '--dsw-alias-brand-primary': '#4176E6',
  '--dsw-alias-brand-text': '#24231F',
  '--dsw-alias-button-contrast-fill': '#49453F',
  '--dsw-alias-button-elevated-fill': '#FFFDF9',
  '--dsw-alias-button-floating-fill': '#FFFDF9',
  '--dsw-alias-button-floating-hover': '#F1ECE2',
  '--dsw-alias-button-ghost-active-border': '#B9B1A5',
  '--dsw-alias-button-ghost-active-fill': '#E8E1D6',
  '--dsw-alias-button-ghost-active-hover': '#DDD6C9',
  '--dsw-alias-button-info-fill': '#4176E6',
  '--dsw-alias-button-info-hover': '#3568D4',
  '--dsw-alias-button-primary-dimmed': '#E8E1D6',
  '--dsw-alias-button-primary-fill': '#4176E6',
  '--dsw-alias-button-primary-hover': '#3568D4',
  '--dsw-alias-interactive-bg-active': '#E8E1D6',
  '--dsw-alias-interactive-bg-hover-accent': '#D3E2FF',
  '--dsw-alias-interactive-bg-hover-danger': '#C53B3B0D',
  '--dsw-alias-interactive-bg-hover-solid': '#F1ECE2',
  '--dsw-alias-interactive-bg-hover': '#24231F0A',
  '--dsw-alias-label-caption': '#898278',
  '--dsw-alias-label-dimmed': '#B9B1A5',
  '--dsw-alias-label-primary-bluish': '#3568D4',
  '--dsw-alias-label-primary-dimmed': '#49453F',
  '--dsw-alias-label-primary-foreground': '#FFFDF9',
  '--dsw-alias-label-primary-inverted': '#FFFDF9',
  '--dsw-alias-label-primary': '#24231F',
  '--dsw-alias-label-secondary': '#69645C',
  '--dsw-alias-label-tertiary': '#898278',
  '--dsw-alias-markdown-citation': '#E8E1D6',
  '--dsw-alias-markdown-code-block-banner': '#F1ECE2',
  '--dsw-alias-markdown-code-block': '#F6F1E8',
  '--dsw-alias-markdown-code-segment-selected': '#FFFDF9',
  '--dsw-alias-markdown-code-segment-unselected': '#F1ECE2',
  '--dsw-alias-markdown-inline-code': '#F1ECE2',
  '--dsw-alias-markdown-placeholder': '#F6F1E8',
  '--dsw-alias-markdown-tag': '#F1ECE2',
  '--dsw-alias-scrollbar-bg-l1': '#DDD6C9',
  '--dsw-alias-scrollbar-bg-l2': '#DDD6C9',
  '--dsw-alias-scrollbar-hover-l1': '#B9B1A5',
  '--dsw-alias-scrollbar-hover-l2': '#B9B1A5',
  '--dsw-alias-state-business-primary': '#4176E6',
  '--dsw-alias-state-business-tertiary': '#D3E2FF',
  '--dsw-alias-state-error-primary': '#C53B3B',
  '--dsw-alias-state-error-secondary': '#C53B3B',
  '--dsw-alias-state-success-primary': '#1F8A4C',
  '--dsw-alias-state-success-secondary': '#1F8A4C',
  '--dsw-alias-state-success-tertiary': '#E6FAED',
  '--dsw-alias-state-warn-label': '#B66A13',
  '--dsw-alias-state-warn-primary': '#B66A13',
  '--dsw-alias-state-warn-secondary': '#B66A13',
  '--dsw-alias-state-warn-tertiary': '#FEF5E7',
  '--dsw-alias-toast-bg': '#24231F',
  '--dsw-alias-tooltip-bg': '#24231F',
  '--dsw-specific-bubble-highlight': '#D3E2FF',
  '--dsw-specific-bubble': '#F1ECE2',
  '--dsw-specific-input-major': '#FFFDF9',
  '--dsw-specific-login-input': '#F6F1E8',
  '--dsw-specific-menu': '#FFFDF9',
  '--dsw-specific-selector': '#F1ECE2',
  '--dsw-specific-sidebar-fill': '#F6F1E8',
  '--dsw-specific-sidebar-nav-item-active-accent': '#D3E2FF',
  '--dsw-specific-sidebar-nav-item-active': '#E8E1D6',
  '--dsw-specific-sidebar-nav-item-hover': '#F1ECE2',
  '--dsw-specific-tip': '#F1ECE2',
} as const

/**
 * 官方新会话 HeroGlow 是 aria-hidden 的纯装饰 SVG，颜色硬编码为蓝色，
 * 不经过主题 token。用稳定的页面状态与结构属性将它限制在空会话入口。
 */
export const HERO_GLOW_SUPPRESSION_CSS =
  '[data-phase="hero"] [data-composer-seat] svg[aria-hidden="true"][viewBox="0 0 1051 468"]{display:none!important}'

/** 在官方主题运行时接管前保持亮色，避免持久化 dark/system 偏好造成首屏闪烁。 */
export const LIGHT_BOOTSTRAP_SCRIPT = `(() => {
  let stopped = false
  const enforce = () => {
    if (stopped) return
    if (document.documentElement.style.colorScheme !== 'light') {
      document.documentElement.style.colorScheme = 'light'
    }
    document.body?.removeAttribute('data-ds-dark-theme')
  }
  const observer = new MutationObserver(enforce)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style', 'data-ds-dark-theme'],
    childList: true,
    subtree: true,
  })
  queueMicrotask(enforce)
  globalThis.__DSH_AHA_STOP_LIGHT_GUARD__ = () => {
    enforce()
    stopped = true
    observer.disconnect()
  }
})()`

/** 生成在动态官方样式之前即可生效、且不会被 dark palette 覆盖的首屏样式。 */
export function champagneBootstrapCss(): string {
  const declarations = Object.entries(CHAMPAGNE_THEME_TOKENS)
    .map(([name, value]) => `${name}:${value}!important`)
    .join(';')
  return `html{color-scheme:light!important;background:#FBF9F4}body,body[data-ds-dark-theme]{${declarations};background:var(--dsw-alias-bg-base)!important;color:var(--dsw-alias-label-primary)!important}${HERO_GLOW_SUPPRESSION_CSS}`
}

/** 挂载 dsh-aha 的首屏主题数据；交互期由同包客户端插件接管。 */
export function apply(ctx: Context): void {
  ctx.on('webserver/index-inject', (table: IndexInjection[]) => {
    table.push(
      { kind: 'global', name: '__DSH_AHA_THEME__', value: CHAMPAGNE_THEME_TOKENS },
      { kind: 'style', text: champagneBootstrapCss() },
      { kind: 'script', placement: 'head', text: LIGHT_BOOTSTRAP_SCRIPT },
    )
  })
}
