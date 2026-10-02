import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { buildChangelog, commitsByType } from './release.js'
import {
  commitDigest,
  formatReleaseNotes,
  generateReleaseNotes,
  isPublicText,
  notesFromModel,
  parseReleaseNotes,
  releaseBody,
  releaseNotesPrompt,
} from './release-notes.js'

/** @type {import('./release.js').ChangelogEntry[]} */
const NOTES = [
  { kind: 'fix', text: 'Large archives import without the page running out of memory', breaking: false },
  { kind: 'feature', text: 'Progress is shown while an archive unpacks', breaking: false },
  { kind: 'performance', text: 'Big studies open faster', breaking: true },
]

describe('release notes in a tag annotation', () => {
  it('round-trips through the annotation format', () => {
    const message = formatReleaseNotes('0.1.6', NOTES)
    assert.match(message, /^v0\.1\.6\n\n- Fixed: Large archives/)
    assert.deepEqual(parseReleaseNotes(message), NOTES)
  })

  it('reads nothing from an annotation it did not write', () => {
    assert.deepEqual(parseReleaseNotes('fix(billing): verify admin tokens\n\n- some bullet'), [])
  })
})

describe('notesFromModel', () => {
  it('keeps well-formed notes and drops the internal ones', () => {
    const answer = JSON.stringify({
      notes: [
        { kind: 'fix', text: 'Archives import reliably.' },
        { kind: 'fix', text: 'Take @babelfhir-ts/dicomweb 0.3.0' },
        { kind: 'feature', text: 'verifyCaller reads realm_access roles' },
        { kind: 'fix', text: 'See https://example.com' },
        { kind: 'fix', text: 'Fixed in 10eebbb' },
        { kind: 'chore', text: 'Bumped the lockfile' },
        { kind: 'fix', text: 'Archives import reliably' },
      ],
    })
    assert.deepEqual(notesFromModel(answer), [{ kind: 'fix', text: 'Archives import reliably', breaking: false }])
  })

  it('accepts a fenced answer and refuses anything that is not the JSON shape', () => {
    assert.equal(notesFromModel('```json\n{"notes":[{"kind":"feature","text":"Dark mode"}]}\n```').length, 1)
    assert.deepEqual(notesFromModel('Here are your notes: - Dark mode'), [])
    assert.deepEqual(notesFromModel('{"items":[]}'), [])
  })

  it('treats code, paths and links as not public', () => {
    assert.equal(isPublicText('Studies open faster'), true)
    for (const text of ['src/lib/a.ts', 'use `fetch`', 'a_b', 'camelCase', 'x'.repeat(161), '']) {
      assert.equal(isPublicText(text), false, text)
    }
  })
})

describe('generateReleaseNotes', () => {
  const commits = [{ subject: 'fix(import): stream zips', body: 'fflate spawned a worker per entry' }]

  it('sends the commits to the model and returns its validated notes', async () => {
    /** @type {unknown} */
    let sent
    /** @param {unknown} _url @param {RequestInit} [init] */
    const fake = async (_url, init) => {
      sent = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"notes":[{"kind":"fix","text":"Large archives import"}]}' } }] }))
    }
    const result = await generateReleaseNotes('dicom-viewer', commits, { token: 't', endpoint: 'https://llm.test/v1/chat/completions', fetch: fake })
    assert.deepEqual(result, { notes: [{ kind: 'fix', text: 'Large archives import', breaking: false }], error: null })
    assert.match(JSON.stringify(sent), /fflate spawned a worker per entry/)
  })

  it('never throws: a failing model yields no notes and says why', async () => {
    const down = async () => new Response('nope', { status: 503 })
    assert.deepEqual(await generateReleaseNotes('x', commits, { token: 't', endpoint: 'https://llm.test/v1/chat/completions', fetch: down }), { notes: [], error: 'model answered 503' })
    const offline = async () => {
      throw new Error('offline')
    }
    assert.deepEqual(await generateReleaseNotes('x', commits, { token: 't', endpoint: 'https://llm.test/v1/chat/completions', fetch: offline }), { notes: [], error: 'offline' })
  })

  it('gives up on a model that never answers', async () => {
    /** @param {unknown} _url @param {RequestInit} [init] */
    const hang = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)))
    const keepAlive = setInterval(() => undefined, 1000)
    const result = await generateReleaseNotes('x', commits, { token: 't', endpoint: 'https://llm.test', fetch: hang, timeoutMs: 20 })
    clearInterval(keepAlive)
    assert.equal(result.notes.length, 0)
    assert.match(String(result.error), /timeout|aborted/i)
  })

  it('asks nothing for a release without user-facing commits', async () => {
    const never = async () => {
      throw new Error('called')
    }
    assert.deepEqual(await generateReleaseNotes('x', [], { token: 't', endpoint: 'https://llm.test/v1/chat/completions', fetch: never }), { notes: [], error: null })
  })

  it('caps a long history to its newest commits, as a first release spans everything', () => {
    const history = Array.from({ length: 500 }, (_, i) => ({ subject: `feat: change ${i}`, body: 'x'.repeat(600) }))
    const digest = commitDigest(history)
    assert.ok(digest.length <= 24_000 + 700)
    assert.ok(digest.startsWith('feat: change 0\n'))
    assert.doesNotMatch(digest, /change 499/)
  })

  it('puts the product and every commit in the prompt', () => {
    const [system, user] = releaseNotesPrompt('dicom-viewer: DICOM viewer', commits)
    assert.match(system.content, /JSON only/)
    assert.match(user.content, /dicom-viewer: DICOM viewer[\s\S]*fix\(import\): stream zips/)
  })
})

