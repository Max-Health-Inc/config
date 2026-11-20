#!/usr/bin/env node
// `run-parallel <script>...`: run package scripts at once, print each one whole as it finishes, fail if any failed.
import { formatResult, formatSummary, runParallel } from './run.js'

const scripts = process.argv.slice(2)
if (scripts.length === 0) {
  console.error('usage: run-parallel <script>...')
  process.exit(2)
}
const start = performance.now()
const results = await runParallel({ scripts, onDone: (result) => process.stdout.write(`${formatResult(result)}\n`) })
const ok = results.every((result) => result.ok)
const summary = formatSummary(results, performance.now() - start)
if (ok) console.log(summary)
else console.error(summary)
process.exit(ok ? 0 : 1)
