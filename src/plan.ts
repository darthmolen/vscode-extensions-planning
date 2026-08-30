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

/** Board positions, best first. A plan can exist in several at once. */
const PRECEDENCE = [
  'planning/in-progress/',
  'planning/waves/',
  'planning/completed/',
  'planning/backlog/',
] as const

const rank = (path: string): number => {
  // needs-review holds copies for review, never the plan of record. Always last.
  if (path.startsWith('planning/needs-review/')) return PRECEDENCE.length + 2

  const found = PRECEDENCE.findIndex((prefix) => path.startsWith(prefix))
  if (found !== -1) return found + 1

  // planning/<file>.md -- the queue root, which outranks everything but in-progress.
  if (/^planning\/[^/]+$/.test(path)) return 0.5

  return PRECEDENCE.length + 1
}

export function planPattern(plan: string | undefined): string | undefined {
  if (plan === undefined) return undefined

  const trimmed = plan.trim().replace(/^`+|`+$/g, '').trim().replace(/^\.?\//, '')
  if (trimmed === '') return undefined

  // RelativePattern resolves against the workspace folder. A pattern that climbs
  // out of it is not a plan reference, whatever it is.
  if (trimmed.split('/').includes('..')) return undefined

  return trimmed
}

export function choosePlanPath(paths: readonly string[]): string | undefined {
  if (paths.length === 0) return undefined

  // Sort by board position, then by path, so the answer never depends on the
  // order the filesystem happened to hand them back.
  return [...paths].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))[0]
}
