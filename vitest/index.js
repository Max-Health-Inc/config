import { defineConfig } from 'vitest/config'

/** Paths that are never test sources, merged under any caller-supplied excludes. */
const BASE_EXCLUDE = ['node_modules/**', 'dist/**', 'out/**', '**/coverage/**']

/**
 * Create a shared Vitest config.
 *
 * Applies the shared defaults (test discovery under `src`, the build-artifact
 * excludes above) and merges in any per-package overrides. Reporter and coverage
 * output are opt-in: a leaf package that only needs `vitest run` should not have
 * to name an html/junit destination, and a repo root that publishes reports gets
 * one consistent layout under `test/` instead of re-deriving it.
 *
 * @param {object} [options]
 * @param {string[]} [options.include] - Test globs (default: ['src/**\/*.test.ts'])
 * @param {string[]} [options.exclude] - Additional excludes, merged over the shared defaults
 * @param {string[]} [options.setupFiles] - Files run before each test file
 * @param {boolean} [options.fileParallelism] - Set false to run test files sequentially
 * @param {number} [options.testTimeout] - Per-test timeout in ms
 * @param {number} [options.hookTimeout] - Per-hook timeout in ms
 * @param {'node'|'jsdom'|'happy-dom'|'edge-runtime'} [options.environment] - Test environment
 * @param {boolean|{reportsDirectory?: string, reporter?: string[], provider?: 'v8'|'istanbul'}} [options.coverage]
 *   true for the shared v8 defaults, or an object to override them. Omit for none.
 * @param {boolean|{reporters?: string[], outputFile?: Record<string, string>, dir?: string}} [options.reports]
 *   true for html+junit+default under `test/`, or an object to override. Omit for none.
 * @param {import('vite').UserConfig} [options.viteConfig] - Extra Vite-level config (plugins, resolve, …)
 * @param {Record<string, unknown>} [options.test] - Escape hatch merged last over `test`
 */
export function createVitestConfig(options = {}) {
  const {
    include = ['src/**/*.test.ts'],
    exclude = [],
    setupFiles,
    fileParallelism,
    testTimeout,
    hookTimeout,
    environment,
    coverage,
    reports,
    viteConfig = {},
    test = {},
  } = options

  /** @type {Record<string, unknown>} */
  const testConfig = {
    include,
    exclude: [...BASE_EXCLUDE, ...exclude],
  }

  // Only set keys the caller asked for — writing `undefined` would override a
  // vitest default with nothing and is not the same as leaving it alone.
  if (setupFiles !== undefined) testConfig.setupFiles = setupFiles
  if (fileParallelism !== undefined) testConfig.fileParallelism = fileParallelism
  if (testTimeout !== undefined) testConfig.testTimeout = testTimeout
  if (hookTimeout !== undefined) testConfig.hookTimeout = hookTimeout
  if (environment !== undefined) testConfig.environment = environment

  if (coverage) {
    const overrides = coverage === true ? {} : coverage
    const dir = overrides.reportsDirectory ?? 'test/coverage'
    testConfig.coverage = {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'clover'],
      ...overrides,
      reportsDirectory: dir,
    }
  }

  if (reports) {
    const overrides = reports === true ? {} : reports
    const dir = overrides.dir ?? 'test'
    testConfig.reporters = overrides.reporters ?? ['html', 'junit', 'default']
    testConfig.outputFile = overrides.outputFile ?? {
      html: `${dir}/html/index.html`,
      junit: `${dir}/test-reports/junits.xml`,
    }
  }

  return defineConfig({
    ...viteConfig,
    test: { ...testConfig, ...test },
  })
}
