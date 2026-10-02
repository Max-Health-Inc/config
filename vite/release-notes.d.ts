import type { ChangelogEntry, CommitMessage } from './release.js'

export declare const DEFAULT_NOTES_MODEL: string
/** Workers AI's OpenAI-compatible chat completions URL for a Cloudflare account. */
export declare function workersAiEndpoint(accountId: string): string

/** The tag annotation for a release: a title line, then one `- Label: text` line per note. */
export declare function formatReleaseNotes(version: string, notes: readonly ChangelogEntry[]): string
/** The notes in a tag annotation written by {@link formatReleaseNotes}; anything else is ignored. */
export declare function parseReleaseNotes(message: string): ChangelogEntry[]
/** False for text carrying code, paths, hashes or links. */
export declare function isPublicText(text: string): boolean
/** The commits as model input, newest first and capped in size. */
export declare function commitDigest(commits: readonly CommitMessage[]): string
export declare function releaseNotesPrompt(product: string, commits: readonly CommitMessage[]): Array<{ role: 'system' | 'user'; content: string }>
/** The model's JSON answer as notes, keeping only well-formed ones a user may read. */
export declare function notesFromModel(content: string): ChangelogEntry[]

export interface NotesClient {
  token: string
  /** OpenAI-compatible chat completions URL. */
  endpoint: string
  model?: string
  fetch?: typeof fetch
  /** Give up after this long (default 2 minutes); a timeout yields no notes. */
  timeoutMs?: number
}

/** Never throws: an unreachable model or an unusable answer yields no notes and an error string. */
export declare function generateReleaseNotes(
  product: string,
  commits: readonly CommitMessage[],
  client: NotesClient,
): Promise<{ notes: ChangelogEntry[]; error: string | null }>
/** The notes as a Markdown list, for a GitHub release body. */
export declare function notesMarkdown(notes: readonly ChangelogEntry[]): string
/** A GitHub release body: the public notes the app shows, then the full internal changelog (private repos only). */
export declare function releaseBody(notes: readonly ChangelogEntry[], commitsByType: ReadonlyMap<string, readonly string[]>): string
