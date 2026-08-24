// SPDX-License-Identifier: MIT

/**
 * The parts of depdoctor that can be checked without running an install. The parity check
 * itself needs a real registry and a few seconds per run, so it is exercised by using it
 * rather than mocked here.
 */
import { describe, expect, it } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { matchesWatch, readInstalledTree, hashPackage, DEFAULT_WATCH } from '../depdoctor/parity.js'
import { parseSpec, purgePlan, renderPurge } from '../depdoctor/purge.js'

function scratch() {
  return mkdtempSync(path.join(tmpdir(), 'depdoctor-test-'))
}

function writePackage(dir, name, version, files = {}) {
  const target = path.join(dir, ...name.split('/'))
  mkdirSync(target, { recursive: true })
  writeFileSync(path.join(target, 'package.json'), JSON.stringify({ name, version }))
  for (const [file, content] of Object.entries(files)) writeFileSync(path.join(target, file), content)
  return target
}

describe('matchesWatch', () => {
  it('matches a scope wildcard', () => {
    expect(matchesWatch('@max-health-inc/config', ['@max-health-inc/*'])).toBe(true)
    expect(matchesWatch('@max-network/i18n', ['@max-health-inc/*'])).toBe(false)
  })

  it('matches an exact name', () => {
    expect(matchesWatch('brandc', ['brandc'])).toBe(true)
    expect(matchesWatch('brandcolors', ['brandc'])).toBe(false)
  })

  it('does not treat a scope prefix as a wildcard on its own', () => {
    expect(matchesWatch('@max-health-inc/config', ['@max-health-inc'])).toBe(false)
  })

  it('ships defaults covering the scopes we publish', () => {
    expect(matchesWatch('@babelfhir-ts/smart-auth', DEFAULT_WATCH)).toBe(true)
    expect(matchesWatch('react', DEFAULT_WATCH)).toBe(false)
  })
})

describe('parseSpec', () => {
  it('splits a scoped package from its version', () => {
    expect(parseSpec('@max-health-inc/config@3.3.0')).toEqual({ name: '@max-health-inc/config', version: '3.3.0' })
  })

  it('splits an unscoped package', () => {
    expect(parseSpec('brandc@0.2.2')).toEqual({ name: 'brandc', version: '0.2.2' })
  })

  it('tolerates a missing version', () => {
    expect(parseSpec('@max-health-inc/config')).toEqual({ name: '@max-health-inc/config', version: null })
    expect(parseSpec('brandc')).toEqual({ name: 'brandc', version: null })
  })
})

describe('readInstalledTree', () => {
  it('reads scoped and unscoped packages with their versions', () => {
    const root = scratch()
    const nm = path.join(root, 'node_modules')
    writePackage(nm, '@max-health-inc/config', '3.3.0')
    writePackage(nm, 'react', '19.2.8')
    const tree = readInstalledTree(root)
    expect(tree.get('@max-health-inc/config')?.version).toBe('3.3.0')
    expect(tree.get('react')?.version).toBe('19.2.8')
  })

  it('ignores bun bookkeeping directories', () => {
    const root = scratch()
    const nm = path.join(root, 'node_modules')
    writePackage(nm, 'react', '19.2.8')
    mkdirSync(path.join(nm, '.bin'), { recursive: true })
    mkdirSync(path.join(nm, '.bun'), { recursive: true })
    expect([...readInstalledTree(root).keys()]).toEqual(['react'])
  })

  it('returns nothing when there is no node_modules', () => {
    expect(readInstalledTree(scratch()).size).toBe(0)
  })
})

describe('hashPackage', () => {
  it('is stable for identical content', () => {
    const a = writePackage(scratch(), 'pkg', '1.0.0', { 'index.js': 'export const x = 1\n' })
    const b = writePackage(scratch(), 'pkg', '1.0.0', { 'index.js': 'export const x = 1\n' })
    expect(hashPackage(a)).toBe(hashPackage(b))
  })

  it('changes when a single byte changes — the case this whole tool exists for', () => {
    const clean = writePackage(scratch(), 'pkg', '1.0.0', { 'index.js': 'export const x = 1\n' })
    const edited = writePackage(scratch(), 'pkg', '1.0.0', { 'index.js': 'export const x = 1\n// edited\n' })
    expect(hashPackage(clean)).not.toBe(hashPackage(edited))
  })

  it('ignores nested node_modules so a hoisting difference is not read as tampering', () => {
    const dir = writePackage(scratch(), 'pkg', '1.0.0', { 'index.js': 'x\n' })
    const before = hashPackage(dir)
    writePackage(path.join(dir, 'node_modules'), 'dep', '1.0.0', { 'index.js': 'y\n' })
    expect(hashPackage(dir)).toBe(before)
  })
})

describe('purgePlan', () => {
  it('finds both the bare and the versioned cache entry', () => {
    const cache = scratch()
    mkdirSync(path.join(cache, '@max-health-inc', 'config'), { recursive: true })
    mkdirSync(path.join(cache, '@max-health-inc', 'config@3.3.0@@npm.pkg.github.com@@@1'), { recursive: true })
    process.env.BUN_INSTALL_CACHE_DIR = cache
    const plan = purgePlan('@max-health-inc/config@3.3.0')
    expect(plan.matches).toHaveLength(2)
    delete process.env.BUN_INSTALL_CACHE_DIR
  })

  it('leaves other versions alone when a version is named', () => {
    const cache = scratch()
    for (const dir of ['config@3.3.0@@npm.pkg.github.com@@@1', 'config@3.1.0@@npm.pkg.github.com@@@1']) {
      mkdirSync(path.join(cache, '@max-health-inc', dir), { recursive: true })
    }
    process.env.BUN_INSTALL_CACHE_DIR = cache
    const plan = purgePlan('@max-health-inc/config@3.3.0')
    expect(plan.matches.some((m) => m.includes('3.1.0'))).toBe(false)
    delete process.env.BUN_INSTALL_CACHE_DIR
  })

  it('does not confuse a package whose name prefixes another', () => {
    const cache = scratch()
    mkdirSync(path.join(cache, 'brandc@0.2.2@@@1'), { recursive: true })
    mkdirSync(path.join(cache, 'brandcolors@1.0.0@@@1'), { recursive: true })
    process.env.BUN_INSTALL_CACHE_DIR = cache
    const plan = purgePlan('brandc')
    expect(plan.matches.some((m) => m.includes('brandcolors'))).toBe(false)
    delete process.env.BUN_INSTALL_CACHE_DIR
  })

  it('reports an empty plan rather than failing when nothing is cached', () => {
    process.env.BUN_INSTALL_CACHE_DIR = scratch()
    const plan = purgePlan('@nope/absent@1.0.0')
    expect(plan.matches).toEqual([])
    expect(renderPurge(plan)).toContain('nothing cached')
    delete process.env.BUN_INSTALL_CACHE_DIR
  })
})

describe('renderPurge', () => {
  it('spells out both removals and says why the project copy is not enough', () => {
    const cache = scratch()
    mkdirSync(path.join(cache, '@max-health-inc', 'config'), { recursive: true })
    process.env.BUN_INSTALL_CACHE_DIR = cache
    const rendered = renderPurge(purgePlan('@max-health-inc/config'))
    expect(rendered).toContain('rm -rf')
    expect(rendered).toContain('bun install')
    expect(rendered).toContain('29372')
    delete process.env.BUN_INSTALL_CACHE_DIR
  })
})
