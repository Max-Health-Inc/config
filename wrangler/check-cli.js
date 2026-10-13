#!/usr/bin/env node
// `wrangler-check [--config <file>] <env>...`: dry-run deploy each environment ("" or "top" is the top level).
import { checkWrangler, envLabel } from './check.js'

const args = process.argv.slice(2)
const configAt = args.indexOf('--config')
const config = configAt === -1 ? undefined : args[configAt + 1]
const envs = args.filter((_, i) => i !== configAt && i !== configAt + 1).map((env) => (env === 'top' ? '' : env))

const results = checkWrangler({ envs: envs.length > 0 ? envs : [''], config })
for (const result of results) {
  console.log(`${result.ok ? '✓' : '✗'} wrangler ${envLabel(result.env)}`)
  if (result.problem) console.error(`${result.problem}\n`)
}
process.exit(results.every((result) => result.ok) ? 0 : 1)
