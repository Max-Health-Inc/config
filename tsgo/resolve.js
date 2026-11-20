import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

/** First TypeScript major that ships the native (Go) compiler. */
export const NATIVE_MAJOR = 7

/**
 * Where TypeScript 7 may be installed, in order: this package's own `typescript` dependency, then
 * the `@typescript/native` alias TypeScript's release notes suggest for running 7 beside 6.
 */
export const CANDIDATES = ['typescript', '@typescript/native']

/**
 * The `lib/tsc.js` of the first TypeScript 7 or newer among {@link CANDIDATES}. Resolution starts
 * next to this file, so the TypeScript 7 nested under the package wins over a consumer's root
 * TypeScript 6; when none qualifies it throws instead of typechecking with the JS compiler.
 * @param {{ resolve: (specifier: string) => string } & ((id: string) => { version: string })} [load]
 * @returns {{ tsc: string, version: string }}
 */
export function nativeTsc(load = createRequire(import.meta.url)) {
  const found = []
  for (const name of CANDIDATES) {
    let manifest
    try {
      manifest = load.resolve(`${name}/package.json`)
    } catch {
      continue
    }
    const { version } = load(manifest)
    if (Number.parseInt(version, 10) >= NATIVE_MAJOR) return { tsc: join(dirname(manifest), 'lib', 'tsc.js'), version }
    found.push(`${name}@${version}`)
  }
  throw new Error(`tsgo: no TypeScript ${NATIVE_MAJOR} or newer found${found.length ? ` (found ${found.join(', ')})` : ''}. Reinstall @max-health-inc/config so its own typescript is installed.`)
}
