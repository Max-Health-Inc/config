/**
 * Public release notes. Commit messages are written for engineers, so at release time an LLM
 * rewrites them into plain-language notes stored in the release tag's annotation, which builds
 * read offline from git.
 */

/** @typedef {import('./release.js').ChangelogEntry} ChangelogEntry */
/** @typedef {import('./release.js').ChangeKind} ChangeKind */
/** @typedef {import('./release.js').CommitMessage} CommitMessage */

/** @type {Record<ChangeKind, string>} */
const LABELS = { feature: 'New', fix: 'Fixed', performance: 'Faster' }
const NOTE_LINE = /^- (New|Fixed|Faster)( \(breaking\))?: (.+)$/

const MAX_NOTES = 8
const MAX_NOTE_LENGTH = 160
const MAX_BODY_CHARS = 600
const MAX_DIGEST_CHARS = 24_000
const DEFAULT_TIMEOUT_MS = 120_000

export const DEFAULT_NOTES_MODEL = '@cf/zai-org/glm-5.3-flash'

/** Workers AI's OpenAI-compatible chat completions URL for a Cloudflare account. @param {string} accountId */
export function workersAiEndpoint(accountId) {
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/v1/chat/completions`
}

/** Code, paths, hashes and links: never part of a note a user reads. */
const INTERNAL = [
  /[@`\\<>{}[\]|]/,
  /https?:/i,
  /\b[0-9a-f]{7,40}\b/,
  /\b[\w-]+\.(?:ts|tsx|js|mjs|json|ya?ml|toml|sql|py)\b/i,
  /\b[a-z]+[A-Z]\w*\b/,
  /\b\w+_\w+\b/,
  /\w\/\w/,
]

/**
 * The tag annotation for a release: a title line, then one `- Label: text` line per note.
 * @param {string} version @param {readonly ChangelogEntry[]} notes
 */
export function formatReleaseNotes(version, notes) {
  const lines = notes.map((note) => `- ${LABELS[note.kind]}${note.breaking ? ' (breaking)' : ''}: ${note.text}`)
  return [`v${version}`, '', ...lines].join('\n').trimEnd() + '\n'
}

/** @param {string} label @returns {ChangeKind | null} */
function kindOf(label) {
  for (const [kind, text] of Object.entries(LABELS)) {
    if (text === label && (kind === 'feature' || kind === 'fix' || kind === 'performance')) return kind
  }
  return null
}

/**
 * The notes in a tag annotation written by {@link formatReleaseNotes}; anything else is ignored.
 * @param {string} message @returns {ChangelogEntry[]}
 */
export function parseReleaseNotes(message) {
  /** @type {ChangelogEntry[]} */
  const notes = []
  for (const line of message.split('\n')) {
    const match = NOTE_LINE.exec(line.trim())
    const kind = match ? kindOf(match[1]) : null
    if (match && kind) notes.push({ kind, text: match[3].trim(), breaking: match[2] !== undefined })
  }
  return notes
}

/** @param {string} text */
export function isPublicText(text) {
  return text.length > 0 && text.length <= MAX_NOTE_LENGTH && !INTERNAL.some((pattern) => pattern.test(text))
}

const INSTRUCTIONS = `You write the public changelog of a software product for the people who use it. You receive the internal commit messages of one release and return what changed for those users.

Rules:
- Only changes a user can notice in the product. Leave out anything only operators, administrators or developers would see.
- Plain language, one short sentence per note, at most ${MAX_NOTE_LENGTH} characters, no trailing period needed.
- Never name libraries, packages, frameworks, dependency versions, code identifiers, files, internal services, hosts, infrastructure, vendors, payment or identity providers, CI, tests, security mechanisms, vulnerabilities, prices, plans or business terms.
- Never invent anything the commits do not say. Merge related commits into one note.
- At most ${MAX_NOTES} notes, the most noticeable first.
- kind is "feature" for something new, "fix" for something that now works as it should, "performance" for something faster or lighter.

Answer with JSON only: {"notes":[{"kind":"feature"|"fix"|"performance","text":"..."}]}. If nothing in the release is visible to users, answer {"notes":[]}.`

/** Newest first, within a size the model accepts; a long first release keeps its latest commits. @param {readonly CommitMessage[]} commits */
export function commitDigest(commits) {
  const blocks = []
  let size = 0
  for (const { subject, body } of commits) {
    const block = body ? `${subject}\n${body.slice(0, MAX_BODY_CHARS)}` : subject
    if (blocks.length > 0 && size + block.length > MAX_DIGEST_CHARS) break
    blocks.push(block)
    size += block.length + 7
  }
  return blocks.join('\n\n---\n\n')
}

