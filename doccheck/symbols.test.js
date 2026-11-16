import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { exportsOf } from './symbols.js'

const dir = mkdtempSync(path.join(tmpdir(), 'doccheck-symbols-'))
after(() => rmSync(dir, { recursive: true, force: true }))

function write(rel, src) {
  const file = path.join(dir, rel)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, src)
  return file
}

describe('exportsOf', () => {
  it('follows export * through the .js specifiers ESM TypeScript sources use', () => {
    write('core/button.ts', 'export function Button() {}\nexport interface ButtonProps { label: string }\n')
    write('core/index.ts', "export * from './button.js'\n")
    const entry = write('index.ts', [
      "export * from './core/index.js'",
      "export { Text, type TextProps } from './text.js'",
      "export type { Theme } from './theme.js'",
      'export const VERSION = 1',
    ].join('\n'))

    assert.deepEqual(
      [...exportsOf(entry)].sort(),
      ['Button', 'ButtonProps', 'Text', 'TextProps', 'Theme', 'VERSION'],
    )
  })

  it('terminates on export cycles', () => {
    write('a.ts', "export * from './b.js'\nexport const a = 1\n")
    const b = write('b.ts', "export * from './a.js'\nexport const b = 2\n")
    assert.deepEqual([...exportsOf(b)].sort(), ['a', 'b'])
  })
})
