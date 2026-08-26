import type { Context } from '@deepseek-ai/cordis'

/** 处理启动期间信号与 Cordis 根上下文的一次性释放。 */
export class Lifecycle {
  private context: Context | undefined
  private requestedCode: number | undefined
  private releasePromise: Promise<void> | undefined

  /** 将启动完成的上下文交给生命周期；若启动期间已请求退出则立即释放。 */
  attach(context: Context): void {
    this.context = context
    if (this.requestedCode !== undefined) void this.release()
  }

  /** 请求退出；第一次请求的退出码具有优先级。 */
  request(code: number): void {
    this.requestedCode ??= code
    if (this.context !== undefined) void this.release()
  }

  /** 释放插件树并设置进程退出码；重复调用共享同一个 Promise。 */
  release(): Promise<void> {
    this.releasePromise ??= (async () => {
      await this.context?.fiber.dispose()
      if (this.requestedCode !== undefined) process.exitCode = this.requestedCode
    })()
    return this.releasePromise
  }
}
