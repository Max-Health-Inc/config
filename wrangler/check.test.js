import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { checkWrangler, configWarnings } from './check.js'

const MISPLACED = [
  ' ⛅️ wrangler 4.145.0',
  '\u001b[33m▲ \u001b[43;33m[\u001b[43;30mWARNING\u001b[43;33m]\u001b[0m \u001b[1mProcessing wrangler.toml configuration:\u001b[0m',
  '',
  '    - "env.beta" environment configuration',
  '      - Unexpected fields found in env.beta.analytics_engine_datasets[0] field: "MAXHEALTH_ISSUER"',
  '',
  '',
  'Total Upload: 812.40 KiB / gzip: 160.11 KiB',
].join('\n')

describe('wrangler-check', () => {
  it('finds the configuration warning wrangler deploys through', () => {
    const block = configWarnings(MISPLACED)
    assert.ok(block?.includes('Unexpected fields found in env.beta.analytics_engine_datasets[0]'))
    assert.ok(!block?.includes('Total Upload'))
  })

  it('passes a clean dry run', () => {
    assert.equal(configWarnings(' ⛅️ wrangler 4.145.0\nTotal Upload: 812.40 KiB\n--dry-run: exiting now.'), null)
  })

  it('fails each environment on a warning or a bundling error, and names it', () => {
    const outputs = { '': { status: 0, output: 'Total Upload: 1 KiB' }, beta: { status: 0, output: MISPLACED }, prod: { status: 1, output: 'X [ERROR] Could not resolve "@max-health-inc/types/company"' } }
    const results = checkWrangler({ envs: ['', 'beta', 'prod'], run: (args) => outputs[args.includes('--env') ? args[args.indexOf('--env') + 1] : ''] })
    assert.deepEqual(results.map((r) => [r.env, r.ok]), [['', true], ['beta', false], ['prod', false]])
    assert.match(results[2].problem ?? '', /Could not resolve/)
  })
})
