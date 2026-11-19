// SPDX-License-Identifier: MIT

export interface DocCheckUserConfig {
  /**
   * Directory the doc examples are compiled from, relative to the repo root.
   *
   * Must be a directory the examples' imports resolve from. Compiling elsewhere
   * and bridging with tsconfig `paths` breaks React's own types, which makes tsx
   * examples pass while checking nothing. Default `"."`.
   */
  workspace?: string
  /** Extra path segments to skip, on top of node_modules, dist, build, coverage, … */
  skipSegments?: string[]
  /** Extra repo-relative path prefixes to skip, e.g. `"backend/public"`. */
  skipPrefixes?: string[]
  /** Coverage floor. Use it as a ratchet: raise it as packages get documented. */
  minCoverage?: number | null
  /**
   * Modules the docs use without importing, mapped to the repo-relative source file
   * their export names are read from, e.g. `{ "my-lib": "src/index.ts" }`. Each
   * example imports every export it does not bind itself. The specifier must
   * resolve from `workspace`, so a library checking its own name builds first.
   */
  inject?: Record<string, string>
}

export interface DocCheckConfig extends Required<Omit<DocCheckUserConfig, 'skipSegments'>> {
  skipSegments: Set<string>
  /** The consuming repo's parsed package.json. */
  pkg: Record<string, unknown>
}

export interface Finding {
  file: string
  line: number
  rule: string
  message: string
}

export interface CoverageReport {
  overall: number
  total: number
  documented: number
  packages: { package: string; total: number; documented: number; coverage: number; missing: string[] }[]
}

/** Read the `doccheck` key from the repo's package.json and apply defaults. */
export function loadConfig(root?: string): DocCheckConfig

/** Every markdown file the repo owns, as repo-relative POSIX paths. */
export function markdownFiles(config: DocCheckConfig, root?: string): string[]

/** Badges and in-repo links. Resolves to a process exit code. */
export function checkBadges(
  config: DocCheckConfig,
  opts?: { online?: boolean; json?: boolean },
): Promise<number>

/** Typecheck fenced ts/tsx examples. Returns a process exit code. */
export function checkDocExamples(config: DocCheckConfig, opts?: { keep?: boolean }): number

/** Exported symbol names reachable from a TypeScript entry file, following `export * from`. */
export function exportsOf(entry: string): Set<string>

/** API-docs coverage. Returns a process exit code. */
export function checkDocsCoverage(
  config: DocCheckConfig,
  opts?: { list?: boolean; json?: boolean; min?: number | null },
): number
