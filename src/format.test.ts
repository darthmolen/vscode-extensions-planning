import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import { closeReminder, localDate } from './format.ts'
import { isReminder, parseReminder } from './parse.ts'

/**
 * Normalised to LF on read. Git checks these out with whatever `core.autocrlf`
 * says, so the bytes differ between a clone and a worktree on the same machine —
 * which is how this normalisation got added. The CRLF behaviour has its own test
 * below, which builds its input explicitly rather than trusting the checkout.
 *
 * **An OPEN reminder, deliberately.** Closing a file that is already closed
 * cannot tell "set the status" apart from "left it as it was", and every
 * fixture in `completed/` carries a `**Closed:**` line that a re-close would be
 * interacting with rather than the test's own.
 */
const OPEN = readFileSync(
  join(
    import.meta.dirname,
    '__fixtures__',
    'follow-up_turtle-and-dragon-easter-egg_2026-08-30.md',
  ),
  'utf8',
).replace(/\r\n/g, '\n')

/**
 * The pre-frontmatter shape, kept as a literal.
 *
 * The corpus migrated on 2026-09-05 and no fixture carries this any more, which
 * is exactly why it is written out here: the fallback path in `closeReminder` is
 * for files written by hand or restored from an older branch, and a fallback
 * with no test is a fallback nobody knows is broken.
 */
const LEGACY = [
  "# Make Gitea reachable from the son's laptop",
  '',
  '**Category:** follow-up',
  '**Audience:** dm',
  '**Subject:** hardware',
  '**Raised:** 2026-08-30',
  '**Status:** open',
  '',
  '## What to do',
  '',
  'Prove it with a throwaway repository and a real commit.',
  '',
].join('\n')

const closed = (text: string, note = 'He found the dragon in about four minutes.') => {
  const result = closeReminder(text, { status: 'done', date: '2026-09-06', note, label: 'Closed' })
  if (typeof result !== 'string') throw new Error(`refused: ${result.refused}`)
  return result
}

describe('localDate', () => {
  test('is the calendar day where the person is, not in UTC', () => {
    // 23:30 on the 6th, in a zone six hours behind UTC, is already the 7th in
    // UTC. The skill says the date is the day it was answered, and the person
    // answering it is not in UTC.
    const lateEvening = new Date(2026, 8, 6, 23, 30, 0)

    expect(localDate(lateEvening)).toBe('2026-09-06')
    expect(lateEvening.toISOString().slice(0, 10)).not.toBe('2026-09-06')
  })

  test('pads month and day', () => {
    expect(localDate(new Date(2026, 0, 3, 12, 0, 0))).toBe('2026-01-03')
  })

  test('early morning stays on its own day', () => {
    expect(localDate(new Date(2026, 8, 6, 0, 15, 0))).toBe('2026-09-06')
  })
})

describe('closeReminder writes the field a validator reads', () => {
  test('sets the frontmatter status, which is the checked copy', () => {
    const after = closed(OPEN)

    expect(after).toContain('status: done')
    expect(after).not.toContain('status: open')
  })

  test('the frontmatter status is what makes the board agree', () => {
    // The bug this test exists for: writing only the bold label would leave
    // `status: open` in the block `validate:plans` reads, so a closed reminder
    // would go on being reported as outstanding until the next validation run.
    const after = closed(OPEN)
    const front = after.split('\n').slice(0, after.split('\n').indexOf('---', 1))

    expect(front).toContain('status: done')
  })

  test('rewrites status only inside the frontmatter, never prose that looks like it', () => {
    const withProse = OPEN.replace(
      '## What to do',
      '## What to do\n\nstatus: this line is prose and must survive\n',
    )
    const after = closed(withProse)

    expect(after).toContain('status: this line is prose and must survive')
    expect(after.split('\n').filter((l) => l === 'status: done')).toHaveLength(1)
  })

  test('writes the Closed line under the H1, where the answer is looked for', () => {
    const after = closed(OPEN, 'He found the dragon.')
    const lines = after.split('\n')
    const titleAt = lines.findIndex((l) => l.startsWith('# '))

    expect(titleAt).toBeGreaterThan(-1)
    expect(lines[titleAt + 1]).toBe('')
    expect(lines[titleAt + 2]).toBe('**Closed:** 2026-09-06 — He found the dragon.')
  })

  test('changes one line and adds two — the note and the blank above it', () => {
    const before = OPEN.split('\n')
    const after = closed(OPEN).split('\n')

    expect(after.length).toBe(before.length + 2)

    // Compare with the insertion removed, so the shift does not read as change.
    const withoutInsert = after.filter((l) => !l.startsWith('**Closed:'))
    withoutInsert.splice(withoutInsert.findIndex((l) => l.startsWith('# ')) + 1, 1)
    const differing = withoutInsert.filter((line, i) => line !== before[i])

    expect(differing).toEqual(['status: done'])
  })

  test('leaves the prose completely alone', () => {
    const after = closed(OPEN)

    expect(after).toContain('## Why it cannot be a test')
    expect(after).toContain('**And the dragon is in there.**')
    expect(after).toContain('## Why the dragon is legal at all')
  })

  test('the result parses, and parses as closed', () => {
    const after = closed(OPEN, 'Done in the kitchen.')
    const result = parseReminder(after)
    if (!isReminder(result)) throw new Error(`did not re-parse: ${result.reason}`)

    expect(result.status).toBe('done')
    expect(result.fields.get('Closed')).toBe('2026-09-06 — Done in the kitchen.')
    expect(result.title).toBe('Tell him the turtle was a robot, and let him find the dragon')
  })

  test('drops take the same path and record the reason', () => {
    const result = closeReminder(OPEN, {
      status: 'dropped',
      date: '2026-09-06',
      note: 'He worked it out on his own.',
      label: 'Closed',
    })
    if (typeof result !== 'string') throw new Error(`refused: ${result.refused}`)

    expect(result).toContain('status: dropped')
    expect(result).toContain('**Closed:** 2026-09-06 — He worked it out on his own.')
  })

  test('re-closing replaces the existing Closed line rather than stacking a second', () => {
    const once = closed(OPEN, 'First answer.')
    const twice = closed(once, 'Corrected answer.')

    const count = twice.split('\n').filter((l) => l.startsWith('**Closed:')).length
    expect(count).toBe(1)
    expect(twice).toContain('**Closed:** 2026-09-06 — Corrected answer.')
  })

  test('preserves CRLF files, because this runs on Windows', () => {
    const crlf = OPEN.replace(/\n/g, '\r\n')
    const after = closed(crlf)

    expect(after).toContain('status: done\r\n')
    expect(after).toContain('\r\n**Closed:** 2026-09-06 —')
    expect(after.split('\n').every((l, i, a) => i === a.length - 1 || l.endsWith('\r'))).toBe(
      true,
    )
  })
})

