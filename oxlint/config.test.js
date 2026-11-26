import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { generatedFiles, serialize, typeAwareConfig } from './config.js'
import { typeCheckedRules } from '../eslint/rules.js'

test('the committed Oxlint configs match the ESLint rule set they are generated from', () => {
  for (const [name, config] of Object.entries(generatedFiles)) {
    assert.equal(readFileSync(new URL(name, import.meta.url), 'utf8'), serialize(config), `${name} is stale: run node oxlint/generate.js`)
  }
})

test('carries every type-checked ESLint rule under the Oxlint typescript plugin', () => {
  const names = Object.keys(typeAwareConfig().rules)
  assert.deepEqual(names, Object.keys(typeCheckedRules).map((name) => name.replace('@typescript-eslint/', 'typescript/')))
})

test('relaxes the bun test typing gaps only for test files', () => {
  const [override] = typeAwareConfig({ testRunner: 'bun' }).overrides
  assert.equal(override.rules['typescript/await-thenable'], 'off')
  assert.equal(typeAwareConfig().overrides, undefined)
})
