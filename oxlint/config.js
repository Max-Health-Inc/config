import { typeCheckedRules, bunTestRules } from '../eslint/rules.js'

const ESLINT_PREFIX = '@typescript-eslint/'

export const bunTestGlobs = ['test/**', '**/*.test.*']

export function toOxlintRules(rules) {
  return Object.fromEntries(Object.entries(rules).map(([name, value]) => [name.replace(ESLINT_PREFIX, 'typescript/'), value]))
}

/**
 * The type-checked rules of the ESLint presets as an Oxlint config, for `oxlint --type-aware`.
 *
 * @param {{ testRunner?: 'bun', testGlobs?: string[] }} [options]
 */
export function typeAwareConfig({ testRunner, testGlobs = bunTestGlobs } = {}) {
  return {
    categories: { correctness: 'off' },
    plugins: ['typescript'],
    rules: toOxlintRules(typeCheckedRules),
    ...(testRunner === 'bun' && { overrides: [{ files: testGlobs, rules: toOxlintRules(bunTestRules) }] }),
  }
}

export const generatedFiles = {
  'type-aware.json': typeAwareConfig(),
  'type-aware-bun.json': typeAwareConfig({ testRunner: 'bun' }),
}

export const serialize = (config) => `${JSON.stringify(config, null, 2)}\n`
