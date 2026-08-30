import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import { closeReminder } from './format.ts'
import { isReminder, parseReminder } from './parse.ts'

/**
 * Normalised to LF on read. Git checks these out with whatever `core.autocrlf`
 * says, so the bytes differ between a clone and a worktree on the same machine —
 * which is how this normalisation got added. The CRLF behaviour has its own test
 * below, which builds its input explicitly rather than trusting the checkout.
 */
const GITEA = readFileSync(
  join(
    import.meta.dirname,
    '__fixtures__',
    'follow-up_gitea-reachable-from-his-laptop_2026-08-30.md',
  ),
  'utf8',
).replace(/\r\n/g, '\n')

const closed = (text: string, note = 'Pushed from his laptop over the LAN.') => {
  const result = closeReminder(text, { status: 'done', date: '2026-09-06', note, label: 'Closed' })
  if (typeof result !== 'string') throw new Error(`refused: ${result.refused}`)
  return result
}

describe('closeReminder', () => {
  test('sets the status to done', () => {
    const after = closed(GITEA)

    expect(after).toContain('**Status:** done')
    expect(after).not.toContain('**Status:** open')
  })

  test('writes the Closed line directly beneath Status, as SKILL.md specifies', () => {
    const after = closed(GITEA, 'The key was never installed.')
    const lines = after.split('\n')
    const statusAt = lines.findIndex((l) => l.startsWith('**Status:**'))

    expect(statusAt).toBeGreaterThan(-1)
    expect(lines[statusAt + 1]).toBe(
      '**Closed:** 2026-09-06 — The key was never installed.',
    )
  })

  test('changes exactly one line and adds exactly one', () => {
    const before = GITEA.split('\n')
    const after = closed(GITEA).split('\n')

    expect(after.length).toBe(before.length + 1)

    // Compare with the inserted line removed, so the shift does not read as change.
    const withoutInsert = after.filter((l) => !l.startsWith('**Closed:'))
    const differing = withoutInsert.filter((line, i) => line !== before[i])

    expect(differing).toEqual(['**Status:** done'])
  })

  test('leaves the prose completely alone', () => {
    const after = closed(GITEA)

    expect(after).toContain('## Why it cannot be a test')
    expect(after).toContain('**Works:** two API verifiers unblock')
    expect(after).toContain('`infra/smoke.sh` already creates a repository')
  })

  test('the result parses, and parses as closed', () => {
    const after = closed(GITEA, 'Done on the LAN.')
    const result = parseReminder(after)
    if (!isReminder(result)) throw new Error(`did not re-parse: ${result.reason}`)

    expect(result.status).toBe('done')
    expect(result.fields.get('Closed')).toBe('2026-09-06 — Done on the LAN.')
    expect(result.title).toBe(
      "Make Gitea reachable from the son's laptop, and push to it from there",
    )
  })

  test('refuses an empty note, because the note is the point of keeping the file', () => {
    const result = closeReminder(GITEA, { status: 'done', date: '2026-09-06', note: '   ', label: 'Closed' })

    expect(typeof result).not.toBe('string')
    expect(typeof result === 'string' ? '' : result.refused).toMatch(/note/i)
  })

  test('drops take the same path and record the reason', () => {
    const result = closeReminder(GITEA, {
      status: 'dropped',
      date: '2026-09-06',
      note: 'The laptop was replaced; this no longer applies.',
      label: 'Closed',
    })
    if (typeof result !== 'string') throw new Error(`refused: ${result.refused}`)

    expect(result).toContain('**Status:** dropped')
    expect(result).toContain(
      '**Closed:** 2026-09-06 — The laptop was replaced; this no longer applies.',
    )
  })

  test('re-closing replaces the existing Closed line rather than stacking a second', () => {
    const once = closed(GITEA, 'First answer.')
    const twice = closed(once, 'Corrected answer.')

    const count = twice.split('\n').filter((l) => l.startsWith('**Closed:')).length
    expect(count).toBe(1)
    expect(twice).toContain('**Closed:** 2026-09-06 — Corrected answer.')
  })

  test('refuses a file it cannot find a Status line in', () => {
    const result = closeReminder('# No metadata here\n\nJust prose.\n', {
      status: 'done',
      date: '2026-09-06',
      note: 'x',
      label: 'Closed',
    })

    expect(typeof result).not.toBe('string')
    expect(typeof result === 'string' ? '' : result.refused).toMatch(/Status/)
  })

  test('honours a configured label, so reminders.closedLabel is not decorative', () => {
    const result = closeReminder(GITEA, {
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
    const once = closeReminder(GITEA, {
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
    const result = closeReminder(GITEA, {
      status: 'done',
      date: '2026-09-06',
      note: 'x',
      label: '  ',
    })

    expect(typeof result).not.toBe('string')
    expect(typeof result === 'string' ? '' : result.refused).toMatch(/label/i)
  })

  test('preserves CRLF files, because this runs on Windows', () => {
    const crlf = GITEA.replace(/\n/g, '\r\n')
    const after = closed(crlf)

    expect(after).toContain('**Status:** done\r\n**Closed:** 2026-09-06 —')
    expect(after.split('\n').every((l, i, a) => i === a.length - 1 || l.endsWith('\r'))).toBe(
      true,
    )
  })
})
