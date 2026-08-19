import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'
import { sharedRules, typeCheckedRules as _typeCheckedRules, securityRules as _securityRules } from './rules.js'

/**
 * Shared ESLint flat config for Node.js + TypeScript projects.
 *
 * @param {object} [options]
 * @param {string} [options.tsconfigRootDir] - Root dir for tsconfig resolution
 * @param {string} [options.tsconfig] - Path to tsconfig (default: './tsconfig.json')
 * @param {boolean} [options.typeChecked] - Enable type-checked rules (default: true)
 * @param {boolean} [options.security] - Enable security rules (default: false)
 * @param {string[]} [options.ignores] - Additional ignore patterns
 * @param {object} [options.extraRules] - Additional rules to merge
 * @param {boolean} [options.tests] - Lint test files (default: false; opt in per repo)
 * @param {string[]} [options.testGlobs] - Test file globs (default: top-level `test/` + colocated `*.test.ts`)
 * @param {string} [options.testTsconfig] - Test tsconfig path; set it to get type-checked rules in tests too
 */
export function createNodeConfig(options = {}) {
  const {
    tsconfigRootDir,
    tsconfig = './tsconfig.json',
    typeChecked = true,
    security = false,
    ignores = [],
    extraRules = {},
    tests = false,
    testGlobs = ['test/**/*.ts', 'src/**/*.test.ts'],
    testTsconfig,
  } = options

  return defineConfig([
    globalIgnores(['dist', 'node_modules', '.wrangler', ...ignores]),
    {
      files: ['src/**/*.ts', '**/*.ts'],
      extends: [js.configs.recommended, tseslint.configs.recommended],
      rules: {
        ...sharedRules,
        ...(typeChecked ? _typeCheckedRules : {}),
        ...(security ? _securityRules : {}),
        ...extraRules,
      },
      languageOptions: {
        ecmaVersion: 'latest',
        globals: globals.node,
        parserOptions: {
          tsconfigRootDir,
          ...(typeChecked && { project: tsconfig }),
        },
      },
    },
    /*
     * Test files. The block above matches `**\/*.ts`, so tests were already linted here
     * BUT parsed against the main tsconfig — which throws for any test file that config
     * excludes. This block re-parses them without a project unless `testTsconfig` names
     * one (see tsconfig/test-bun.json), so type-checked rules are opt-in rather than
     * on by default and broken.
     */
    ...(tests
      ? [{
          files: testGlobs,
          extends: [js.configs.recommended, tseslint.configs.recommended],
          rules: {
            ...sharedRules,
            ...(typeChecked && testTsconfig ? _typeCheckedRules : {}),
            ...(security ? _securityRules : {}),
            ...extraRules,
          },
          languageOptions: {
            ecmaVersion: 'latest',
            globals: globals.node,
            parserOptions: {
              tsconfigRootDir,
              ...(testTsconfig && { project: testTsconfig }),
            },
          },
        }]
      : []),
  ])
}
