import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ANSI = /\u001b\[[0-9;]*m/g

/**
 * The configuration warning block wrangler prints, or null. Wrangler reports a misplaced key
 * ("Unexpected fields found in …") or a var missing from an environment as a warning and deploys
 * anyway, so the build has to read the output to fail on it.
 * @param {string} output
 * @returns {string | null}
 */
export function configWarnings(output) {
  const text = output.replace(ANSI, '')
  const start = text.search(/WARNING\]\s*Processing .+ configuration:/)
  if (start === -1) return null
  const rest = text.slice(start)
  const end = rest.search(/\n\s*\n(?=\S)(?!\s*-)/)
  return (end === -1 ? rest : rest.slice(0, end)).trim()
}

/** @param {string} env */
function label(env) {
  return env ? `--env ${env}` : 'top-level'
}

/**
 * `wrangler deploy --dry-run` for each environment: bundles the Worker the way a deploy would and
 * fails on a bundling error or any configuration warning. `""` is the top-level config.
 * @param {{ envs: string[], config?: string, cwd?: string, run?: (args: string[]) => { status: number | null, output: string } }} options
 * @returns {{ env: string, ok: boolean, problem?: string }[]}
 */
export function checkWrangler({ envs, config, cwd = process.cwd(), run }) {
  const exec = run ?? ((args) => {
    const result = spawnSync('npx', ['--no-install', 'wrangler', ...args], { cwd, encoding: 'utf8', shell: process.platform === 'win32' })
    return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` }
  })
  return envs.map((env) => {
    const outdir = mkdtempSync(join(tmpdir(), 'wrangler-check-'))
    try {
      const args = ['deploy', '--dry-run', '--outdir', outdir, ...(config ? ['--config', config] : []), ...(env ? ['--env', env] : [])]
      const { status, output } = exec(args)
      const warnings = configWarnings(output)
      if (warnings) return { env, ok: false, problem: warnings }
      if (status !== 0) return { env, ok: false, problem: output.replace(ANSI, '').trim().split('\n').slice(-20).join('\n') }
      return { env, ok: true }
    } finally {
      rmSync(outdir, { recursive: true, force: true })
    }
  })
}

/**
 * `[--config <file>] <env>...` into the environments to check; `top` or `""` is the top level,
 * and no environment at all means the top level alone.
 * @param {string[]} args
 * @returns {{ envs: string[], config?: string }}
 */
export function parseCheckArgs(args) {
  const configAt = args.indexOf('--config')
  const config = configAt === -1 ? undefined : args[configAt + 1]
  const rest = configAt === -1 ? args : [...args.slice(0, configAt), ...args.slice(configAt + 2)]
  const envs = rest.map((env) => (env === 'top' ? '' : env))
  return { envs: envs.length > 0 ? envs : [''], ...(config ? { config } : {}) }
}

export { label as envLabel }
