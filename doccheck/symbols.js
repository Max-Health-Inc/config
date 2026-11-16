// SPDX-License-Identifier: MIT

/**
 * Exported symbol names of a TypeScript entry file, read from source without a
 * compiler. Shared by `coverage` (what the docs should name) and `examples`
 * (what an example may use without importing it).
 */

import fs from 'node:fs'
import path from 'node:path'

const DECL = [
  /\bexport\s+(?:declare\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
  /\bexport\s+(?:declare\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g,
  /\bexport\s+(?:declare\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
  /\bexport\s+(?:declare\s+)?(?:type|interface|enum)\s+([A-Za-z_$][\w$]*)/g,
]
const EXPORT_CLAUSE = /\bexport\s*(?:type\s*)?\{([^}]*)\}(?:\s*from\s*['"]([^'"]+)['"])?/g
const EXPORT_STAR = /\bexport\s*\*\s*(?:as\s+[A-Za-z_$][\w$]*\s*)?from\s*['"]([^'"]+)['"]/g

/**
 * Resolve a relative import the way the bundler would. ESM sources name the
 * emitted `.js` file, so `./x.js` also tries `./x.ts` and `./x.tsx`.
 */
export function resolveRel(fromFile, spec) {
  if (!spec.startsWith('.')) return null
  const base = path.resolve(path.dirname(fromFile), spec)
  const stem = base.replace(/\.(?:m|c)?js$/, '')
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${stem}.ts`,
    `${stem}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }
  return null
}

/** Public symbol names reachable from an entry file, following `export * from` within the package. */
export function exportsOf(entry, seen = new Set()) {
  const abs = path.resolve(entry)
  if (seen.has(abs) || !fs.existsSync(abs)) return new Set()
  seen.add(abs)

  const src = fs.readFileSync(abs, 'utf8')
  const names = new Set()

  for (const re of DECL) {
    for (const m of src.matchAll(re)) names.add(m[1])
  }
  for (const m of src.matchAll(EXPORT_CLAUSE)) {
    for (const raw of (m[1] ?? '').split(',')) {
      const name = raw.replace(/\btype\b/, '').trim().split(/\s+as\s+/).pop()?.trim()
      if (name && /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default') names.add(name)
    }
  }
  for (const m of src.matchAll(EXPORT_STAR)) {
    const next = resolveRel(abs, m[1])
    if (next) for (const n of exportsOf(next, seen)) names.add(n)
  }
  return names
}
