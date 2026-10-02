export type ReleaseChannel = 'dev' | 'beta' | 'RELEASE'

export interface BuildCommit {
  sha: string
  committedAt: Date
}

export type ChangeKind = 'feature' | 'fix' | 'performance'

export interface ChangelogEntry {
  kind: ChangeKind
  text: string
  breaking: boolean
}

export interface ChangelogRelease {
  version: string
  /** ISO commit time of the release tag; null for the not yet released section. */
  date: string | null
  /** True for the section listing what a pre-release build has on top of the latest tag. */
  unreleased: boolean
  entries: ChangelogEntry[]
}

export interface CommitMessage {
  subject: string
  body: string
}

/** `0.0.9-alpha.123.abc` -> `0.0.9`. */
export declare function baseVersion(packageVersion: string): string
/** The latest tag's patch bumped, or package.json's base when it was set ahead deliberately. */
export declare function nextReleaseVersion(packageBase: string, latestTag: string | null): string
/** The deploy job's setting wins, then the branch (`main` -> RELEASE, `test` -> beta), else dev. */
export declare function releaseChannel(explicit: string | undefined, branch: string | undefined): ReleaseChannel
/** `0.1.0+202610010957.3d19d83` for a release, `0.1.1-beta.202610011142.abc1234` otherwise. */
export declare function formatBuildVersion(version: string, channel: ReleaseChannel, commit: BuildCommit | null): string
/** A Conventional Commit as a changelog line, or null for what users do not see. */
export declare function changelogEntry(commit: CommitMessage | string): ChangelogEntry | null
/** Every commit subject worth an internal record, keyed by Conventional Commit type (`other` without one). */
export declare function commitsByType(commits: readonly CommitMessage[]): Map<string, string[]>
export declare function changelogEntries(commits: Array<CommitMessage | string>, limit?: number): ChangelogEntry[]
/** The commit a build stands for; a no-op promotion merge stands for the commit it promoted. */
export declare function buildCommit(channel: ReleaseChannel): BuildCommit | null
/** The plain release version for HEAD: its own tag if released, else the next one. */
export declare function resolveReleaseVersion(packageVersion: string): string
export declare function resolveBuildVersion(packageVersion: string, env: Record<string, string | undefined>): string
/** Release tags, newest first; with `ref`, only those pointing at it. */
export declare function releaseTags(ref?: string): string[]
export declare function commitsIn(range: string): CommitMessage[]
/** Commits since the latest release tag that is not on HEAD itself. */
export declare function unreleasedCommits(): CommitMessage[]
/** Newest first: one section per release tag carrying public notes, plus raw unreleased commits on request. */
export declare function buildChangelog(packageVersion: string, options?: { maxReleases?: number; includeUnreleased?: boolean }): ChangelogRelease[]
export declare function readPackageVersion(root: string): string
/** Vite `define` entries: `__APP_VERSION__` and `__APP_CHANGELOG__`, both JSON. */
export declare function releaseDefines(root: string, env: Record<string, string | undefined>): {
  __APP_VERSION__: string
  __APP_CHANGELOG__: string
}
