/**
 * Writing a closure back into a reminder file.
 *
 * Pure, like parse.ts — string in, string out. Nothing here knows about vscode,
 * the filesystem, or when a save happens.
 *
 * The one rule this module exists to keep: change the two lines the closure is
 * about and nothing else. A reminder is a record of a question and its answer,
 * and reflowing the question to write the answer destroys half of it.
 */

export interface Closure {
  /** `done` or `dropped` — the vocabulary is the skill's, not ours. */
  readonly status: string
  /** The day it was answered, `YYYY-MM-DD`. Not the day it was raised. */
  readonly date: string
  /** What actually happened. Required: "done" alone is the one fact nobody needs. */
  readonly note: string
  /** The bold label written beneath Status. The skill owns this word, not us. */
  readonly label: string
}

/** A refusal, with the reason. Closing never half-succeeds. */
export interface Refused {
  readonly refused: string
}

/**
 * The calendar day where the person is, as `YYYY-MM-DD`.
 *
 * Not `toISOString().slice(0, 10)`, which is UTC. Closing a reminder at half
 * past eleven at night in a zone behind UTC would record tomorrow's date, and
 * SKILL.md is specific that the date is the day it was answered — by somebody
 * who is not in UTC.
 */
export function localDate(now: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

const STATUS_LINE = /^\*\*Status:\*\*/
const FENCE = /^---\s*$/
const FRONT_STATUS = /^status:\s*/
const H1 = /^#\s+\S/

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The label is configurable, so the line that recognises it has to be built. */
const closedLine = (label: string): RegExp =>
  new RegExp('^\\*\\*' + escapeForRegExp(label) + ':\\*\\*')

/**
 * The `status:` line inside the frontmatter block, or -1.
 *
 * Bounded by the closing fence on purpose. A body line beginning `status:` is
 * prose, and rewriting it would corrupt the note while leaving the field that
 * actually counts untouched — the failure would show up as a reminder that
 * stayed open after being closed, which is the one bug this file must not have.
 */
function frontmatterStatus(lines: readonly string[]): number {
  if (!FENCE.test(lines[0] ?? '')) return -1
  const end = lines.findIndex((line, i) => i > 0 && FENCE.test(line))
  if (end === -1) return -1

  const at = lines.findIndex((line, i) => i > 0 && i < end && FRONT_STATUS.test(line))
  return at
}

export function closeReminder(text: string, closure: Closure): string | Refused {
  const note = closure.note.trim()
  if (note === '') {
    return {
      refused:
        'a closing note is required — the answer is the reason the file is kept, and "done" on its own records only that somebody ticked a box',
    }
  }

  if (closure.label.trim() === '') {
    return { refused: 'no closed label configured — reminders.closedLabel is empty' }
  }

  // Windows writes CRLF and this runs on Windows. Rejoin with whatever came in,
  // or the whole file shows as changed in a diff for the sake of two lines.
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)

  // Drop any existing closed line first, so re-closing corrects rather than stacks.
  const existing = closedLine(closure.label)
  const withoutClosed = lines.filter((line) => !existing.test(line))

  /**
   * Frontmatter first, because that is the copy `validate:plans` checks.
   *
   * Writing only the bold label would leave `status: open` in the block a
   * validator reads — the board would go on reporting a closed reminder as
   * outstanding, and the next `npm run validate:plans` would be the thing that
   * found out. A file carrying both gets both rewritten; neither is allowed to
   * drift from the other.
   */
  const frontAt = frontmatterStatus(withoutClosed)
  const statusAt = withoutClosed.findIndex((line) => STATUS_LINE.test(line))

  if (frontAt === -1 && statusAt === -1) {
    return { refused: 'no status to close — this file has neither `status:` frontmatter nor a **Status:** line' }
  }

  if (frontAt !== -1) withoutClosed[frontAt] = `status: ${closure.status}`
  if (statusAt !== -1) withoutClosed[statusAt] = `**Status:** ${closure.status}`

  const line = `**${closure.label}:** ${closure.date} — ${note}`

  if (statusAt !== -1) {
    // A file that still carries the bold labels: the note joins them, with no
    // blank between, because they are one metadata block and splitting it would
    // change more of the file than the closure is about.
    withoutClosed.splice(statusAt + 1, 0, line)
    return withoutClosed.join(eol)
  }

  /**
   * A migrated file: the metadata lives in frontmatter and the body opens with
   * the H1. The note goes directly under it, separated by a blank — where a
   * reader looking for the answer finds it, and inside no section, so it belongs
   * to the reminder rather than to whichever heading came first.
   */
  const titleAt = withoutClosed.findIndex((text, i) => i > frontAt && H1.test(text))
  if (titleAt === -1) {
    return { refused: 'no H1 title to write the note under — this file is not a reminder' }
  }

  withoutClosed.splice(titleAt + 1, 0, '', line)
  return withoutClosed.join(eol)
}
