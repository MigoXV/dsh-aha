import { describe, expect, it, vi } from 'vitest'
import { Lifecycle } from '../src/lifecycle.js'

describe('Lifecycle', () => {
  it('releases once and preserves the first requested exit code', async () => {
    const dispose = vi.fn(async () => {})
    const lifecycle = new Lifecycle()
    lifecycle.attach({ fiber: { dispose } } as never)

    lifecycle.request(130)
    lifecycle.request(0)
    await Promise.all([lifecycle.release(), lifecycle.release()])

    expect(dispose).toHaveBeenCalledTimes(1)
    expect(process.exitCode).toBe(130)
    process.exitCode = undefined
  })

  it('releases a context attached after an early signal', async () => {
    const dispose = vi.fn(async () => {})
    const lifecycle = new Lifecycle()
    lifecycle.request(0)
    lifecycle.attach({ fiber: { dispose } } as never)
    await lifecycle.release()

    expect(dispose).toHaveBeenCalledTimes(1)
    expect(process.exitCode).toBe(0)
    process.exitCode = undefined
  })
})
