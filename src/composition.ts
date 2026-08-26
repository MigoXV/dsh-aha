import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import { boot, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { provideCmdline } from '@deepseek-ai/dsh-cmdline'
import {
  DSH_LAUNCH_ENVIRONMENT_KEY,
  type LaunchEnvironmentSnapshot,
} from '@deepseek-ai/dsh-launch-environment'
import { LISTEN_HOST, type CliOptions } from './options.js'

const NAME = 'dsh-aha'
const ROOT_CONFIG = fileURLToPath(new URL('../config/cordis.yml', import.meta.url))
const BASE_PATCH = fileURLToPath(import.meta.resolve('@deepseek-ai/dsh-base/cordis.patch.yml'))
const WEB_PATCH = fileURLToPath(import.meta.resolve('@deepseek-ai/dsh-web-app/cordis.patch.yml'))
const DSH_PACKAGE = fileURLToPath(import.meta.resolve('@deepseek-ai/dsh/package.json'))
const SHIPPED_PRESET_ROOT = join(dirname(DSH_PACKAGE), 'config', 'agent-presets')

export interface BootOptions extends CliOptions {
  environment: LaunchEnvironmentSnapshot
  requestExit: (code: number) => void
}

/**
 * 生成官方 base/web bundle 之上的 dsh-aha 部署覆盖层。
 * @param options 启动参数。
 */
export function deploymentPatches(options: CliOptions): PatchOptions[] {
  return [
    { id: 'web-startup', disabled: true },
    {
      id: 'webserver',
      inject: [],
      config: { host: LISTEN_HOST, port: options.port },
    },
    {
      id: 'web-runtime',
      inject: [],
      config: {
        openBrowser: false,
        printUrl: false,
        surfaceContext: true,
        trustedHosts: [...options.trustedHosts],
      },
    },
    {
      id: 'agent-presets',
      config: {
        default: 'standard',
        roots: [{ path: SHIPPED_PRESET_ROOT, trust: 'system' }],
        includeUserRoot: true,
      },
    },
    ...(process.env['DSH_TELEMETRY_DISABLED'] ?? '') === ''
      ? []
      : [{ id: 'session-telemetry-otel', disabled: true }],
  ]
}

/**
 * 通过官方公开 boot API 启动完整 Web 组合。
 * @param options 已解析的部署与宿主生命周期配置。
 */
export async function bootAha(options: BootOptions): Promise<Context> {
  const patches = [
    ...loadOverlayPatches(NAME, BASE_PATCH),
    ...loadOverlayPatches(NAME, WEB_PATCH),
    ...deploymentPatches(options),
  ]

  return await boot(
    NAME,
    ROOT_CONFIG,
    patches,
    (ctx) => {
      ctx.provide(DSH_LAUNCH_ENVIRONMENT_KEY, options.environment)
      provideCmdline(ctx, { args: [], exit: options.requestExit })
    },
    pathToFileURL(DSH_PACKAGE).href,
  )
}
