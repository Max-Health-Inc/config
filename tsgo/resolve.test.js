import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { nativeTsc, platformPackage } from './resolve.js'

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const PLATFORM_DIR = join('/app', 'node_modules', '@typescript', 'typescript-linux-x64')

describe('tsgo', () => {
  it('runs the native compiler this package installs for the current platform', () => {
    assert.match(execFileSync(nativeTsc(), ['-v'], { encoding: 'utf8' }), /^Version 7\./)
  })

  it('finds the executable in the platform package, with .exe on Windows', () => {
    const resolve = () => join(PLATFORM_DIR, 'package.json')
    assert.equal(nativeTsc({ resolve, exists: () => true, platform: 'linux', arch: 'x64' }), join(PLATFORM_DIR, 'lib', 'tsc'))
    assert.equal(nativeTsc({ resolve, exists: () => true, platform: 'win32', arch: 'x64' }), join(PLATFORM_DIR, 'lib', 'tsc.exe'))
  })

  it('names the missing platform package instead of falling back to another TypeScript', () => {
    const resolve = () => { throw new Error('MODULE_NOT_FOUND') }
    assert.throws(() => nativeTsc({ resolve, platform: 'plan9', arch: 'mips' }), /@typescript\/typescript-plan9-mips is not installed/)
  })

  it('depends on one TypeScript 7 range for every platform and on no typescript package', () => {
    const platforms = Object.entries(manifest.optionalDependencies)
    assert.ok(platforms.length > 0)
    assert.ok(platforms.every(([name]) => name.startsWith('@typescript/typescript-')))
    assert.equal(new Set(platforms.map(([, range]) => range)).size, 1)
    assert.match(platforms[0][1], /^\^7\./)
    assert.ok(manifest.optionalDependencies[platformPackage()])
    assert.equal(manifest.dependencies?.typescript, undefined)
  })
})
