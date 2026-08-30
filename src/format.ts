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

const STATUS_LINE = /^\*\*Status:\*\*/

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The label is configurable, so the line that recognises it has to be built. */
const closedLine = (label: string): RegExp =>
  new RegExp('^\\*\\*' + escapeForRegExp(label) + ':\\*\\*')

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

  const statusAt = withoutClosed.findIndex((line) => STATUS_LINE.test(line))
  if (statusAt === -1) {
    return { refused: 'no **Status:** line to close — this file is not a reminder' }
  }

  withoutClosed[statusAt] = `**Status:** ${closure.status}`
  withoutClosed.splice(
    statusAt + 1,
    0,
    `**${closure.label}:** ${closure.date} — ${note}`,
  )

  return withoutClosed.join(eol)
}
