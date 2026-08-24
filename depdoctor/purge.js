// SPDX-License-Identifier: MIT

/**
 * Where bun keeps a package, and how to actually remove it.
 *
 * The layout is not guessable, which is why clearing the cache by hand usually clears the
 * wrong thing and the next install restores the bad copy:
 *
 *   @scope/name@1.2.3@@npm.pkg.github.com@@@1   private, GitHub Packages
 *   @scope/name@1.2.3@@@1                       npmjs (registry segment is empty)
 *   @scope/name                                 bare directory alongside the versioned one
 *
 * Both the versioned directory AND the bare one have to go: leaving either behind is how
 * `rm -rf node_modules/<pkg> && bun install` comes back with the same bytes.
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/** bun's cache root, honouring the same override the parity check installs with. */
export function cacheRoot() {
  return process.env.BUN_INSTALL_CACHE_DIR || path.join(os.homedir(), '.bun', 'install', 'cache')
}

/** Split `@scope/name@1.2.3` into its name and version, tolerating a missing version. */
export function parseSpec(spec) {
  const at = spec.lastIndexOf('@')
  if (at > 0) return { name: spec.slice(0, at), version: spec.slice(at + 1) }
  return { name: spec, version: null }
}

/** Directories in the cache that hold this package, whether or not a version was given. */
export function purgePlan(spec) {
  const { name, version } = parseSpec(spec)
  const root = cacheRoot()
  const parent = name.startsWith('@') ? path.join(root, name.split('/')[0]) : root
  const leaf = name.startsWith('@') ? name.split('/')[1] : name

  let entries = []
  try {
    entries = fs.readdirSync(parent, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((entryName) => entryName === leaf || entryName.startsWith(`${leaf}@`))
      .filter((entryName) => !version || entryName === leaf || entryName.startsWith(`${leaf}@${version}@`))
      .map((entryName) => path.join(parent, entryName))
  } catch {
    /* nothing cached under that scope */
  }

  return { name, version, root, matches: entries }
}

export function renderPurge(plan) {
  if (plan.matches.length === 0) {
    return `  nothing cached for ${plan.name}${plan.version ? `@${plan.version}` : ''} under ${plan.root}`
  }
  const lines = [
    `  ${plan.name}${plan.version ? `@${plan.version}` : ''} occupies ${plan.matches.length} cache ${plan.matches.length === 1 ? 'entry' : 'entries'}:`,
    ...plan.matches.map((dir) => `    ${dir}`),
    '',
    '  Remove them, then reinstall:',
    ...plan.matches.map((dir) => `    rm -rf "${dir}"`),
    '    bun install',
    '',
    '  Removing only the project copy is not enough — node_modules is hardlinked into',
    '  this cache, so `bun install` links the same bytes straight back (oven-sh/bun#29372).',
  ]
  return lines.join('\n')
}
