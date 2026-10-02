import { test } from 'node:test'
import assert from 'node:assert/strict'
import { a11yConfig } from './a11y.js'

const fakePlugin = {
  configs: {
    recommended: {
      plugins: { 'jsx-a11y-x': { rules: {} } },
      rules: { 'jsx-a11y-x/alt-text': 'error', 'jsx-a11y-x/no-autofocus': 'error' },
    },
  },
}

test('applies the plugin and its recommended rules', () => {
  const config = a11yConfig(fakePlugin)
  assert.equal(config.plugins['jsx-a11y-x'], fakePlugin.configs.recommended.plugins['jsx-a11y-x'])
  assert.equal(config.rules['jsx-a11y-x/alt-text'], 'error')
  assert.equal(config.rules['jsx-a11y-x/no-autofocus'], 'error')
})

test('lints the shared-ui primitives as the DOM elements they render', () => {
  const { components } = a11yConfig(fakePlugin).settings['jsx-a11y-x']
  assert.deepEqual(
    { Label: components.Label, Input: components.Input, Textarea: components.Textarea, NativeSelect: components.NativeSelect, Button: components.Button },
    { Label: 'label', Input: 'input', Textarea: 'textarea', NativeSelect: 'select', Button: 'button' },
  )
})

test('counts the Radix-based shared-ui controls as label targets', () => {
  const [level, options] = a11yConfig(fakePlugin).rules['jsx-a11y-x/label-has-associated-control']
  assert.equal(level, 'error')
  assert.equal(options.assert, 'either')
  for (const control of ['Select', 'SelectTrigger', 'Checkbox', 'Switch']) {
    assert.ok(options.controlComponents.includes(control), control)
  }
})

test('lets a labelled scroll region take focus, as WCAG 2.1.1 requires', () => {
  const [, options] = a11yConfig(fakePlugin).rules['jsx-a11y-x/no-noninteractive-tabindex']
  assert.ok(options.roles.includes('region'))
  assert.ok(options.roles.includes('tabpanel'))
})

test('fails loudly when handed something that is not the plugin', () => {
  assert.throws(() => a11yConfig({}), /eslint-plugin-jsx-a11y-x/)
})
