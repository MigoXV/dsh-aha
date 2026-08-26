import { describe, expect, it, vi } from 'vitest'
import { deploymentPatches } from '../src/composition.js'

describe('deploymentPatches', () => {
  it('owns startup and binds the official WebServer directly to all interfaces', () => {
    const patches = deploymentPatches({
      port: 4080,
      trustedHosts: ['aha.internal'],
    })

    expect(patches).toEqual(expect.arrayContaining([
      { id: 'web-startup', disabled: true },
      {
        id: 'webserver',
        inject: [],
        config: { host: '0.0.0.0', port: 4080 },
      },
      {
        id: 'web-runtime',
        inject: [],
        config: {
          openBrowser: false,
          printUrl: false,
          surfaceContext: true,
          trustedHosts: ['aha.internal'],
        },
      },
    ]))
  })

  it('honors the official telemetry hard-disable environment switch', () => {
    vi.stubEnv('DSH_TELEMETRY_DISABLED', '1')
    expect(deploymentPatches({ port: 3080, trustedHosts: [] }))
      .toContainEqual({ id: 'session-telemetry-otel', disabled: true })
    vi.unstubAllEnvs()
  })
})
