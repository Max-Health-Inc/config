import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

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
 */
export function createNodeConfig(options = {}) {
  const {
    tsconfigRootDir,
    tsconfig = './tsconfig.json',
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
    globalIgnores(['dist', 'node_modules', '.wrangler', ...ignores]),
    {
      files: ['src/**/*.ts', '**/*.ts'],
      extends: [js.configs.recommended, tseslint.configs.recommended],
      rules: {
        ...sharedRules,
        ...typeCheckedRules,
        ...securityRules,
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
  ])
}
