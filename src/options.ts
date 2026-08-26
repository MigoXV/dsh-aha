import { parseArgs } from 'node:util'

/** dsh-aha 的固定监听地址。 */
export const LISTEN_HOST = '0.0.0.0' as const

/** 默认 Web 端口。 */
export const DEFAULT_PORT = 3080

/** 启动器解析后的只读配置。 */
export interface CliOptions {
  port: number
  trustedHosts: string[]
}

export type CliAction =
  | { kind: 'run'; options: CliOptions }
  | { kind: 'help' }
  | { kind: 'version' }

/** 用户可见的命令行帮助。 */
export const HELP = `用法：dsh-aha [选项]

基于官方 DeepSeek Harness 发布包启动 Web 应用。

选项：
  --port <端口>                  监听端口，默认 3080
  --trusted-host <authority>     允许访问 API 的额外 host[:port]，可重复
  -h, --help                     显示帮助
  -v, --version                  显示版本

服务固定绑定 0.0.0.0，并且不会自动打开浏览器。
`

/**
 * 解析 dsh-aha 自有参数；非法输入在任何端口绑定前失败。
 * @param args 去掉 node 与脚本路径后的参数。
 */
export function parseCli(args: readonly string[]): CliAction {
  const parsed = parseArgs({
    args: [...args],
    allowPositionals: false,
    strict: true,
    options: {
      port: { type: 'string' },
      'trusted-host': { type: 'string', multiple: true },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  })

  if (parsed.values.help === true) return { kind: 'help' }
  if (parsed.values.version === true) return { kind: 'version' }

  const rawPort = parsed.values.port ?? String(DEFAULT_PORT)
  if (!/^\d+$/u.test(rawPort)) throw new Error(`--port 必须是整数，收到 ${JSON.stringify(rawPort)}`)
  const port = Number(rawPort)
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`--port 必须位于 1..65535，收到 ${JSON.stringify(rawPort)}`)
  }

  const trustedHosts = parsed.values['trusted-host'] ?? []
  if (trustedHosts.some(value => value.trim() === '')) {
    throw new Error('--trusted-host 不能为空')
  }

  return { kind: 'run', options: { port, trustedHosts: [...trustedHosts] } }
}
