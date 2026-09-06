/**
 * Resolving a reminder's plan reference.
 *
 * Pure: no vscode, no filesystem. The caller does the globbing and hands the
 * matches back here to be chosen between.
 *
 * **The reference is a name, and the name is the identity.** A plan moves --
 * planning/ to in-progress/ to completed/, and sometimes back -- and a reminder
 * routinely outlives all of it, so a stored path rots into a dead link exactly
 * when somebody goes looking. The corpus settled this on 2026-09-04: a
 * cross-reference names a document and says nothing about where it lives, which
 * is why `plan: world-shim_2026-08-28` keeps working through every move.
 *
 * A value that still looks like a glob is honoured as one. Reminders written
 * before the migration carry `planning/**\/feature_x_2026-08-28.md`, and the
 * board ranking below is what picks between the copies such a glob matches.
 */

/**
 * Board positions, best first. A plan can exist in several at once.
 *
 * Written as an ordered list of predicates rather than a prefix array with
 * arithmetic on the index. The previous version gave the queue root 0.5 to slot
 * it "just after in-progress", and 0.5 sorts *before* 1 -- so the queue root
 * beat in-progress, which is the opposite of what its own comment claimed. Two
 * tests covered half the ordering each and never put both in the same list.
 */
const BOARD: readonly ((path: string) => boolean)[] = [
  (p) => p.startsWith('planning/in-progress/'),
  // The queue root: planning/<file>.md, nothing deeper.
  (p) => /^planning\/[^/]+$/.test(p),
  (p) => p.startsWith('planning/waves/'),
  (p) => p.startsWith('planning/completed/'),
  (p) => p.startsWith('planning/backlog/'),
]

const UNRANKED = BOARD.length
// needs-review holds copies for review, never the plan of record. Always last.
const NEEDS_REVIEW = BOARD.length + 1

const rank = (path: string): number => {
  if (path.startsWith('planning/needs-review/')) return NEEDS_REVIEW

  const found = BOARD.findIndex((matches) => matches(path))
  return found === -1 ? UNRANKED : found
}

/**
 * A workspace-root-relative path, or undefined if the value cannot be one.
 *
 * Shared by the plan glob and `reminders.directory`, because both are strings a
 * person can type and both end up as a RelativePattern against the workspace
 * folder. Neither may climb out of it.
 */
export function workspaceRelative(value: string | undefined): string | undefined {
  if (value === undefined) return undefined

  const trimmed = value
    .trim()
    .replace(/^`+|`+$/g, '')
    .trim()
    .replace(/^\.?\//, '')
    .replace(/\/+$/, '')

  if (trimmed === '') return undefined
  if (trimmed.split('/').includes('..')) return undefined

  return trimmed
}

/** Only these change with a document's status, so only these are stripped from an identity. */
const STATUS_PREFIXES: readonly string[] = ['feature', 'promoted', 'closed']

/**
 * A document's identity: its basename, minus a status prefix, minus `.md`.
 *
 * Mirrors `pyquest/scripts/plans.ts`. The two have to agree about what a name
 * means, or a reference the validator calls resolved would open nothing here.
 */
export function identity(path: string): string {
  const base = (path.split('/').pop() ?? '').replace(/\.md$/, '')
  const at = base.indexOf('_')
  if (at === -1) return base
  return STATUS_PREFIXES.includes(base.slice(0, at)) ? base.slice(at + 1) : base
}

/** A reference that names a document, rather than saying where one lives. */
export const isName = (value: string): boolean =>
  !value.includes('/') && !value.includes('*') && !value.endsWith('.md')

/**
 * What to glob for a reference.
 *
 * A name has no directory in it, so every planning document is a candidate and
 * `choosePlanPath` narrows by identity. A legacy glob is used as written.
 */
export function planPattern(value: string | undefined): string | undefined {
  const reference = workspaceRelative(value)
  if (reference === undefined) return undefined
  return isName(reference) ? 'planning/**/*.md' : reference
}

/** `reminders.directory`, falling back when the configured value is unusable. */
export function safeDirectory(value: string | undefined, fallback: string): string {
  return workspaceRelative(value) ?? fallback
}

/**
 * The best match for `reference` among `paths`.
 *
 * When the reference is a name, the candidates are first narrowed to documents
 * whose identity is that name — the glob handed in was every planning document,
 * because a name deliberately says nothing about where the thing lives.
 *
 * The board ranking then breaks any remaining tie. It still earns its place: a
 * name identifies one document in a clean corpus, but a stub and the plan it
 * became can share one, and opening the plan rather than the stub it grew from
 * is the more useful answer.
 */
export function choosePlanPath(
  paths: readonly string[],
  reference?: string,
): string | undefined {
  const candidates =
    reference !== undefined && isName(reference)
      ? paths.filter((path) => identity(path) === reference)
      : [...paths]

  if (candidates.length === 0) return undefined

  // Sort by board position, then by path, so the answer never depends on the
  // order the filesystem happened to hand them back.
  return candidates.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0]
}
