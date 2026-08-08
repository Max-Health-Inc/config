#!/usr/bin/env node
// SPDX-License-Identifier: MIT

/**
 * doccheck — keep a repo's documentation honest.
 *
 *   doccheck badges     badges and in-repo links resolve, version badge is current
 *   doccheck examples   fenced ts/tsx examples compile against the real packages
 *   doccheck coverage   how much of the published API the docs name
 *   doccheck all        all three, stopping at the first failure
 *
 * Run from the repo root. Configure via a `doccheck` key in package.json.
 */

import { loadConfig } from './files.js'
import { checkBadges } from './badges.js'
import { checkDocExamples } from './examples.js'
import { checkDocsCoverage } from './coverage.js'

const USAGE = `doccheck <command> [options]

Commands:
  badges     [--online] [--json]   badges and in-repo links
  examples   [--keep]              typecheck fenced ts/tsx examples
  coverage   [--list] [--json] [--min=N]
  all                              badges, then examples, then coverage

Config (package.json "doccheck"):
  workspace     directory the examples are compiled from (default ".")
  skipSegments  extra path segments to ignore
  skipPrefixes  extra repo-relative path prefixes to ignore
  minCoverage   coverage floor for \`coverage\` and \`all\`
`

async function run(command, args, config) {
  const has = (flag) => args.includes(flag)
  const minArg = args.find((a) => a.startsWith('--min='))

  switch (command) {
    case 'badges':
      return checkBadges(config, { online: has('--online'), json: has('--json') })
    case 'examples':
      return checkDocExamples(config, { keep: has('--keep') })
    case 'coverage':
      return checkDocsCoverage(config, {
        list: has('--list'),
        json: has('--json'),
        ...(minArg ? { min: Number(minArg.split('=')[1]) } : {}),
      })
    case 'all': {
      // Sequential and short-circuiting: examples and coverage both read the same
      // markdown, so a badge failure usually means the later output is noise.
      for (const step of ['badges', 'examples', 'coverage']) {
        const code = await run(step, args, config)
        if (code !== 0) return code
      }
      return 0
    }
    default:
      console.error(USAGE)
      return command ? 1 : 0
  }
}

const [command, ...args] = process.argv.slice(2)
try {
  process.exit(await run(command, args, loadConfig()))
} catch (err) {
  console.error(`doccheck: ${err.message}`)
  process.exit(1)
}
