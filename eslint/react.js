import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

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
  } = options

  const sharedRules = {
    // Unused variables - error with sensible ignores
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    // No any type
    '@typescript-eslint/no-explicit-any': 'error',
    // Consistent type imports
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
    ],
    // Unused expressions
    '@typescript-eslint/no-unused-expressions': 'error',
    // Strict equality
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    // No var declarations
    'no-var': 'error',
    // Prefer const over let
    'prefer-const': 'error',
    // No console.log in production (allow warn, error, info)
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    // No debugger statements
    'no-debugger': 'error',
    // No duplicate imports
    'no-duplicate-imports': 'error',
  }

  // Type-checked rules (catches async bugs)
  const typeCheckedRules = typeChecked ? {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
  } : {}

  // Security rules (backend packages)
  const securityRules = security ? {
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  } : {}

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
        ...typeCheckedRules,
        ...securityRules,
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
