#!/usr/bin/env node
// `tsgo <tsc args>`: TypeScript 7's native compiler, next to a root TypeScript 6 kept for typescript-eslint.
import { pathToFileURL } from 'node:url'
import { nativeTsc } from './resolve.js'

let tsc
try {
  tsc = nativeTsc().tsc
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
await import(pathToFileURL(tsc).href)
