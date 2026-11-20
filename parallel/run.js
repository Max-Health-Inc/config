import { spawn } from 'node:child_process'

/**
 * @typedef {{ status: number | null, output: string }} ScriptOutcome
 * @typedef {{ script: string, ok: boolean, output: string, ms: number }} ScriptResult
 */

/**
 * The package manager that started this process, so `bun run check` fans out with bun and
 * `npm run check` with npm.
 * @param {Record<string, string | undefined>} [env]
 * @returns {'bun' | 'npm'}
 */
export function scriptRunner(env = process.env) {
  return (env.npm_config_user_agent ?? '').startsWith('bun/') ? 'bun' : 'npm'
}

/**
 * `<runner> run <script>` with stdout and stderr captured together. Colour stays on when the
 * terminal running the parent has it, since the child only sees a pipe.
 * @param {string} script
 * @param {{ runner?: string, cwd?: string, color?: boolean }} [options]
 * @returns {Promise<ScriptOutcome>}
 */
export function runScript(script, { runner = scriptRunner(), cwd = process.cwd(), color = Boolean(process.stdout.isTTY) } = {}) {
  return new Promise((resolve) => {
    const env = color && !process.env.NO_COLOR ? { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? '1' } : process.env
    const child = spawn(runner, ['run', script], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })
    let output = ''
    child.stdout.setEncoding('utf8').on('data', (chunk) => { output += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk) => { output += chunk })
    child.on('error', (error) => resolve({ status: null, output: `${output}${error.message}\n` }))
    child.on('close', (status) => resolve({ status, output }))
  })
}

/**
 * Runs every script at once. Each one's output is buffered and handed to `onDone` as a whole when
 * it finishes, so parallel steps never interleave; the results come back in the order named.
 * @param {{ scripts: string[], run?: (script: string) => Promise<ScriptOutcome>, onDone?: (result: ScriptResult) => void, now?: () => number }} options
 * @returns {Promise<ScriptResult[]>}
 */
export function runParallel({ scripts, run = (script) => runScript(script), onDone = () => {}, now = () => performance.now() }) {
  return Promise.all(scripts.map(async (script) => {
    const start = now()
    const { status, output } = await run(script)
    const result = { script, ok: status === 0, output, ms: now() - start }
    onDone(result)
    return result
  }))
}

/**
 * One finished script as a block: a header naming it, its status and time, then its output.
 * @param {ScriptResult} result
 * @returns {string}
 */
export function formatResult({ script, ok, output, ms }) {
  const body = output.trimEnd()
  return `${ok ? '✓' : '✗'} ${script} (${seconds(ms)})${body ? `\n${body}` : ''}\n`
}

/**
 * The closing summary: every script with its status and time, in the order named.
 * @param {ScriptResult[]} results
 * @param {number} totalMs
 * @returns {string}
 */
export function formatSummary(results, totalMs) {
  const width = Math.max(...results.map((result) => result.script.length))
  const lines = results.map((result) => `  ${result.ok ? '✓' : '✗'} ${result.script.padEnd(width)}  ${seconds(result.ms)}`)
  const failed = results.filter((result) => !result.ok).length
  return [`${failed ? `${failed} of ${results.length} failed` : `all ${results.length} passed`} in ${seconds(totalMs)}`, ...lines].join('\n')
}

/** @param {number} ms */
function seconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`
}
