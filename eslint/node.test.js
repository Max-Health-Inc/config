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

function testBlock(config) {
  return config.find((block) => Array.isArray(block.files) && block.files.includes('test/**/*.ts') && block.languageOptions?.parserOptions && block.rules)
}

test('parses tests outside the source project without one, instead of inheriting it', () => {
  const block = testBlock(createNodeConfig({ tests: true }))
  assert.equal(block.languageOptions.parserOptions.project, false)
})

test('type-checks tests against testTsconfig when one is named', () => {
  const block = testBlock(createNodeConfig({ tests: true, testTsconfig: './tsconfig.test.json' }))
  assert.equal(block.languageOptions.parserOptions.project, './tsconfig.test.json')
  assert.equal(block.rules['@typescript-eslint/await-thenable'], 'error')
})

test('allows for bun-types gaps in type-checked bun tests', () => {
  const block = testBlock(createNodeConfig({ tests: true, testTsconfig: './tsconfig.json', testRunner: 'bun' }))
  assert.equal(block.rules['@typescript-eslint/await-thenable'], 'off')
  const [, options] = block.rules['@typescript-eslint/no-floating-promises']
  assert.deepEqual(options.allowForKnownSafeCalls, [{ from: 'package', package: 'bun:test', name: 'module' }])
})

test('switches off the type-aware rules the source block applies, for tests without a project', () => {
  const config = createNodeConfig({ tests: true })
  const testBlocks = config.filter((block) => JSON.stringify(block.files ?? []).includes('test/**/*.ts'))
  const lastSetting = testBlocks.reduce((setting, block) => block.rules?.['@typescript-eslint/no-floating-promises'] ?? setting, undefined)
  assert.equal(lastSetting, 'off')
})
