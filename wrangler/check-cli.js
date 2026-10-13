#!/usr/bin/env node
// `wrangler-check [--config <file>] <env>...`: dry-run deploy each environment ("" or "top" is the top level).
import { checkWrangler, envLabel, parseCheckArgs } from './check.js'

const { envs, config } = parseCheckArgs(process.argv.slice(2))
const results = checkWrangler({ envs, config })
for (const result of results) {
  console.log(`${result.ok ? '✓' : '✗'} wrangler ${envLabel(result.env)}`)
  if (result.problem) console.error(`${result.problem}\n`)
}
process.exit(results.every((result) => result.ok) ? 0 : 1)
