import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { NATIVE_MAJOR, nativeTsc } from './resolve.js'

/** @param {Record<string, string>} versions installed package name to version */
function fakeLoad(versions) {
  const manifests = new Map(Object.entries(versions).map(([name, version]) => [join('/app', 'node_modules', name, 'package.json'), version]))
  const load = (manifest) => ({ version: manifests.get(manifest) ?? '' })
  return Object.assign(load, {
    resolve: (specifier) => {
      const manifest = join('/app', 'node_modules', specifier)
      if (!manifests.has(manifest)) throw new Error(`Cannot find module '${specifier}'`)
      return manifest
    },
  })
}

describe('tsgo', () => {
  it('resolves a native compiler from this package', () => {
    const { tsc, version } = nativeTsc()
    assert.ok(Number.parseInt(version, 10) >= NATIVE_MAJOR)
    assert.ok(existsSync(tsc))
  })

  it("takes the package's own typescript when it is 7 or newer", () => {
    assert.deepEqual(nativeTsc(fakeLoad({ typescript: '7.0.2' })), { tsc: join('/app', 'node_modules', 'typescript', 'lib', 'tsc.js'), version: '7.0.2' })
  })

  it('falls back to the @typescript/native alias when typescript resolves to 6', () => {
    assert.equal(nativeTsc(fakeLoad({ typescript: '6.0.3', '@typescript/native': '7.1.0' })).version, '7.1.0')
  })

  it("refuses a pre-native TypeScript, so a consumer's TypeScript 6 never stands in", () => {
    assert.throws(() => nativeTsc(fakeLoad({ typescript: '6.0.3' })), /found typescript@6\.0\.3/)
    assert.throws(() => nativeTsc(fakeLoad({})), /no TypeScript 7 or newer found\./)
  })
})
