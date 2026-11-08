import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import { sharedRules, typeCheckedRules, securityRules, bunTestRules } from './rules.js'

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
    extends: [js.configs.recommended, tseslint.configs.recommended, ...(testTsconfig ? [] : [tseslint.configs.disableTypeChecked])],
    rules: composeRules({ typeChecked: typed, security, extraRules, bunTests: testRunner === 'bun' }),
    languageOptions: languageOptions({ globals, tsconfigRootDir, project: testTsconfig ?? false }),
  }
}
