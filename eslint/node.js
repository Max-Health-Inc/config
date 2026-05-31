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
 * @param {string[]} [options.ignores] - Additional ignore patterns
 */
export function createNodeConfig(options = {}) {
  const {
    tsconfigRootDir,
    tsconfig = './tsconfig.json',
    ignores = [],
  } = options

  const sharedRules = {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false },
    ],
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
  }

  return defineConfig([
    globalIgnores(['dist', 'node_modules', ...ignores]),
    {
      files: ['src/**/*.ts', '**/*.ts'],
      extends: [js.configs.recommended, tseslint.configs.recommended],
      rules: {
        ...sharedRules,
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      },
      languageOptions: {
        ecmaVersion: 'latest',
        globals: globals.node,
        parserOptions: {
          tsconfigRootDir,
          project: tsconfig,
        },
      },
    },
  ])
}
