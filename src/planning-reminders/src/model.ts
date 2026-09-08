/**
 * The model between the parser and the surfaces: what is open, what warns,
 * how it groups, and what the status bar says.
 *
 * Pure, like parse.ts and format.ts. The three surfaces render this; none of
 * them decides any of it.
 */

import type { Malformed, Reminder } from './parse.ts'

export interface Config {
  readonly openStatus: string
  readonly warnOnAudience: readonly string[]
  readonly groupBy: 'subject' | 'audience' | 'category' | 'flat'
  readonly closedLabel: string
}

/** A reminder that parsed, with the workspace-relative path it came from. */
export interface Entry {
  readonly path: string
  readonly reminder: Reminder
}

/** A file that did not parse. Surfaced by path, never dropped. */
export interface MalformedEntry {
  readonly path: string
  readonly malformed: Malformed
}

export interface Group {
  readonly label: string
  readonly entries: readonly Entry[]
}

export function openEntries(entries: readonly Entry[], config: Config): Entry[] {
  return entries.filter((e) => e.reminder.status === config.openStatus)
}

/**
 * A reminder addressed to the learner happens during a session, in his time, and
 * competes with the teaching. That is the one distinction SKILL.md calls
 * load-bearing, and the only thing that turns the status bar amber.
 */
export function shouldWarn(entries: readonly Entry[], config: Config): boolean {
  return openEntries(entries, config).some(
    (e) => e.reminder.audience !== undefined && config.warnOnAudience.includes(e.reminder.audience),
  )
}

export function statusBarText(count: number): string {
  return count === 0 ? '' : `$(bell) ${count}`
}

const groupKey = (reminder: Reminder, config: Config): string => {
  switch (config.groupBy) {
    case 'subject':
      return reminder.subject ?? ''
    case 'audience':
      return reminder.audience ?? ''
    case 'category':
      return reminder.category ?? ''
    case 'flat':
      return ''
  }
}

export function groupEntries(entries: readonly Entry[], config: Config): Group[] {
  const byLabel = new Map<string, Entry[]>()

  for (const e of entries) {
    // A reminder missing the grouping field is filed under the empty label
    // rather than dropped. Losing one silently is the bug that defeats the point.
    const key = groupKey(e.reminder, config)
    const bucket = byLabel.get(key)
    if (bucket) bucket.push(e)
    else byLabel.set(key, [e])
  }

  return [...byLabel.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, es]) => ({ label, entries: es }))
}

export function tooltipMarkdown(
  open: readonly Entry[],
  malformed: readonly MalformedEntry[],
  config: Config,
): string {
  const lines: string[] = []

  if (open.length === 0 && malformed.length === 0) return ''

  if (open.length > 0) {
    lines.push(`**${open.length} open reminder${open.length === 1 ? '' : 's'}**`, '')
    for (const group of groupEntries(open, config)) {
      if (group.label !== '') lines.push(`_${group.label}_`)
      for (const e of group.entries) {
        const who = e.reminder.audience === undefined ? '' : ` · ${e.reminder.audience}`
        lines.push(`- ${e.reminder.title}${who}`)
      }
      lines.push('')
    }
  }

  if (malformed.length > 0) {
    lines.push(`**${malformed.length} did not parse**`, '')
    for (const m of malformed) {
      lines.push(`- \`${m.path}\` — ${m.malformed.reason}`)
    }
  }

  return lines.join('\n').trim()
}