/**
 * The chat messages that ask for a release's public notes.
 * @param {string} product @param {readonly CommitMessage[]} commits
 */
export function releaseNotesPrompt(product, commits) {
  return [
    { role: 'system', content: INSTRUCTIONS },
    { role: 'user', content: `Product: ${product}\n\nCommits:\n\n${commitDigest(commits)}` },
  ]
}

/** @param {unknown} value @param {string} key @returns {unknown} */
function field(value, key) {
  return typeof value === 'object' && value !== null && key in value ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined
}

/**
 * The model's answer as notes, keeping only well-formed ones a user may read.
 * @param {string} content @returns {ChangelogEntry[]}
 */
export function notesFromModel(content) {
  /** @type {unknown} */
  let parsed
  try {
    parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch {
    return []
  }
  const raw = field(parsed, 'notes')
  if (!Array.isArray(raw)) return []
  /** @type {ChangelogEntry[]} */
  const notes = []
  const seen = new Set()
  for (const item of raw) {
    const kind = field(item, 'kind')
    const text = field(item, 'text')
    if ((kind !== 'feature' && kind !== 'fix' && kind !== 'performance') || typeof text !== 'string') continue
    const clean = text.trim().replace(/\.$/, '')
    if (!isPublicText(clean) || seen.has(clean)) continue
    seen.add(clean)
    notes.push({ kind, text: clean, breaking: false })
    if (notes.length >= MAX_NOTES) break
  }
  return notes
}

/**
 * @typedef {object} NotesClient
 * @property {string} token
 * @property {string} endpoint OpenAI-compatible chat completions URL
 * @property {string} [model]
 * @property {typeof fetch} [fetch]
 * @property {number} [timeoutMs] give up after this long; a release never waits on its changelog
 */

/**
 * Ask the model for a release's public notes. An unreachable model or an unusable answer yields
 * no notes rather than an error, so a release is never blocked by its changelog.
 * @param {string} product @param {readonly CommitMessage[]} commits @param {NotesClient} client
 * @returns {Promise<{ notes: ChangelogEntry[], error: string | null }>}
 */
export async function generateReleaseNotes(product, commits, client) {
  if (commits.length === 0) return { notes: [], error: null }
  const send = client.fetch ?? fetch
  try {
    const response = await send(client.endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(client.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      headers: { authorization: `Bearer ${client.token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: client.model ?? DEFAULT_NOTES_MODEL,
        messages: releaseNotesPrompt(product, commits),
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    })
    if (!response.ok) return { notes: [], error: `model answered ${response.status}` }
    const content = field(field(field(field(await response.json(), 'choices'), '0'), 'message'), 'content')
    return typeof content === 'string' ? { notes: notesFromModel(content), error: null } : { notes: [], error: 'model returned no content' }
  } catch (err) {
    return { notes: [], error: err instanceof Error ? err.message : String(err) }
  }
}

/** The notes as a Markdown list, for a GitHub release body. @param {readonly ChangelogEntry[]} notes */
export function notesMarkdown(notes) {
  return notes.map((note) => `- **${LABELS[note.kind]}:** ${note.text}`).join('\n')
}

/** @type {ReadonlyArray<[string, string]>} */
const SECTIONS = [
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
  ['refactor', 'Refactoring'],
  ['build', 'Build'],
  ['ci', 'CI'],
  ['test', 'Tests'],
  ['docs', 'Docs'],
  ['chore', 'Chores'],
]

/**
 * A GitHub release body: the public notes the app shows, then the full internal changelog. Only for
 * a private repository, since the internal part is the raw commit record.
 * @param {readonly ChangelogEntry[]} notes @param {ReadonlyMap<string, readonly string[]>} commitsByType
 */
export function releaseBody(notes, commitsByType) {
  const known = new Map(SECTIONS)
  const order = [...SECTIONS.map(([type]) => type), ...[...commitsByType.keys()].filter((type) => !known.has(type) && type !== 'other'), 'other']
  const sections = order.flatMap((type) => {
    const subjects = commitsByType.get(type)
    if (!subjects?.length) return []
    return [`### ${known.get(type) ?? (type === 'other' ? 'Other' : type)}\n\n${subjects.map((subject) => `- ${subject}`).join('\n')}`]
  })
  return [
    '## Shown in the app',
    notes.length > 0 ? notesMarkdown(notes) : '_Nothing in this release is visible to users._',
    '## Changes',
    sections.length > 0 ? sections.join('\n\n') : '_No commits since the previous release._',
  ].join('\n\n')
}
