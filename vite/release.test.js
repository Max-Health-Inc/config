import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  baseVersion,
  changelogEntries,
  changelogEntry,
  formatBuildVersion,
  nextReleaseVersion,
  releaseChannel,
} from './release.js'

const commit = { sha: '3d19d83', committedAt: new Date('2026-10-01T09:42:17Z') }

describe('nextReleaseVersion', () => {
  it('bumps the patch of the latest release on every production release', () => {
    assert.equal(nextReleaseVersion('0.1.0', 'v0.1.0'), '0.1.1')
    assert.equal(nextReleaseVersion('0.1.0', 'v0.1.7'), '0.1.8')
  })

  it('honours a deliberate minor or major bump in package.json', () => {
    assert.equal(nextReleaseVersion('0.2.0', 'v0.1.7'), '0.2.0')
    assert.equal(nextReleaseVersion('1.0.0', 'v0.9.3'), '1.0.0')
  })

  it('starts from package.json when nothing has been released yet', () => {
    assert.equal(nextReleaseVersion('0.1.0', null), '0.1.0')
  })
})

describe('formatBuildVersion', () => {
  it('names the exact commit as SemVer build metadata on a release', () => {
    assert.equal(formatBuildVersion('0.1.0', 'RELEASE', commit), '0.1.0+202610010942.3d19d83')
  })

  it('marks beta and local builds as pre-releases of the version they will become', () => {
    assert.equal(formatBuildVersion('0.1.1', 'beta', commit), '0.1.1-beta.202610010942.3d19d83')
    assert.equal(formatBuildVersion('0.1.1', 'dev', null), '0.1.1-dev')
  })
})

describe('baseVersion and releaseChannel', () => {
  it('keeps only the numeric part of a version', () => {
    assert.equal(baseVersion('0.0.9-alpha.202605020000.00000000'), '0.0.9')
    assert.equal(baseVersion('v1.2.3+abc'), '1.2.3')
  })

  it('takes the channel from the deploy job, then the branch, else dev', () => {
    assert.equal(releaseChannel('beta', 'main'), 'beta')
    assert.equal(releaseChannel(undefined, 'main'), 'RELEASE')
    assert.equal(releaseChannel(undefined, 'test'), 'beta')
    assert.equal(releaseChannel(undefined, 'feat/x'), 'dev')
  })
})

describe('changelog entries', () => {
  it('turns features, fixes and performance work into readable lines', () => {
    assert.deepEqual(changelogEntry('feat(upload): resume an interrupted upload'), { kind: 'feature', text: 'Resume an interrupted upload', breaking: false })
    assert.deepEqual(changelogEntry('FIX(css): mouse-wheel scrolling'), { kind: 'fix', text: 'Mouse-wheel scrolling', breaking: false })
    assert.equal(changelogEntry('perf: stream zips')?.kind, 'performance')
  })

  it('flags a breaking change from the ! or a BREAKING CHANGE footer', () => {
    assert.equal(changelogEntry('feat!: new API')?.breaking, true)
    assert.equal(changelogEntry({ subject: 'fix: old flag', body: 'BREAKING CHANGE: flag removed' })?.breaking, true)
  })

  it('leaves out what users never see', () => {
    for (const subject of ['chore: tidy', 'refactor: split module', 'test: more cases', 'ci: cache', 'build: deps', 'chore: release v1.2.3', 'Merge pull request #59 from org/test', 'fix: thing [skip ci]', 'not conventional at all']) {
      assert.equal(changelogEntry(subject), null, subject)
    }
  })

  it('lists a change once even when it was cherry-picked or rebased in twice', () => {
    assert.equal(changelogEntries(['fix: a', 'fix: a', 'feat: b']).length, 2)
  })

  it('stops at the limit', () => {
    assert.equal(changelogEntries(['fix: a', 'fix: b', 'fix: c'], 2).length, 2)
  })
})
