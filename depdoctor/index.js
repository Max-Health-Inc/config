// SPDX-License-Identifier: MIT

/**
 * Programmatic entry for the dependency-parity check. The CLI (`depdoctor`) is the usual
 * way in; this exists so a repo can fold parity into an existing check script.
 */
export { checkDependencyParity, readInstalledTree, hashPackage, coldInstall, matchesWatch, DEFAULT_WATCH } from './parity.js'
export { purgePlan, renderPurge, cacheRoot, parseSpec } from './purge.js'
