import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { checkWrangler, configWarnings, parseCheckArgs, sourceConfig } from './check.js'

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

  it('checks every environment named, the top level included', () => {
    assert.deepEqual(parseCheckArgs(['top', 'beta']), { envs: ['', 'beta'], wranglerArgs: [] })
    assert.deepEqual(parseCheckArgs(['--config', 'w.toml', 'top', 'beta']), { envs: ['', 'beta'], config: 'w.toml', wranglerArgs: [] })
    assert.deepEqual(parseCheckArgs(['beta', '--config', 'w.toml']), { envs: ['beta'], config: 'w.toml', wranglerArgs: [] })
    assert.deepEqual(parseCheckArgs([]), { envs: [''], wranglerArgs: [] })
  })

  it('hands everything after -- to wrangler, so a Vite-built or container Worker can still be checked', () => {
    assert.deepEqual(parseCheckArgs(['top', 'beta', '--', '--no-bundle']), { envs: ['', 'beta'], wranglerArgs: ['--no-bundle'] })
    const seen = []
    checkWrangler({ envs: ['beta'], config: 'wrangler.jsonc', wranglerArgs: ['--containers-rollout=none'], run: (args) => { seen.push(args); return { status: 0, output: '' } } })
    assert.deepEqual(seen[0].slice(-5), ['--config', 'wrangler.jsonc', '--env', 'beta', '--containers-rollout=none'])
  })

  it("names the project's own config, so a Vite build redirect cannot stand in for it", () => {
    const present = new Set([join('/app', 'wrangler.jsonc'), join('/app', 'wrangler.toml')])
    assert.equal(sourceConfig('/app', (path) => present.has(path)), 'wrangler.jsonc')
    assert.equal(sourceConfig('/none', () => false), undefined)
  })
})
