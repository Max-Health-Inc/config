export interface InstalledPackage {
  version: string
  dir: string
}

export interface VersionMismatch {
  name: string
  local: string
  cold: string
}

export interface ContentMismatch {
  name: string
  version: string
  local: string
  cold: string
}

export interface ParityResult {
  ok: boolean
  /** Set when the check could not run at all (no node_modules, cold install failed). */
  reason?: string
  versions: VersionMismatch[]
  contents: ContentMismatch[]
  missing: { name: string; version: string }[]
  extra: { name: string }[]
  prefix?: string
  checked?: number
  hashed?: number
}

export interface ParityOptions {
  /** Package names or `@scope/*` patterns whose contents are hashed. */
  watch?: string[]
  onLog?: (message: string) => void
}

export declare function checkDependencyParity(cwd: string, options?: ParityOptions): ParityResult
export declare function readInstalledTree(root: string): Map<string, InstalledPackage>
export declare function hashPackage(dir: string): string
export declare function coldInstall(cwd: string, options?: { onLog?: (m: string) => void }): {
  prefix: string
  status: number | null
  stderr: string
  stdout: string
}
export declare function matchesWatch(name: string, patterns: string[]): boolean
export declare const DEFAULT_WATCH: string[]

export interface PurgePlan {
  name: string
  version: string | null
  root: string
  matches: string[]
}

export declare function purgePlan(spec: string): PurgePlan
export declare function renderPurge(plan: PurgePlan): string
export declare function cacheRoot(): string
export declare function parseSpec(spec: string): { name: string; version: string | null }
