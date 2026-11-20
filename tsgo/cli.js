#!/usr/bin/env node
// `tsgo <tsc args>`: TypeScript 7's native compiler, next to a root TypeScript 6 kept for typescript-eslint.
import { spawnSync } from 'node:child_process'
import { nativeTsc } from './resolve.js'

let exe
try {
  exe = nativeTsc()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
const result = spawnSync(exe, process.argv.slice(2), { stdio: 'inherit' })
if (result.error) {
  console.error(`tsgo: ${result.error.message}`)
  process.exit(1)
}
process.exit(result.status ?? 1)
