import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import { sharedRules, typeCheckedRules as _typeCheckedRules, securityRules as _securityRules } from './rules.js'

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
 * @param {boolean} [options.tests] - Lint test files (default: false; opt in per repo)
 * @param {string[]} [options.testGlobs] - Test file globs (default: top-level `test/` + colocated `*.test.*`)
 * @param {string} [options.testTsconfig] - Test tsconfig path; set it to get type-checked rules in tests too
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
  } = options

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
      rules: {
        ...sharedRules,
        ...(typeChecked ? _typeCheckedRules : {}),
        ...(security ? _securityRules : {}),
        ...extraRules,
      },
      languageOptions: {
        ecmaVersion: 'latest',
        globals: globals.browser,
        parserOptions: {
          tsconfigRootDir,
          ...(typeChecked && { project: appTsconfig }),
        },
      },
    },
    /*
     * Test files. Without this block the factory covered `src/**` and `vite.config.ts`
     * only, so a top-level `test/` dir shipped unlinted — which is how repos ended up
     * with hundreds of tests and no lint over any of them.
     *
     * Opt-in, not default: consumers pin a caret range and their CI installs with
     * `--no-frozen-lockfile`, so linting tests by default would turn a repo red on an
     * unrelated PR, for a backlog nobody chose to take on that day.
     *
     * Placed after the `src/**` block so it also wins for colocated `*.test.ts`, whose
     * parser options must differ: the app tsconfig excludes test files, and type-aware
     * linting throws on a file its project does not include. Type-checked rules are
     * therefore opt-in via `testTsconfig` (see tsconfig/test-bun.json) rather than on by
     * default and broken.
     *
     * No React plugins: a test is not a component, and react-refresh's export rule
     * fires on every exported helper.
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
            globals: { ...globals.browser, ...globals.node },
            parserOptions: {
              tsconfigRootDir,
              ...(testTsconfig && { project: testTsconfig }),
            },
          },
        }]
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
