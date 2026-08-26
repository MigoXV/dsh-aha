import { describe, expect, it } from 'vitest'
import { DEFAULT_PORT, HELP, LISTEN_HOST, parseCli } from '../src/options.js'

describe('parseCli', () => {
  it('uses the fixed all-interfaces deployment defaults', () => {
    expect(LISTEN_HOST).toBe('0.0.0.0')
    expect(parseCli([])).toEqual({
      kind: 'run',
      options: { port: DEFAULT_PORT, trustedHosts: [] },
    })
  })

  it('accepts a port and repeated trusted authorities', () => {
    expect(parseCli([
      '--port', '4080',
      '--trusted-host', 'aha.internal',
      '--trusted-host', 'aha.internal:4080',
    ])).toEqual({
      kind: 'run',
      options: {
        port: 4080,
        trustedHosts: ['aha.internal', 'aha.internal:4080'],
      },
    })
  })

  it.each(['0', '65536', '3.5', 'abc'])('rejects invalid port %s', (port) => {
    expect(() => parseCli(['--port', port])).toThrow(/--port/u)
  })

  it('rejects an empty trusted authority', () => {
    expect(() => parseCli(['--trusted-host', ''])).toThrow(/不能为空/u)
  })

  it('supports terminal help and version actions', () => {
    expect(parseCli(['--help'])).toEqual({ kind: 'help' })
    expect(parseCli(['-v'])).toEqual({ kind: 'version' })
    expect(HELP).toContain('固定绑定 0.0.0.0')
  })

  it('rejects unknown options', () => {
    expect(() => parseCli(['--host', '127.0.0.1'])).toThrow()
  })
})
