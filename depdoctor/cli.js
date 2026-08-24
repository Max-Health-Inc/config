#!/usr/bin/env node
// SPDX-License-Identifier: MIT

/**
 * depdoctor — is this machine's node_modules what a cold install would produce?
 *
 *   depdoctor parity    install into a temp prefix with an empty cache and diff the trees
 *   depdoctor purge     print (or run) the cache purge for a package
 *
 * "Works locally" carries no signal about a cold install: the local machine holds cache
 * entries, lockfile pins and ambient tokens that CI does not. This is the check that was
 * missing.
 */

import fs from 'node:fs'
import path from 'node:path'
import { checkDependencyParity, DEFAULT_WATCH } from './parity.js'
import { purgePlan, renderPurge } from './purge.js'

const USAGE = `depdoctor <command> [options]

Commands:
  parity   [--json] [--quiet]     compare node_modules against a cold install
  purge    <package[@version]>    how to remove a package from bun's global cache

Config (package.json "depdoctor"):
  watch    package names or "@scope/*" patterns whose CONTENTS are hashed
           (default: ${DEFAULT_WATCH.join(', ')})

Exit codes: 0 parity, 1 divergence or a failed cold install.`

function loadWatch(cwd) {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'))
    const watch = manifest.depdoctor?.watch
    return Array.isArray(watch) && watch.length > 0 ? watch : DEFAULT_WATCH
  } catch {
    return DEFAULT_WATCH
  }
}

function runParity(args) {
  const cwd = process.cwd()
  const json = args.includes('--json')
  const quiet = args.includes('--quiet') || json
  const log = (message) => { if (!quiet) console.info(`  ${message}`) }

  if (!quiet) console.info('depdoctor parity — installing a reference tree with an empty cache...')
  const result = checkDependencyParity(cwd, { watch: loadWatch(cwd), onLog: log })

  if (json) {
    console.log(JSON.stringify(result, null, 2))
    return result.ok ? 0 : 1
  }

  if (result.reason) {
    console.error(`\n  FAIL  ${result.reason}`)
    return 1
  }

  const { versions, contents, missing, extra } = result
  console.info(`  compared ${result.checked} packages, hashed ${result.hashed}\n`)

  for (const item of contents) {
    console.error(`  CONTENT  ${item.name}@${item.version} differs from a cold install`)
    console.error(`           local ${item.local.slice(0, 16)}  cold ${item.cold.slice(0, 16)}`)
    console.error(`           purge it:  depdoctor purge ${item.name}@${item.version}`)
  }
  for (const item of versions) {
    console.error(`  VERSION  ${item.name}: local ${item.local}, cold install resolves ${item.cold}`)
  }
  for (const item of missing) {
    console.error(`  MISSING  ${item.name}@${item.version} is absent locally`)
  }
  for (const item of extra) {
    console.info(`  extra    ${item.name} is installed locally but not by a cold install`)
  }

  if (result.ok) {
    console.info('  OK  node_modules matches a cold install.')
    return 0
  }
  console.error(`
  A local install that disagrees with a cold one is how "works on my machine" starts.
  Contents differing usually means something wrote into node_modules: under bun those
  files are hardlinks into the global cache, so the edit escaped this project and
  reinstalling restores it (oven-sh/bun#29372).`)
  return 1
}

function runPurge(args) {
  const target = args.find((arg) => !arg.startsWith('-'))
  if (!target) {
    console.error('depdoctor purge <package[@version]>')
    return 1
  }
  const plan = purgePlan(target)
  console.info(renderPurge(plan))
  return 0
}

const [command, ...args] = process.argv.slice(2)
switch (command) {
  case 'parity':
    process.exit(runParity(args))
    break
  case 'purge':
    process.exit(runPurge(args))
    break
  default:
    console.info(USAGE)
    process.exit(command === undefined || command === '--help' || command === '-h' ? 0 : 1)
}
