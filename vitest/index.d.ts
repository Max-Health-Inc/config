import type { UserConfig, UserConfigExport } from 'vite'

export interface CreateVitestCoverageOptions {
  /** Where the coverage report is written (default: 'test/coverage'). */
  reportsDirectory?: string
  /** Coverage reporters (default: ['text', 'html', 'lcov', 'clover']). */
  reporter?: string[]
  /** Coverage provider (default: 'v8'). */
  provider?: 'v8' | 'istanbul'
}

export interface CreateVitestReportsOptions {
  /** Test reporters (default: ['html', 'junit', 'default']). */
  reporters?: string[]
  /** Explicit per-reporter output paths; overrides `dir`. */
  outputFile?: Record<string, string>
  /** Base directory for the default report paths (default: 'test'). */
  dir?: string
}

export interface CreateVitestConfigOptions {
  /** Test globs (default: ['src/**\/*.test.ts']). */
  include?: string[]
  /** Additional excludes, merged over the shared build-artifact defaults. */
  exclude?: string[]
  /** Files run before each test file. */
  setupFiles?: string[]
  /** Set false to run test files sequentially. */
  fileParallelism?: boolean
  /** Per-test timeout in ms. */
  testTimeout?: number
  /** Per-hook timeout in ms. */
  hookTimeout?: number
  /** Test environment. */
  environment?: 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime'
  /** `true` for the shared v8 defaults, or an object to override them. Omit for none. */
  coverage?: boolean | CreateVitestCoverageOptions
  /** `true` for html+junit+default under `test/`, or an object to override. Omit for none. */
  reports?: boolean | CreateVitestReportsOptions
  /** Extra Vite-level config (plugins, resolve, …). */
  viteConfig?: UserConfig
  /** Escape hatch merged last over `test`. */
  test?: Record<string, unknown>
}

/**
 * Create a shared Vitest config for Max Health repos.
 *
 * Applies the shared defaults (test discovery under `src`, build-artifact
 * excludes) and merges in any per-package overrides. Reporter and coverage
 * output are opt-in.
 */
export declare function createVitestConfig(
  options?: CreateVitestConfigOptions,
): UserConfigExport
