import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { markdownFiles } from './files.js'

const root = mkdtempSync(path.join(tmpdir(), 'doccheck-files-'))
after(() => rmSync(root, { recursive: true, force: true }))

function write(rel, src = '# doc\n') {
  const file = path.join(root, rel)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, src)
}

const config = { skipSegments: new Set(['node_modules']), skipPrefixes: [`generated${path.sep}docs`] }

describe('markdownFiles', () => {
  write('README.md')
  write('docs/guide.md')
  write('node_modules/pkg/README.md')
  write('generated/docs/api.md')
  write('.claude/worktrees/agent-1/.git', 'gitdir: ../../../.git/worktrees/agent-1\n')
  write('.claude/worktrees/agent-1/README.md')
  write('vendor-sub/.git/HEAD', 'ref: refs/heads/main\n')
  write('vendor-sub/notes.md')

  it('lists the markdown the repo owns as root-relative POSIX paths', () => {
    assert.deepEqual(markdownFiles(config, root).sort(), ['README.md', 'docs/guide.md'])
  })

  it('skips nested git checkouts, worktrees and submodules alike', () => {
    const found = markdownFiles(config, root)
    assert.ok(!found.some((f) => f.startsWith('.claude/')))
    assert.ok(!found.some((f) => f.startsWith('vendor-sub/')))
  })
})
