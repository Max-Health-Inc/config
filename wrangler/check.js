import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ANSI = /\u001b\[[0-9;]*m/g

/** Wrangler's own lookup order for a project's config file. */
const CONFIG_FILES = ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml']

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

/**
 * The project's own wrangler config in `cwd`, named explicitly so a build redirect
 * (`.wrangler/deploy/config.json`, written by @cloudflare/vite-plugin) cannot stand in for it:
 * that redirect points at the flattened build output, where `--env` is ignored.
 * @param {string} cwd
 * @param {(path: string) => boolean} [exists]
 * @returns {string | undefined}
 */
export function sourceConfig(cwd, exists = existsSync) {
  return CONFIG_FILES.find((file) => exists(join(cwd, file)))
}

/** @param {string} env */
function label(env) {
  return env ? `--env ${env}` : 'top-level'
}

/**
 * `wrangler deploy --dry-run` for each environment: bundles the Worker the way a deploy would and
 * fails on a bundling error or any configuration warning. `""` is the top-level config.
 * `wranglerArgs` go to wrangler as given, e.g. `--no-bundle` for a Worker only Vite can bundle.
 * @param {{ envs: string[], config?: string, wranglerArgs?: string[], cwd?: string, run?: (args: string[]) => { status: number | null, output: string } }} options
 * @returns {{ env: string, ok: boolean, problem?: string }[]}
 */
export function checkWrangler({ envs, config, wranglerArgs = [], cwd = process.cwd(), run }) {
  const exec = run ?? ((args) => {
    const result = spawnSync('npx', ['--no-install', 'wrangler', ...args], { cwd, encoding: 'utf8', shell: process.platform === 'win32' })
    return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` }
  })
  const file = config ?? sourceConfig(cwd)
  return envs.map((env) => {
    const outdir = mkdtempSync(join(tmpdir(), 'wrangler-check-'))
    try {
      const args = ['deploy', '--dry-run', '--outdir', outdir, ...(file ? ['--config', file] : []), ...(env ? ['--env', env] : []), ...wranglerArgs]
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
 * `[--config <file>] <env>... [-- <wrangler args>]` into the environments to check; `top` or `""`
 * is the top level, no environment means the top level alone, and everything after `--` goes to
 * wrangler unchanged.
 * @param {string[]} args
 * @returns {{ envs: string[], config?: string, wranglerArgs: string[] }}
 */
export function parseCheckArgs(args) {
  const split = args.indexOf('--')
  const own = split === -1 ? args : args.slice(0, split)
  const wranglerArgs = split === -1 ? [] : args.slice(split + 1)
  const configAt = own.indexOf('--config')
  const config = configAt === -1 ? undefined : own[configAt + 1]
  const rest = configAt === -1 ? own : [...own.slice(0, configAt), ...own.slice(configAt + 2)]
  const envs = rest.map((env) => (env === 'top' ? '' : env))
  return { envs: envs.length > 0 ? envs : [''], ...(config ? { config } : {}), wranglerArgs }
}

export { label as envLabel }
