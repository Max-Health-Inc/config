// SPDX-License-Identifier: MIT

/**
 * Shared discovery and configuration for the doccheck commands.
 *
 * The repo root is the consumer's cwd, never this package's location: these
 * files run from inside node_modules.
 */

import fs from 'node:fs'
import path from 'node:path'

export const ROOT = process.cwd()

/** Generated, vendored or published trees. Matched per path SEGMENT, so nested copies are caught. */
const DEFAULT_SKIP_SEGMENTS = [
  'node_modules', 'dist', 'build', 'coverage', '.git', '.doccheck', '.next', 'out', 'vendor',
]

const DEFAULTS = {
  /** Directory the doc examples are compiled from. Must be where their imports resolve. */
  workspace: '.',
  skipSegments: DEFAULT_SKIP_SEGMENTS,
  /** Repo-relative path prefixes to ignore, for trees a segment name cannot describe. */
  skipPrefixes: [],
  /** Minimum API-docs coverage percentage. null disables the gate. */
  minCoverage: null,
}

/**
 * Read the `doccheck` key from the consumer's package.json and fill in defaults.
 * Config lives there rather than in a dotfile so a repo declares its tooling in
 * one place, the same way it declares its eslint and tsconfig presets.
 */
export function loadConfig(root = ROOT) {
  let pkg = {}
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  } catch {
    throw new Error(`doccheck: no readable package.json in ${root}. Run it from the repo root.`)
  }
  const user = pkg.doccheck ?? {}
  return {
    ...DEFAULTS,
    ...user,
    skipSegments: new Set([...DEFAULT_SKIP_SEGMENTS, ...(user.skipSegments ?? [])]),
    skipPrefixes: (user.skipPrefixes ?? []).map((p) => p.split('/').join(path.sep)),
    pkg,
  }
}

/** Every markdown file the repo owns, as repo-relative POSIX paths. */
export function markdownFiles(config, dir = ROOT, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (config.skipSegments.has(entry.name)) continue
    const abs = path.join(dir, entry.name)
    const rel = path.relative(ROOT, abs)
    if (config.skipPrefixes.some((s) => rel === s || rel.startsWith(`${s}${path.sep}`))) continue
    if (entry.isDirectory()) markdownFiles(config, abs, found)
    else if (entry.name.toLowerCase().endsWith('.md')) found.push(rel.split(path.sep).join('/'))
  }
  return found
}

/** 1-based line number of a character offset. */
export function lineOf(source, index) {
  return source.slice(0, index).split(/\r?\n/).length
}

/** The consumer's own tsc, since the compile must match what the repo builds with. */
export function tscBin(root = ROOT) {
  const name = process.platform === 'win32' ? 'tsc.exe' : 'tsc'
  const local = path.join(root, 'node_modules', '.bin', name)
  if (fs.existsSync(local)) return local
  throw new Error('doccheck: no typescript in node_modules/.bin. Add typescript as a devDependency.')
}
