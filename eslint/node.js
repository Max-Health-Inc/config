import globals from 'globals'
import { createBaseConfig } from './compose.js'

/**
 * Shared ESLint flat config for Node.js + TypeScript projects.
 *
 * @param {import('./compose.js').SharedOptions & { tsconfig?: string, files?: string[] }} [options]
 *   `tsconfig` defaults to './tsconfig.json'; `files` to every `.ts` file (add `.tsx` for server-side JSX);
 *   `testGlobs` to top-level `test/` + colocated `*.test.ts`.
 */
export function createNodeConfig(options = {}) {
  const {
    tsconfig = './tsconfig.json',
    files = ['src/**/*.ts', '**/*.ts'],
    ignores = [],
    testGlobs = ['test/**/*.ts', 'src/**/*.test.ts'],
  } = options

  return createBaseConfig({
    ...options,
    ignores: ['.wrangler', ...ignores],
    files,
    testGlobs,
    globals: globals.node,
    project: tsconfig,
  })
}
