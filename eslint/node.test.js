import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createNodeConfig } from './node.js'

function sourceBlock(config) {
  return config.find((block) => Array.isArray(block.files) && block.rules?.eqeqeq)
}

test('lints every .ts file by default', () => {
  assert.deepEqual(sourceBlock(createNodeConfig({ typeChecked: false })).files, ['src/**/*.ts', '**/*.ts'])
})

test('takes the source globs from options, so server-side .tsx is linted too', () => {
  const block = sourceBlock(createNodeConfig({ typeChecked: false, files: ['**/*.{ts,tsx}'] }))
  assert.deepEqual(block.files, ['**/*.{ts,tsx}'])
})
