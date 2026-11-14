import { posix } from 'node:path'
import { defineConfig } from 'vitest/config'

/** Paths that are never test sources, merged under any caller-supplied excludes. */
const BASE_EXCLUDE = ['node_modules/**', 'dist/**', 'out/**', '**/coverage/**']

/** Vitest 4 reads the HTML report's `outputFile`, vitest 5 its `outputDir`; each ignores the other. */
function htmlReporter(file) {
  return ['html', { outputFile: file, outputDir: posix.dirname(file) }]
}

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
    const { html = `${dir}/html/index.html`, ...outputFile } = overrides.outputFile ?? {
      junit: `${dir}/test-reports/junits.xml`,
    }
    testConfig.reporters = (overrides.reporters ?? ['html', 'junit', 'default']).map((reporter) =>
      reporter === 'html' ? htmlReporter(html) : reporter,
    )
    testConfig.outputFile = outputFile
  }

  return defineConfig({
    ...viteConfig,
    test: { ...testConfig, ...test },
  })
}
