#!/usr/bin/env node
// `release-tag prepare` tags HEAD locally with public notes before a production build reads them;
// `release-tag publish` pushes that tag and creates its private GitHub release, with the full internal
// changelog under the public notes, once the deploy succeeded.
import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { changelogEntry, commitsByType, readPackageVersion, releaseTags, resolveReleaseVersion, unreleasedCommits } from './release.js'
import { formatReleaseNotes, generateReleaseNotes, notesMarkdown, parseReleaseNotes, releaseBody, workersAiEndpoint } from './release-notes.js'

const env = process.env
const BOT = ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com']

/** @param {string} command @param {string[]} args @param {string} [input] */
function run(command, args, input) {
  return execFileSync(command, args, { encoding: 'utf8', input, stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'inherit'] }).trim()
}

/** @param {string} command @param {string[]} args */
function succeeds(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** @param {string} text */
function report(text) {
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `${text}\n`)
  process.stderr.write(`${text}\n`)
}

/** @param {string} tag */
function remoteHasTag(tag) {
  return succeeds('git', ['ls-remote', '--exit-code', '--tags', 'origin', `refs/tags/${tag}`])
}

function productDescription() {
  /** @type {unknown} */
  const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'))
  const read = (/** @type {string} */ key) => {
    const value = typeof pkg === 'object' && pkg !== null && key in pkg ? Object.getOwnPropertyDescriptor(pkg, key)?.value : undefined
    return typeof value === 'string' ? value : ''
  }
  return [read('name'), read('description')].filter(Boolean).join(': ') || 'web app'
}

async function prepare() {
  const tag = `v${resolveReleaseVersion(readPackageVersion(process.cwd()))}`
  if (releaseTags('HEAD').includes(tag) || remoteHasTag(tag)) {
    report(`${tag} is already tagged`)
    return
  }
  const commits = unreleasedCommits().filter((commit) => changelogEntry(commit) !== null)
  const token = env.RELEASE_NOTES_TOKEN ?? env.CLOUDFLARE_API_TOKEN
  const endpoint = env.RELEASE_NOTES_ENDPOINT ?? (env.CLOUDFLARE_ACCOUNT_ID ? workersAiEndpoint(env.CLOUDFLARE_ACCOUNT_ID) : undefined)
  const { notes, error } = token && endpoint
    ? await generateReleaseNotes(productDescription(), commits, { token, endpoint, model: env.RELEASE_NOTES_MODEL })
    : { notes: [], error: 'no model configured: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN, or RELEASE_NOTES_ENDPOINT and RELEASE_NOTES_TOKEN' }
  if (error) report(`Release notes for ${tag} could not be written (${error}); tagging without them.`)
  run('git', [...BOT, 'tag', '--annotate', '--cleanup=verbatim', '--file=-', tag, 'HEAD'], formatReleaseNotes(tag.slice(1), notes))
  report(`### ${tag}\n\n${notesMarkdown(notes) || '_No user-facing changes._'}`)
}

function publish() {
  const tag = releaseTags('HEAD')[0]
  if (!tag) {
    report('HEAD carries no release tag; run `release-tag prepare` first')
    process.exitCode = 1
    return
  }
  if (!remoteHasTag(tag)) run('git', ['push', 'origin', `refs/tags/${tag}`])
  if (succeeds('gh', ['release', 'view', tag])) {
    report(`${tag} is already released`)
    return
  }
  const notes = parseReleaseNotes(run('git', ['tag', '--list', '--format=%(contents)', tag]))
  const body = releaseBody(notes, commitsByType(unreleasedCommits()))
  run('gh', ['release', 'create', tag, '--verify-tag', '--title', tag, '--notes-file', '-'], body)
  report(`### Released ${tag}`)
}

const command = process.argv[2]
if (command === 'prepare') await prepare()
else if (command === 'publish') publish()
else {
  process.stderr.write('usage: release-tag prepare | publish\n')
  process.exitCode = 2
}
