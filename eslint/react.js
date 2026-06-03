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
