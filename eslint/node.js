import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'
import { composeRules, languageOptions, testFilesConfig } from './compose.js'

/**
 * Shared ESLint flat config for Node.js + TypeScript projects.
 *
 * @param {object} [options]
 * @param {string} [options.tsconfigRootDir] - Root dir for tsconfig resolution
 * @param {string} [options.tsconfig] - Path to tsconfig (default: './tsconfig.json')
 * @param {string[]} [options.files] - Source globs (default: every `.ts` file); add `.tsx` for server-side JSX
 * @param {boolean} [options.typeChecked] - Enable type-checked rules (default: true)
 * @param {boolean} [options.security] - Enable security rules (default: false)
 * @param {string[]} [options.ignores] - Additional ignore patterns
 * @param {object} [options.extraRules] - Additional rules to merge
 * @param {boolean} [options.tests] - Lint test files (default: false; opt in per repo)
 * @param {string[]} [options.testGlobs] - Test file globs (default: top-level `test/` + colocated `*.test.ts`)
 * @param {string} [options.testTsconfig] - Test tsconfig path; set it to get type-checked rules in tests too
 * @param {'bun'} [options.testRunner] - Test runner whose typing gaps the type-checked test rules allow for
 */
export function createNodeConfig(options = {}) {
  const {
    tsconfigRootDir,
    tsconfig = './tsconfig.json',
    files = ['src/**/*.ts', '**/*.ts'],
    typeChecked = true,
    security = false,
    ignores = [],
    extraRules = {},
    tests = false,
    testGlobs = ['test/**/*.ts', 'src/**/*.test.ts'],
    testTsconfig,
    testRunner,
  } = options

  return defineConfig([
    globalIgnores(['dist', 'node_modules', '.wrangler', ...ignores]),
    {
      files,
      extends: [js.configs.recommended, tseslint.configs.recommended],
      rules: composeRules({ typeChecked, security, extraRules }),
      languageOptions: languageOptions({ globals: globals.node, tsconfigRootDir, project: typeChecked ? tsconfig : undefined }),
    },
    ...(tests
      ? [testFilesConfig({ files: testGlobs, globals: globals.node, tsconfigRootDir, testTsconfig, testRunner, typeChecked, security, extraRules })]
      : []),
  ])
}
