// SPDX-License-Identifier: MIT

/** Programmatic entry point. The CLI in cli.js is a thin wrapper over these. */

export { loadConfig, markdownFiles, lineOf, ROOT } from './files.js'
export { checkBadges } from './badges.js'
export { checkDocExamples } from './examples.js'
export { checkDocsCoverage } from './coverage.js'
