// SPDX-License-Identifier: MIT

/**
 * Dependency parity — does what is installed here match what a cold install would produce?
 *
 * bun hardlinks installed files out of `~/.bun/install/cache`, so a file written inside
 * `node_modules` rewrites the GLOBAL cache entry for every project on the machine. From
 * then on `bun install` restores the altered bytes, `--frozen-lockfile` restores them, and
 * deleting the package directory restores them again — the lockfile still matches, so
 * nothing reports a problem. The upstream cause is oven-sh/bun#29372: bun keys extracted
 * tarball content by path rather than by content hash.
 *
 * The check: install the same package.json + lockfile into a temp prefix with the cache
 * redirected somewhere empty, so nothing local can be reused, then compare that tree
 * against the real one.
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** Scopes whose packages are published by us, so most likely to be locally overwritten. */
const DEFAULT_WATCH = ['@max-health-inc/*', '@max-network/*', '@babelfhir-ts/*', '@maxhealth.tech/*']

const SKIP_ENTRIES = new Set(['.bin', '.cache', '.bun', '.modules.yaml'])

/** `@scope/name` or `name` → true when it matches a `pkg` or `@scope/*` pattern. */
export function matchesWatch(name, patterns) {
  return patterns.some((pattern) =>
    pattern.endsWith('/*') ? name.startsWith(pattern.slice(0, -1)) : pattern === name,
  )
}

/**
 * Every package in a node_modules tree, as name → { version, dir }.
 *
 * Resolves symlinks because the isolated linker makes top-level entries point into
 * `node_modules/.bun`, and the real files are what we want to hash.
 */
export function readInstalledTree(root) {
  const nodeModules = path.join(root, 'node_modules')
  const found = new Map()
  if (!fs.existsSync(nodeModules)) return found

  const entries = fs.readdirSync(nodeModules, { withFileTypes: true })
  for (const entry of entries) {
    if (SKIP_ENTRIES.has(entry.name)) continue
    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(nodeModules, entry.name)
      let scoped = []
      try { scoped = fs.readdirSync(scopeDir, { withFileTypes: true }) } catch { continue }
      for (const inner of scoped) record(found, `${entry.name}/${inner.name}`, path.join(scopeDir, inner.name))
    } else {
      record(found, entry.name, path.join(nodeModules, entry.name))
    }
  }
  return found
}

function record(found, name, dir) {
  try {
    const real = fs.realpathSync(dir)
    const manifest = JSON.parse(fs.readFileSync(path.join(real, 'package.json'), 'utf8'))
    found.set(name, { version: manifest.version ?? '(none)', dir: real })
  } catch {
    /* not a package (dangling link, stray file) — nothing to compare */
  }
}

/** SHA-256 over a package's file contents, path-ordered so it is stable across machines. */
export function hashPackage(dir) {
  const hash = createHash('sha256')
  const walk = (current, rel) => {
    let entries
    try { entries = fs.readdirSync(current, { withFileTypes: true }) } catch { return }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === 'node_modules') continue
      const full = path.join(current, entry.name)
      const relPath = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) { walk(full, relPath); continue }
      hash.update(relPath)
      try { hash.update(fs.readFileSync(full)) } catch { hash.update('<unreadable>') }
    }
  }
  walk(dir, '')
  return hash.digest('hex')
}

/**
 * Install the project's manifest + lockfile into a temp prefix with an empty cache.
 *
 * bunfig.toml comes along because it carries the scoped-registry auth; without it a
 * private package 404s here while resolving fine in the real tree, which would read as a
 * parity failure rather than the missing token it is. Local `file:` tarballs are copied
 * for the same reason.
 */
export function coldInstall(cwd, { onLog = () => {} } = {}) {
  const prefix = fs.mkdtempSync(path.join(os.tmpdir(), 'depdoctor-'))
  const cache = path.join(prefix, '.cold-cache')
  fs.mkdirSync(cache)

  for (const file of ['package.json', 'bun.lock', 'bun.lockb', 'bunfig.toml', '.npmrc']) {
    const from = path.join(cwd, file)
    if (fs.existsSync(from)) fs.copyFileSync(from, path.join(prefix, file))
  }
  copyLocalTarballs(cwd, prefix)

  onLog(`cold install in ${prefix}`)
  const result = spawnSync('bun', ['install', '--frozen-lockfile'], {
    cwd: prefix,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, BUN_INSTALL_CACHE_DIR: cache },
  })
  return { prefix, status: result.status, stderr: result.stderr ?? '', stdout: result.stdout ?? '' }
}

/** Vendored tarballs referenced as `file:`/`./lib/*.tgz` must exist in the temp prefix too. */
function copyLocalTarballs(cwd, prefix) {
  let manifest
  try { manifest = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')) } catch { return }
  const deps = { ...manifest.dependencies, ...manifest.devDependencies }
  for (const spec of Object.values(deps ?? {})) {
    if (typeof spec !== 'string') continue
    const local = spec.replace(/^file:/, '')
    if (!/^\.{0,2}\//.test(local) && !local.endsWith('.tgz')) continue
    const from = path.join(cwd, local)
    if (!fs.existsSync(from)) continue
    const to = path.join(prefix, local)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
  }
}

/**
 * Compare the working tree against a cold install.
 *
 * Versions are compared for every package because that is cheap and catches a lockfile
 * that resolved differently. Contents are hashed only for watched packages: hashing every
 * dependency costs far more than it finds, and the packages that get overwritten in place
 * are the ones being developed alongside the app.
 */
export function checkDependencyParity(cwd, { watch = DEFAULT_WATCH, onLog = () => {} } = {}) {
  const local = readInstalledTree(cwd)
  if (local.size === 0) {
    return { ok: false, reason: 'no node_modules — run `bun install` first', versions: [], contents: [], missing: [], extra: [] }
  }

  const cold = coldInstall(cwd, { onLog })
  if (cold.status !== 0) {
    return {
      ok: false,
      reason: `cold install failed (exit ${cold.status}). This is itself a finding: CI installs the same way.\n${cold.stderr.trim().slice(0, 1200)}`,
      versions: [], contents: [], missing: [], extra: [], prefix: cold.prefix,
    }
  }

  const reference = readInstalledTree(cold.prefix)
  const versions = []
  const contents = []
  const missing = []
  const extra = []

  for (const [name, ref] of reference) {
    const mine = local.get(name)
    if (!mine) { missing.push({ name, version: ref.version }); continue }
    if (mine.version !== ref.version) versions.push({ name, local: mine.version, cold: ref.version })
    if (!matchesWatch(name, watch)) continue
    const mineHash = hashPackage(mine.dir)
    const refHash = hashPackage(ref.dir)
    if (mineHash !== refHash) contents.push({ name, version: mine.version, local: mineHash, cold: refHash })
  }
  for (const name of local.keys()) if (!reference.has(name)) extra.push({ name })

  return {
    ok: versions.length === 0 && contents.length === 0 && missing.length === 0,
    versions, contents, missing, extra,
    prefix: cold.prefix,
    checked: reference.size,
    hashed: [...reference.keys()].filter((n) => matchesWatch(n, watch)).length,
  }
}

export { DEFAULT_WATCH }
