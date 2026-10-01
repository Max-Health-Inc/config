/**
 * Release metadata for a Max Health web app, read from git at build time: the version a build
 * carries and the changelog shown to its users. Node only (child_process), hence its own subpath.
 *
 * VERSION. Production (main) releases bump themselves: the next release is the latest `vX.Y.Z`
 * tag with its patch bumped, unless package.json was deliberately set ahead of it (a minor or
 * major bump), the rule mcp-http and prefab use. CI tags each deployed commit, so the tag is the
 * record and nothing is committed back. Every build also names its exact commit, which for a
 * medical device stands in for a lot number:
 *   production  0.1.0+202610010957.3d19d83   (release + SemVer build metadata)
 *   beta        0.1.1-beta.202610011142.abc1234   (pre-release of the next version)
 * The stamp is the commit's own time, so a commit always yields the same version, and a production
 * build of a promotion merge whose tree equals the promoted commit names that commit.
 *
 * CHANGELOG. Per release tag, the `feat` / `fix` / `perf` commit subjects since the previous tag
 * (Conventional Commits), plus the not yet released ones for a pre-release build.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/** @typedef {'dev' | 'beta' | 'RELEASE'} ReleaseChannel */
/** @typedef {{ sha: string, committedAt: Date }} BuildCommit */
/** @typedef {'feature' | 'fix' | 'performance'} ChangeKind */
/** @typedef {{ kind: ChangeKind, text: string, breaking: boolean }} ChangelogEntry */
/** @typedef {{ version: string, date: string | null, unreleased: boolean, entries: ChangelogEntry[] }} ChangelogRelease */

