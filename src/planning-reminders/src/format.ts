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
  /** The frontmatter field the closure is written to. The skill owns this word, not us. */
  readonly field: string
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

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The field is configurable, so the lines that recognise it have to be built. */
const frontField = (field: string): RegExp =>
  new RegExp('^' + escapeForRegExp(field) + ':\\s*', 'i')

/**
 * The body line earlier versions wrote, before the contract moved the closure
 * into the frontmatter.
 *
 * Case-insensitive on purpose. The old spelling was `**Closed:**` and the field
 * is `closed`, so an exact match would miss every file written before the move —
 * and missing it is not harmless. The frontmatter field would be added while the
 * bold line stayed, leaving two copies of one fact and no way to tell which one
 * is current. That is precisely the drift the frontmatter rule exists to end.
 */
const legacyClosedLine = (field: string): RegExp =>
  new RegExp('^\\*\\*' + escapeForRegExp(field) + ':\\*\\*', 'i')

/**
 * Where the frontmatter block's fields live: `[first, end)`, or undefined when
 * the file has no block.
 *
 * Every lookup below is bounded by the closing fence on purpose. A body line
 * beginning `status:` or `closed:` is prose, and rewriting it would corrupt the
 * note while leaving the field that actually counts untouched — the failure
 * would show up as a reminder that stayed open after being closed, which is the
 * one bug this file must not have.
 */
function frontmatter(lines: readonly string[]): { first: number; end: number } | undefined {
  if (!FENCE.test(lines[0] ?? '')) return undefined
  const end = lines.findIndex((line, i) => i > 0 && FENCE.test(line))
  return end === -1 ? undefined : { first: 1, end }
}

/** The first line inside `block` matching `pattern`, or -1. */
const inBlock = (
  lines: readonly string[],
  block: { first: number; end: number },
  pattern: RegExp,
): number => lines.findIndex((line, i) => i >= block.first && i < block.end && pattern.test(line))

export function closeReminder(text: string, closure: Closure): string | Refused {
  const note = closure.note.trim()
  if (note === '') {
    return {
      refused:
        'a closing note is required — the answer is the reason the file is kept, and "done" on its own records only that somebody ticked a box',
    }
  }

  if (closure.field.trim() === '') {
    return { refused: 'no closed field configured — reminders.closedField is empty' }
  }

  // Windows writes CRLF and this runs on Windows. Rejoin with whatever came in,
  // or the whole file shows as changed in a diff for the sake of two lines.
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)

  /**
   * Drop any body-level closed line first.
   *
   * This does two jobs at once: re-closing corrects rather than stacks, and a
   * file written under the old contract sheds its `**Closed:**` line as the
   * frontmatter field takes over. The body's prose is untouched either way —
   * what goes is the previous location of the answer, never the question.
   */
  const legacy = legacyClosedLine(closure.field)
  const out = [...lines]
  for (let i = out.length - 1; i >= 0; i--) {
    if (!legacy.test(out[i] ?? '')) continue
    out.splice(i, 1)

    // The line usually sat between two blanks. Removing it alone would leave the
    // pair touching — a doubled blank that renders identically and shows up in
    // every migrated file's diff as a change the closure was not about.
    if ((out[i - 1] ?? '').trim() === '' && (out[i] ?? '').trim() === '') out.splice(i, 1)
  }

  const block = frontmatter(out)
  const frontAt = block === undefined ? -1 : inBlock(out, block, FRONT_STATUS)
  const statusAt = out.findIndex((line) => STATUS_LINE.test(line))

  if (frontAt === -1 && statusAt === -1) {
    return { refused: 'no status to close — this file has neither `status:` frontmatter nor a **Status:** line' }
  }

  /**
   * The body first, because it sits below the frontmatter: editing it cannot
   * move the lines the block edit is about to address, while the reverse is not
   * true.
   */
  if (statusAt !== -1) {
    out[statusAt] = `**Status:** ${closure.status}`

    // Only where there is no frontmatter to hold the field. A pre-migration file
    // has nowhere else to keep this, and refusing would strand it unclosable.
    if (block === undefined) {
      out.splice(statusAt + 1, 0, `**${closure.field}:** ${closure.date} — ${note}`)
    }
  }

  /**
   * Then the frontmatter, because that is the copy `validate:plans` checks.
   *
   * Writing only the body would leave `status: open` in the block a validator
   * reads — the board would go on reporting a closed reminder as outstanding,
   * and the next `npm run validate:plans` would be the thing that found out. A
   * file carrying both gets both rewritten; neither may drift from the other.
   */
  if (block !== undefined) {
    if (frontAt !== -1) out[frontAt] = `status: ${closure.status}`

    const record = `${closure.field}: ${closure.date} — ${note}`
    const at = inBlock(out, block, frontField(closure.field))

    // Directly under `status:`, which is where the contract shows it and where a
    // reader looking for the answer to "is this done" already is.
    if (at !== -1) out[at] = record
    else out.splice(frontAt !== -1 ? frontAt + 1 : block.end, 0, record)
  }

  return out.join(eol)
}
