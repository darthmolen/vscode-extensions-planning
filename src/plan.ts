/**
 * Resolving a reminder's plan reference.
 *
 * Pure: no vscode, no filesystem. The caller does the globbing and hands the
 * matches back here to be chosen between.
 *
 * The reference is a glob on purpose. A plan moves -- planning/ to in-progress/
 * to completed/, and sometimes back -- and a reminder routinely outlives all of
 * it. A fixed path rots into a dead link exactly when somebody goes looking.
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

/** The plan reference, as a pattern to glob with. */
export const planPattern = workspaceRelative

/** `reminders.directory`, falling back when the configured value is unusable. */
export function safeDirectory(value: string | undefined, fallback: string): string {
  return workspaceRelative(value) ?? fallback
}

export function choosePlanPath(paths: readonly string[]): string | undefined {
  if (paths.length === 0) return undefined

  // Sort by board position, then by path, so the answer never depends on the
  // order the filesystem happened to hand them back.
  return [...paths].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0]
}
