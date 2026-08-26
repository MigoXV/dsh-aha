#!/usr/bin/env node

import { main } from './main.js'

void main().catch((error: unknown) => {
  process.stderr.write(`dsh-aha: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`)
  process.exitCode = 1
})
