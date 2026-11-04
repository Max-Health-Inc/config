import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import { composeRules, testFilesConfig } from './compose.js'
import { a11yConfig } from './a11y.js'

/**
 * Shared ESLint flat config for React + TypeScript projects.
 *
 * @param {object} [options]
 * @param {string} [options.tsconfigRootDir] - Root dir for tsconfig resolution (default: caller's cwd)
 * @param {string} [options.appTsconfig] - Path to app tsconfig (default: './tsconfig.app.json')
 * @param {string} [options.nodeTsconfig] - Path to node tsconfig (default: './tsconfig.node.json')
 * @param {boolean} [options.typeChecked] - Enable type-checked rules (default: true)
 * @param {boolean} [options.security] - Enable security rules (default: false)
 * @param {string[]} [options.ignores] - Additional ignore patterns
 * @param {object} [options.extraRules] - Additional rules to merge
 * @param {object} [options.a11y] - The eslint-plugin-jsx-a11y-x module; turns on its recommended rules, taught the shared-ui components
 * @param {boolean} [options.tests] - Lint test files (default: false; opt in per repo)
 * @param {string[]} [options.testGlobs] - Test file globs (default: top-level `test/` + colocated `*.test.*`)
 * @param {string} [options.testTsconfig] - Test tsconfig path; set it to get type-checked rules in tests too
 * @param {'bun'} [options.testRunner] - Test runner whose typing gaps the type-checked test rules allow for
 */
export function createReactConfig(options = {}) {
  const {
    tsconfigRootDir,
    appTsconfig = './tsconfig.app.json',
    nodeTsconfig = './tsconfig.node.json',
    typeChecked = true,
    security = false,
    ignores = [],
    extraRules = {},
    tests = false,
    testGlobs = ['test/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    testTsconfig,
    testRunner,
    a11y,
  } = options
  const accessibility = a11y ? a11yConfig(a11y) : undefined

  return defineConfig([
    globalIgnores(['dist', 'node_modules', '**/lib/api-client/**', ...ignores]),
    {
      files: ['src/**/*.{ts,tsx}'],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        reactHooks.configs.flat.recommended,
        reactRefresh.configs.vite,
      ],
      plugins: accessibility?.plugins ?? {},
      settings: accessibility?.settings ?? {},
      rules: composeRules({ typeChecked, security, extraRules, extra: accessibility?.rules }),
      languageOptions: {
        ecmaVersion: 'latest',
        globals: globals.browser,
        parserOptions: {
          tsconfigRootDir,
          ...(typeChecked && { project: appTsconfig }),
        },
      },
    },
    // Opt-in: consumers pin a caret range, so linting tests by default would redden unrelated PRs.
    // No React plugins here: react-refresh's export rule fires on every exported test helper.
    ...(tests
      ? [testFilesConfig({ files: testGlobs, globals: { ...globals.browser, ...globals.node }, tsconfigRootDir, testTsconfig, testRunner, typeChecked, security, extraRules })]
      : []),
    {
      files: ['vite.config.ts'],
      extends: [js.configs.recommended, tseslint.configs.recommended],
      languageOptions: {
        ecmaVersion: 'latest',
        globals: globals.node,
        parserOptions: {
          tsconfigRootDir,
          project: nodeTsconfig,
        },
      },
    },
  ])
}
