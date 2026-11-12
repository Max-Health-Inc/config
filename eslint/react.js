import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { createBaseConfig, languageOptions, recommended } from './compose.js'
import { a11yConfig } from './a11y.js'

/**
 * Shared ESLint flat config for React + TypeScript projects.
 *
 * @param {import('./compose.js').SharedOptions & { appTsconfig?: string, nodeTsconfig?: string, a11y?: object }} [options]
 *   `appTsconfig` defaults to './tsconfig.app.json', `nodeTsconfig` to './tsconfig.node.json';
 *   `a11y` takes the eslint-plugin-jsx-a11y-x module and turns on its recommended rules, taught the
 *   shared-ui components; `testGlobs` defaults to top-level `test/` + colocated `*.test.*`.
 */
export function createReactConfig(options = {}) {
  const {
    tsconfigRootDir,
    appTsconfig = './tsconfig.app.json',
    nodeTsconfig = './tsconfig.node.json',
    ignores = [],
    testGlobs = ['test/**/*.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    a11y,
  } = options

  return createBaseConfig({
    ...options,
    ignores: ['**/lib/api-client/**', ...ignores],
    files: ['src/**/*.{ts,tsx}'],
    testGlobs,
    globals: globals.browser,
    testGlobals: { ...globals.browser, ...globals.node },
    project: appTsconfig,
    presets: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    accessibility: a11y ? a11yConfig(a11y) : undefined,
    extraBlocks: [
      {
        files: ['vite.config.ts'],
        extends: recommended,
        languageOptions: languageOptions({ globals: globals.node, tsconfigRootDir, project: nodeTsconfig }),
      },
    ],
  })
}
