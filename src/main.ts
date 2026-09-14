import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { installFailLoud, loadLayeredEnv } from '@deepseek-ai/dsh-app-boot'
import { resolveLanTrust } from '@deepseek-ai/dsh-web-app'
import type {} from '@deepseek-ai/dsh-client-connection'
import { bootAha } from './composition.js'
import { Lifecycle } from './lifecycle.js'
import { HELP, LISTEN_HOST, parseCli } from './options.js'

const NAME = 'dsh-aha'

async function packageVersion(): Promise<string> {
  const manifestPath = fileURLToPath(new URL('../package.json', import.meta.url))
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { version?: unknown }
  if (typeof manifest.version !== 'string') throw new Error('package.json 缺少有效 version')
  return manifest.version
}

/** 执行 dsh-aha CLI。 */
export async function main(args: readonly string[] = process.argv.slice(2)): Promise<void> {
  const action = parseCli(args)
  if (action.kind === 'help') {
    process.stdout.write(HELP)
    return
  }
  if (action.kind === 'version') {
    process.stdout.write(`${await packageVersion()}\n`)
    return
  }

  process.stderr.write(
    `${NAME}: Web 服务将绑定 0.0.0.0；请仅在可信局域网中运行，并使用下方带令牌的链接首次访问。\n`,
  )

  const lifecycle = new Lifecycle()
  const uninstallFailLoud = installFailLoud(NAME, process, async () => lifecycle.release())
  const onSigterm = (): void => { lifecycle.request(0) }
  const onSigint = (): void => { lifecycle.request(130) }
  process.on('SIGTERM', onSigterm)
  process.on('SIGINT', onSigint)

  try {
    const environment = loadLayeredEnv(NAME)
    const context = await bootAha({
      ...action.options,
      environment,
      requestExit: code => lifecycle.request(code),
    })
    lifecycle.attach(context)
    const port = context.get('webServer')?.port
    if (port === undefined) throw new Error('WebServer 启动后没有提供监听端口')
    const connection = context.get('connection')
    if (connection === undefined) throw new Error('浏览器认证服务尚未就绪')
    const localUrl = connection.authenticatedUrl(`http://127.0.0.1:${String(port)}`)
    const lanUrls = resolveLanTrust(LISTEN_HOST, []).lanAddresses
      .map(address => connection.authenticatedUrl(`http://${address}:${String(port)}`))
    const suffix = lanUrls.length === 0 ? '' : ` (LAN: ${lanUrls.join(', ')})`
    process.stdout.write(`${NAME}: ${localUrl}${suffix}\n`)
  } catch (error) {
    await lifecycle.release()
    throw error
  } finally {
    if (process.exitCode !== undefined) {
      uninstallFailLoud()
      process.off('SIGTERM', onSigterm)
      process.off('SIGINT', onSigint)
    }
  }
}
