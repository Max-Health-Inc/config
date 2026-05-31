import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * Shared ESLint flat config for React + TypeScript projects.
 *
 * @param {object} [options]
 * @param {string} [options.tsconfigRootDir] - Root dir for tsconfig resolution (default: caller's __dirname)
 * @param {string} [options.appTsconfig] - Path to app tsconfig (default: './tsconfig.app.json')
 * @param {string} [options.nodeTsconfig] - Path to node tsconfig (default: './tsconfig.node.json')
 * @param {string[]} [options.ignores] - Additional ignore patterns
 */
export function createReactConfig(options = {}) {
  const {
    tsconfigRootDir,
    appTsconfig = './tsconfig.app.json',
    nodeTsconfig = './tsconfig.node.json',
    ignores = [],
  } = options

  const sharedRules = {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports', disallowTypeAnnotations: false }],
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
  }

  return defineConfig(
    { ignores: ['dist/**', 'node_modules/**', '**/lib/api-client/**', ...ignores] },
    {
      files: ['src/**/*.{ts,tsx}'],
      extends: [js.configs.recommended, tseslint.configs.recommended],
      plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      rules: {
        ...sharedRules,
        ...reactHooks.configs.recommended.rules,
        'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      },
      languageOptions: {
        ecmaVersion: 2022,
        globals: globals.browser,
        parserOptions: {
          tsconfigRootDir,
          project: appTsconfig,
        },
      },
    },
    {
      files: ['vite.config.ts'],
      extends: [js.configs.recommended, tseslint.configs.recommended],
      languageOptions: {
        ecmaVersion: 2022,
        globals: globals.node,
        parserOptions: {
          tsconfigRootDir,
          project: nodeTsconfig,
        },
      },
    },
  )
}
