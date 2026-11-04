import { defineConfig } from 'vitest/config'

/** Paths that are never test sources, merged under any caller-supplied excludes. */
const BASE_EXCLUDE = ['node_modules/**', 'dist/**', 'out/**', '**/coverage/**']

/** Shared Vitest config; options and defaults are documented in index.d.ts. */
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
