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
}

/** A refusal, with the reason. Closing never half-succeeds. */
export interface Refused {
  readonly refused: string
}

const STATUS_LINE = /^\*\*Status:\*\*/
const CLOSED_LINE = /^\*\*Closed:\*\*/

export function closeReminder(text: string, closure: Closure): string | Refused {
  const note = closure.note.trim()
  if (note === '') {
    return {
      refused:
        'a closing note is required — the answer is the reason the file is kept, and "done" on its own records only that somebody ticked a box',
    }
  }

  // Windows writes CRLF and this runs on Windows. Rejoin with whatever came in,
  // or the whole file shows as changed in a diff for the sake of two lines.
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)

  // Drop any existing Closed line first, so re-closing corrects rather than stacks.
  const withoutClosed = lines.filter((line) => !CLOSED_LINE.test(line))

  const statusAt = withoutClosed.findIndex((line) => STATUS_LINE.test(line))
  if (statusAt === -1) {
    return { refused: 'no **Status:** line to close — this file is not a reminder' }
  }

  withoutClosed[statusAt] = `**Status:** ${closure.status}`
  withoutClosed.splice(statusAt + 1, 0, `**Closed:** ${closure.date} — ${note}`)

  return withoutClosed.join(eol)
}
