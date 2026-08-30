import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

import { isReminder, parseReminder } from './parse.ts'

const FIXTURES = join(import.meta.dirname, '__fixtures__')

const readFixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8')

/** A minimal well-formed reminder. Tests mutate one thing about it at a time. */
const WELL_FORMED = [
  '# Make Gitea reachable from the son\'s laptop',
  '',
  '**Category:** follow-up',
  '**Audience:** dm',
  '**Subject:** hardware',
  '**Raised:** 2026-08-30',
  '**Plan:** `planning/**/feature_gitea_2026-08-27.md`',
  '**Status:** open',
  '',
  '## What to do',
  '',
  'Prove it with a throwaway repository and a real commit, from his laptop,',
  'over the LAN.',
  '',
  'A second paragraph that is not the summary.',
  '',
  '## Why it cannot be a test',
  '',
  'Because the wire is on the other side of the wire.',
  '',
].join('\n')

describe('parseReminder', () => {
  test('takes the title from the H1, not the filename', () => {
    const result = parseReminder(WELL_FORMED)

    expect(isReminder(result)).toBe(true)
    expect(isReminder(result) && result.title).toBe(
      "Make Gitea reachable from the son's laptop",
    )
  })

  test('reads every bold label in the metadata block', () => {
    const result = parseReminder(WELL_FORMED)
    if (!isReminder(result)) throw new Error(`expected a reminder, got: ${result.reason}`)

    expect(result.category).toBe('follow-up')
    expect(result.audience).toBe('dm')
    expect(result.subject).toBe('hardware')
    expect(result.raised).toBe('2026-08-30')
    expect(result.status).toBe('open')
  })

  test('strips the backticks the real files wrap the plan glob in', () => {
    const result = parseReminder(WELL_FORMED)
    if (!isReminder(result)) throw new Error(`expected a reminder, got: ${result.reason}`)

    expect(result.plan).toBe('planning/**/feature_gitea_2026-08-27.md')
  })

  test('summary is the first paragraph of What to do, not the whole section', () => {
    const result = parseReminder(WELL_FORMED)
    if (!isReminder(result)) throw new Error(`expected a reminder, got: ${result.reason}`)

    expect(result.summary).toBe(
      'Prove it with a throwaway repository and a real commit, from his laptop, over the LAN.',
    )
  })

  test('keeps labels it does not know about, so write-back cannot lose them', () => {
    const withExtra = WELL_FORMED.replace(
      '**Status:** open',
      '**Wave:** 3\n**Status:** open',
    )

    const result = parseReminder(withExtra)
    if (!isReminder(result)) throw new Error(`expected a reminder, got: ${result.reason}`)

    expect(result.fields.get('Wave')).toBe('3')
  })

  test('bold leads in the body are prose, not metadata', () => {
    const withBodyLead = [
      WELL_FORMED,
      '## What it changes',
      '',
      '**Works:** two API verifiers unblock.',
      '',
      '**Does not work:** find out now rather than in week six.',
      '',
    ].join('\n')

    const result = parseReminder(withBodyLead)
    if (!isReminder(result)) throw new Error(`expected a reminder, got: ${result.reason}`)

    expect(result.fields.has('Works')).toBe(false)
    expect(result.fields.has('Does not work')).toBe(false)
    expect(result.status).toBe('open')
  })

  test('a file with no Status is malformed, and says which label is missing', () => {
    const noStatus = WELL_FORMED.replace('**Status:** open\n', '')

    const result = parseReminder(noStatus)

    expect(isReminder(result)).toBe(false)
    expect(isReminder(result) ? '' : result.reason).toMatch(/Status/)
  })

  test('a file with no H1 is malformed rather than silently titleless', () => {
    const noTitle = WELL_FORMED.split('\n').slice(1).join('\n')

    const result = parseReminder(noTitle)

    expect(isReminder(result)).toBe(false)
    expect(isReminder(result) ? '' : result.reason).toMatch(/title|H1/i)
  })
})

describe('the reminders this repository actually has', () => {
  const names = readdirSync(FIXTURES).filter((n) => n.endsWith('.md'))

  test('there are fixtures to read', () => {
    expect(names.length).toBeGreaterThanOrEqual(4)
  })

  test.each(names)('%s parses, with every documented field present', (name) => {
    const result = parseReminder(readFixture(name))
    if (!isReminder(result)) throw new Error(`${name} did not parse: ${result.reason}`)

    expect(result.title.length).toBeGreaterThan(0)
    expect(result.category).toBeTruthy()
    expect(result.audience).toBeTruthy()
    expect(result.subject).toBeTruthy()
    expect(result.raised).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.status).toBeTruthy()
    expect(result.summary.length).toBeGreaterThan(0)
  })

  test.each(names)('%s carries no body prose in its metadata block', (name) => {
    const result = parseReminder(readFixture(name))
    if (!isReminder(result)) throw new Error(`${name} did not parse: ${result.reason}`)

    // Every real reminder has bold leads in "What it changes" — `**Works:**`,
    // `**Does not work:**`. They read exactly like metadata and must not become it.
    const documented = ['Category', 'Audience', 'Subject', 'Raised', 'Plan', 'Status', 'Closed']
    expect([...result.fields.keys()].filter((k) => !documented.includes(k))).toEqual([])
  })

  test.each(names)('%s has a plan glob with no backticks left on it', (name) => {
    const result = parseReminder(readFixture(name))
    if (!isReminder(result)) throw new Error(`${name} did not parse: ${result.reason}`)

    expect(result.plan).toBeDefined()
    expect(result.plan).not.toContain('`')
    expect(result.plan).toMatch(/^planning\//)
  })
})
