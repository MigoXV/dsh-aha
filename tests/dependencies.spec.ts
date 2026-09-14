import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('official Harness release alignment', () => {
  it('locks every DSH package, including transitive peers, to the selected release', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      dependencies: Record<string, string>
    }
    const version = manifest.dependencies['@deepseek-ai/dsh']
    expect(version).toBe('0.1.5-rc.2')
    for (const relativePath of ['../package.json', '../packages/ui-champagne/package.json']) {
      const pkg = JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8')) as {
        dependencies: Record<string, string>
      }
      for (const [name, specifier] of Object.entries(pkg.dependencies)) {
        if (name.startsWith('@deepseek-ai/dsh')) expect(specifier, name).toBe(version)
      }
    }
    const lock = await readFile(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8')
    const releases = [...lock.matchAll(/^  '(@deepseek-ai\/dsh[^@']*)@([^'(:]+)'?:/gmu)]
    expect(releases.length).toBeGreaterThan(100)
    for (const [, name, release] of releases) expect(release, name).toBe(version)
  })
})