/** @param {string} version @returns {[number, number, number] | null} */
function parseSemver(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

/** @param {[number, number, number]} a @param {[number, number, number]} b */
function compare(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

/** `0.0.9-alpha.123.abc` -> `0.0.9`. @param {string} packageVersion */
export function baseVersion(packageVersion) {
  const parsed = parseSemver(packageVersion)
  return parsed ? parsed.join('.') : '0.0.0'
}

/**
 * The latest tag's patch bumped, or package.json's base when it was set ahead deliberately.
 * @param {string} packageBase @param {string | null} latestTag
 */
export function nextReleaseVersion(packageBase, latestTag) {
  const base = parseSemver(packageBase) ?? [0, 0, 0]
  const latest = latestTag ? parseSemver(latestTag) : null
  if (!latest || compare(base, latest) > 0) return base.join('.')
  return [latest[0], latest[1], latest[2] + 1].join('.')
}

/**
 * The deploy job's setting wins, then the branch, else a local dev build.
 * @param {string | undefined} explicit @param {string | undefined} branch @returns {ReleaseChannel}
 */
export function releaseChannel(explicit, branch) {
  if (explicit === 'beta' || explicit === 'RELEASE' || explicit === 'dev') return explicit
  if (branch === 'main') return 'RELEASE'
  if (branch === 'test') return 'beta'
  return 'dev'
}

/** @param {Date} date */
function stamp(date) {
  /** @param {number} n */
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`
}

/** @param {string} version @param {ReleaseChannel} channel @param {BuildCommit | null} commit */
export function formatBuildVersion(version, channel, commit) {
  const build = commit ? `${stamp(commit.committedAt)}.${commit.sha}` : null
  if (channel === 'RELEASE') return build ? `${version}+${build}` : version
  return build ? `${version}-${channel}.${build}` : `${version}-${channel}`
}

/** `type(scope)!: subject`, the same grammar BabelFHIR-TS's generate-changelog.mjs parses. */
const CONVENTIONAL = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s*(?<subject>.+)$/i
/** @type {Record<string, ChangeKind>} */
const KINDS = { feat: 'feature', fix: 'fix', perf: 'performance' }

/** @typedef {{ subject: string, body: string }} CommitMessage */

/** Release automation's own commits, never news to a user. @param {string} subject */
function isNoise(subject) {
  return (
    subject.includes('[skip ci]') ||
    /^chore(\([^)]*\))?:\s*(bump version|release v)/i.test(subject) ||
    /^Merge (branch|pull request|remote-tracking)\b/i.test(subject)
  )
}

/**
 * A commit as a changelog line, or null for what users do not see (chore, ci, test, refactor…).
 * @param {CommitMessage | string} commit @returns {ChangelogEntry | null}
 */
export function changelogEntry(commit) {
  const { subject, body } = typeof commit === 'string' ? { subject: commit, body: '' } : commit
  const trimmed = subject.trim()
  if (isNoise(trimmed)) return null
  const groups = CONVENTIONAL.exec(trimmed)?.groups
  const kind = groups ? KINDS[groups.type.toLowerCase()] : undefined
  if (!groups || !kind) return null
  const text = groups.subject.trim()
  return {
    kind,
    text: text.charAt(0).toUpperCase() + text.slice(1),
    breaking: groups.breaking === '!' || /^BREAKING[ -]CHANGE:/m.test(body),
  }
}

/** @param {Array<CommitMessage | string>} commits @param {number} limit @returns {ChangelogEntry[]} */
export function changelogEntries(commits, limit = 40) {
  const seen = new Set()
  /** @type {ChangelogEntry[]} */
  const entries = []
  for (const commit of commits) {
    const entry = changelogEntry(commit)
    if (!entry || seen.has(entry.text)) continue
    seen.add(entry.text)
    entries.push(entry)
    if (entries.length >= limit) break
  }
  return entries
}

/** @param {...string} args @returns {string | null} */
function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null
  } catch {
    return null
  }
}

/** @param {...string} args */
function gitSucceeds(...args) {
  try {
    execFileSync('git', args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** @param {string} ref @returns {BuildCommit | null} */
function commitAt(ref) {
  const sha = git('rev-parse', '--short=7', ref)
  const iso = git('show', '-s', '--format=%cI', ref)
  return sha && iso ? { sha, committedAt: new Date(iso) } : null
}

/** @param {ReleaseChannel} channel @returns {BuildCommit | null} */
export function buildCommit(channel) {
  if (channel === 'RELEASE' && gitSucceeds('rev-parse', '--verify', '--quiet', 'HEAD^2') && gitSucceeds('diff', '--quiet', 'HEAD', 'HEAD^2')) {
    return commitAt('HEAD^2') ?? commitAt('HEAD')
  }
  return commitAt('HEAD')
}

/** Release tags, newest first. @param {string} [ref] @returns {string[]} */
function releaseTags(ref) {
  const args = ['tag', '--list', 'v[0-9]*', '--sort=-v:refname']
  if (ref) args.push('--points-at', ref)
  return (git(...args) ?? '').split('\n').map((tag) => tag.trim()).filter((tag) => parseSemver(tag) !== null)
}

/** @param {string} packageVersion */
export function resolveReleaseVersion(packageVersion) {
  const released = releaseTags('HEAD')[0]
  if (released) return baseVersion(released)
  return nextReleaseVersion(baseVersion(packageVersion), releaseTags()[0] ?? null)
}

/** @param {string} packageVersion @param {Record<string, string | undefined>} env */
export function resolveBuildVersion(packageVersion, env) {
  const channel = releaseChannel(env.VITE_RELEASE_CHANNEL, env.GITHUB_REF_NAME ?? git('rev-parse', '--abbrev-ref', 'HEAD') ?? undefined)
  return formatBuildVersion(resolveReleaseVersion(packageVersion), channel, buildCommit(channel))
}

const FIELD = '\x1f'
const RECORD = '\x1e'

/** Subjects and bodies in a range; \x1f and \x1e never occur in commit text. @param {string} range @returns {CommitMessage[]} */
function commitsIn(range) {
  return (git('log', '--no-merges', `--format=%s${FIELD}%b${RECORD}`, range) ?? '')
    .split(RECORD)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [subject = '', body = ''] = record.split(FIELD)
      return { subject: subject.trim(), body: body.trim() }
    })
}

/**
 * The changelog, newest first: a pre-release section for commits after the latest tag, then one
 * section per tag. The oldest tag has no earlier one to diff against, so it lists no entries.
 * @param {string} packageVersion @param {{ maxReleases?: number }} [options] @returns {ChangelogRelease[]}
 */
export function buildChangelog(packageVersion, options = {}) {
  const tags = releaseTags().slice(0, (options.maxReleases ?? 15) + 1)
  /** @type {ChangelogRelease[]} */
  const releases = []
  const latest = tags[0]
  const released = releaseTags('HEAD')[0]
  if (!released) {
    const pending = changelogEntries(commitsIn(latest ? `${latest}..HEAD` : 'HEAD'))
    if (pending.length > 0) {
      releases.push({ version: nextReleaseVersion(baseVersion(packageVersion), latest ?? null), date: null, unreleased: true, entries: pending })
    }
  }
  for (const [index, tag] of tags.entries()) {
    if (index >= (options.maxReleases ?? 15)) break
    const previous = tags[index + 1]
    releases.push({
      version: baseVersion(tag),
      date: git('log', '-1', '--format=%cI', tag),
      unreleased: false,
      entries: previous ? changelogEntries(commitsIn(`${previous}..${tag}`)) : [],
    })
  }
  return releases
}

/** @param {string} root */
export function readPackageVersion(root) {
  /** @type {unknown} */
  const parsed = JSON.parse(readFileSync(path.resolve(root, 'package.json'), 'utf-8'))
  return typeof parsed === 'object' && parsed !== null && 'version' in parsed && typeof parsed.version === 'string'
    ? parsed.version
    : '0.0.0'
}

/**
 * Vite `define` entries for the app: `__APP_VERSION__` and `__APP_CHANGELOG__`.
 * @param {string} root @param {Record<string, string | undefined>} env
 */
export function releaseDefines(root, env) {
  const packageVersion = readPackageVersion(root)
  return {
    __APP_VERSION__: JSON.stringify(resolveBuildVersion(packageVersion, env)),
    __APP_CHANGELOG__: JSON.stringify(buildChangelog(packageVersion)),
  }
}