describe('the private GitHub release body', () => {
  const commits = [
    { subject: 'fix(billing): verify admin tokens against the realm issuer', body: '' },
    { subject: 'feat: stream zips', body: '' },
    { subject: 'ci: run checks on PRs', body: '' },
    { subject: 'Update README', body: '' },
    { subject: 'chore: release v0.1.6 [skip ci]', body: '' },
    { subject: "Merge branch 'test'", body: '' },
  ]

  it('groups every commit by type and leaves out release automation', () => {
    assert.deepEqual([...commitsByType(commits).entries()], [
      ['fix', ['fix(billing): verify admin tokens against the realm issuer']],
      ['feat', ['feat: stream zips']],
      ['ci', ['ci: run checks on PRs']],
      ['other', ['Update README']],
    ])
  })

  it('puts the public notes first and the full internal record after them', () => {
    const body = releaseBody([NOTES[0]], commitsByType(commits))
    assert.ok(body.startsWith('## Shown in the app\n\n- **Fixed:** Large archives'))
    assert.ok(body.includes('## Changes\n\n### Features\n\n- feat: stream zips\n\n### Fixes\n\n- fix(billing): verify admin tokens'))
    assert.ok(body.endsWith('### CI\n\n- ci: run checks on PRs\n\n### Other\n\n- Update README'))
  })

  it('says so when a release has nothing for users', () => {
    assert.match(releaseBody([], new Map()), /_Nothing in this release is visible to users._[\s\S]*_No commits since the previous release._/)
  })
})

describe('buildChangelog from tags', () => {
  const cwd = process.cwd()
  let repo = ''

  /** @param {...string} args */
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: repo, stdio: 'pipe' })
  /** @param {string} message */
  const commit = (message) => git('commit', '--allow-empty', '-m', message)

  before(() => {
    repo = mkdtempSync(path.join(tmpdir(), 'release-notes-'))
    git('init', '-q')
    commit('feat: first')
    git('tag', 'v0.1.0')
    commit('fix(billing): verify admin tokens against the realm issuer')
    git('tag', '--annotate', '--cleanup=verbatim', '-m', formatReleaseNotes('0.1.1', [NOTES[0]]), 'v0.1.1')
    commit('fix: internal detail nobody should read')
    process.chdir(repo)
  })

  after(() => {
    process.chdir(cwd)
    rmSync(repo, { recursive: true, force: true })
  })

  it('shows only releases whose tag carries public notes', () => {
    const releases = buildChangelog('0.1.0')
    assert.deepEqual(releases.map((r) => [r.version, r.entries.map((e) => e.text)]), [['0.1.1', [NOTES[0].text]]])
    assert.doesNotMatch(JSON.stringify(releases), /realm issuer|internal detail/)
  })

  it('adds raw unreleased commits only when asked, for a local dev build', () => {
    const [pending] = buildChangelog('0.1.0', { includeUnreleased: true })
    assert.equal(pending.unreleased, true)
    assert.deepEqual(pending.entries.map((e) => e.text), ['Internal detail nobody should read'])
  })
})
