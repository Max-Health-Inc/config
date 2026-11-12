import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { sharedRules, typeCheckedRules, securityRules, bunTestRules } from './rules.js'

export const recommended = [js.configs.recommended, tseslint.configs.recommended]

/**
 * The rule set every factory block starts from, in override order.
 *
 * @param {{ typeChecked?: boolean, security?: boolean, extraRules?: object, bunTests?: boolean, extra?: object }} options
 */
export function composeRules({ typeChecked, security, extraRules, bunTests = false, extra = {} }) {
  return {
    ...sharedRules,
    ...(typeChecked ? typeCheckedRules : {}),
    ...(typeChecked && bunTests ? bunTestRules : {}),
    ...(security ? securityRules : {}),
    ...extra,
    ...extraRules,
  }
}

/**
 * Language options every block shares: latest syntax, the block's globals, and its tsconfig
 * `project` (false parses without one; undefined leaves it unset).
 *
 * @param {{ globals: object, tsconfigRootDir?: string, project?: string | false }} options
 */
export function languageOptions({ globals, tsconfigRootDir, project }) {
  return {
    ecmaVersion: 'latest',
    globals,
    parserOptions: { tsconfigRootDir, ...(project !== undefined && { project }) },
  }
}

/**
 * Test-file block, placed after the source block so it wins for colocated tests. Without
 * `testTsconfig` tests parse without a project and type-aware rules are switched off,
 * since a source tsconfig that excludes tests makes type-aware linting throw.
 *
 * @param {{ files: string[], globals: object, tsconfigRootDir?: string, testTsconfig?: string, testRunner?: 'bun', typeChecked: boolean, security: boolean, extraRules: object }} options
 */
export function testFilesConfig({ files, globals, tsconfigRootDir, testTsconfig, testRunner, typeChecked, security, extraRules }) {
  const typed = Boolean(typeChecked && testTsconfig)
  return {
    files,
    extends: [...recommended, ...(testTsconfig ? [] : [tseslint.configs.disableTypeChecked])],
    rules: composeRules({ typeChecked: typed, security, extraRules, bunTests: testRunner === 'bun' }),
    languageOptions: languageOptions({ globals, tsconfigRootDir, project: testTsconfig ?? false }),
  }
}

/**
 * Options every factory accepts.
 *
 * @typedef {object} SharedOptions
 * @property {string} [tsconfigRootDir] - Root dir for tsconfig resolution (default: caller's cwd)
 * @property {boolean} [typeChecked] - Enable type-checked rules (default: true)
 * @property {boolean} [security] - Enable security rules (default: false)
 * @property {string[]} [ignores] - Additional ignore patterns
 * @property {object} [extraRules] - Additional rules to merge
 * @property {boolean} [tests] - Lint test files (default: false; opt in per repo)
 * @property {string[]} [testGlobs] - Test file globs
 * @property {string} [testTsconfig] - Test tsconfig path; set it to get type-checked rules in tests too
 * @property {'bun'} [testRunner] - Test runner whose typing gaps the type-checked test rules allow for
 */

/**
 * Ignores, the source block and the opt-in test block that every factory builds; each factory
 * supplies its globs, globals, tsconfig and framework presets.
 *
 * @param {SharedOptions & { files: string[], globals: object, testGlobals?: object, project: string, presets?: object[], accessibility?: { plugins: object, settings: object, rules: object }, extraBlocks?: object[] }} options
 */
export function createBaseConfig({
  tsconfigRootDir,
  typeChecked = true,
  security = false,
  ignores = [],
  extraRules = {},
  tests = false,
  testGlobs,
  testTsconfig,
  testRunner,
  files,
  globals,
  testGlobals = globals,
  project,
  presets = [],
  accessibility,
  extraBlocks = [],
}) {
  return defineConfig([
    globalIgnores(['dist', 'node_modules', ...ignores]),
    {
      files,
      extends: [...recommended, ...presets],
      ...(accessibility && { plugins: accessibility.plugins, settings: accessibility.settings }),
      rules: composeRules({ typeChecked, security, extraRules, extra: accessibility?.rules }),
      languageOptions: languageOptions({ globals, tsconfigRootDir, project: typeChecked ? project : undefined }),
    },
    ...(tests
      ? [testFilesConfig({ files: testGlobs, globals: testGlobals, tsconfigRootDir, testTsconfig, testRunner, typeChecked, security, extraRules })]
      : []),
    ...extraBlocks,
  ])
}
