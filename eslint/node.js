import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'
import { sharedRules, typeCheckedRules as _typeCheckedRules, securityRules as _securityRules } from './rules.js'

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

  return defineConfig([
    globalIgnores(['dist', 'node_modules', '.wrangler', ...ignores]),
    {
      files: ['src/**/*.ts', '**/*.ts'],
      extends: [js.configs.recommended, tseslint.configs.recommended],
      rules: {
        ...sharedRules,
        ...(typeChecked ? _typeCheckedRules : {}),
        ...(security ? _securityRules : {}),
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
