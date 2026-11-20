import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { formatResult, formatSummary, runParallel, runScript, scriptRunner } from './run.js'

describe('run-parallel', () => {
  it('starts every script before any finishes and reports each as it completes', async () => {
    const started = []
    const finish = new Map()
    const done = []
    const pending = runParallel({
      scripts: ['typecheck', 'lint', 'test'],
      run: (script) => { started.push(script); return new Promise((resolve) => finish.set(script, resolve)) },
      onDone: (result) => done.push(result.script),
    })
    assert.deepEqual(started, ['typecheck', 'lint', 'test'])
    finish.get('lint')({ status: 0, output: 'clean' })
    finish.get('test')({ status: 1, output: 'FAIL a.test.ts' })
    finish.get('typecheck')({ status: 0, output: '' })
    const results = await pending
    assert.deepEqual(done, ['lint', 'test', 'typecheck'])
    assert.deepEqual(results.map((r) => [r.script, r.ok]), [['typecheck', true], ['lint', true], ['test', false]])
  })

  it('counts a script that could not start as failed', async () => {
    const [result] = await runParallel({ scripts: ['gone'], run: async () => ({ status: null, output: 'spawn ENOENT' }) })
    assert.equal(result.ok, false)
  })

  it('fans out with the package manager that started it', () => {
    assert.equal(scriptRunner({ npm_config_user_agent: 'bun/1.4.3 npm/? node/v24' }), 'bun')
    assert.equal(scriptRunner({ npm_config_user_agent: 'npm/11.6.0 node/v26.0.0 win32 x64' }), 'npm')
    assert.equal(scriptRunner({}), 'npm')
  })

  it('prints a block per script and a summary that names the failures', () => {
    assert.equal(formatResult({ script: 'lint', ok: true, output: 'clean\n\n', ms: 3100 }), '✓ lint (3.1s)\nclean\n')
    const summary = formatSummary([{ script: 'lint', ok: true, output: '', ms: 3100 }, { script: 'test', ok: false, output: '', ms: 40000 }], 40200)
    assert.equal(summary, '1 of 2 failed in 40.2s\n  ✓ lint  3.1s\n  ✗ test  40.0s')
  })

  it('captures stdout and stderr together with the exit status', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'run-parallel-'))
    try {
      writeFileSync(join(dir, 'run'), "console.log('out ' + process.argv[2]); console.error('err'); process.exit(3)\n")
      const { status, output } = await runScript('lint', { runner: 'node', cwd: dir, color: false })
      assert.equal(status, 3)
      assert.match(output, /out lint/)
      assert.match(output, /err/)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