describe('the pre-frontmatter shape still closes', () => {
  test('sets the bold Status label when that is all the file has', () => {
    const after = closed(LEGACY)

    expect(after).toContain('**Status:** done')
    expect(after).not.toContain('**Status:** open')
  })

  test('keeps the note beside Status, so the metadata block stays one block', () => {
    const after = closed(LEGACY, 'The key was never installed.')
    const lines = after.split('\n')
    const statusAt = lines.findIndex((l) => l.startsWith('**Status:**'))

    expect(lines[statusAt + 1]).toBe('**Closed:** 2026-09-06 — The key was never installed.')
  })

  test('a file carrying both shapes gets both rewritten, so neither drifts', () => {
    const both = ['---', 'kind: reminder', 'status: open', '---', '', ...LEGACY.split('\n')].join(
      '\n',
    )
    const after = closed(both)

    expect(after).toContain('status: done')
    expect(after).toContain('**Status:** done')
    expect(after).not.toContain('status: open')
    expect(after).not.toContain('**Status:** open')
  })
})

describe('closeReminder refuses rather than half-succeeding', () => {
  test('refuses an empty note, because the note is the point of keeping the file', () => {
    const result = closeReminder(OPEN, {
      status: 'done',
      date: '2026-09-06',
      note: '   ',
      label: 'Closed',
    })

    expect(typeof result).not.toBe('string')
    expect(typeof result === 'string' ? '' : result.refused).toMatch(/note/i)
  })

  test('refuses a file with no status of either shape', () => {
    const result = closeReminder('# No metadata here\n\nJust prose.\n', {
      status: 'done',
      date: '2026-09-06',
      note: 'x',
      label: 'Closed',
    })

    expect(typeof result).not.toBe('string')
    expect(typeof result === 'string' ? '' : result.refused).toMatch(/status/i)
  })

  test('honours a configured label, so reminders.closedLabel is not decorative', () => {
    const result = closeReminder(OPEN, {
      status: 'done',
      date: '2026-09-06',
      note: 'Answered.',
      label: 'Resolved',
    })
    if (typeof result !== 'string') throw new Error(`refused: ${result.refused}`)

    expect(result).toContain('**Resolved:** 2026-09-06 — Answered.')
    expect(result).not.toContain('**Closed:**')
  })

  test('re-closing under a configured label replaces that label, not a hardcoded one', () => {
    const once = closeReminder(OPEN, {
      status: 'done',
      date: '2026-09-06',
      note: 'First.',
      label: 'Resolved',
    })
    if (typeof once !== 'string') throw new Error('refused')

    const twice = closeReminder(once, {
      status: 'done',
      date: '2026-09-07',
      note: 'Corrected.',
      label: 'Resolved',
    })
    if (typeof twice !== 'string') throw new Error('refused')

    expect(twice.split('\n').filter((l) => l.startsWith('**Resolved:')).length).toBe(1)
    expect(twice).toContain('**Resolved:** 2026-09-07 — Corrected.')
  })

  test('refuses an empty label rather than writing ****:**', () => {
    const result = closeReminder(OPEN, {
      status: 'done',
      date: '2026-09-06',
      note: 'x',
      label: '  ',
    })

    expect(typeof result).not.toBe('string')
    expect(typeof result === 'string' ? '' : result.refused).toMatch(/label/i)
  })
})
