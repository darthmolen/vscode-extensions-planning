import { describe, expect, test } from 'vitest'

import {
  groupEntries,
  openEntries,
  shouldWarn,
  statusBarText,
  tooltipMarkdown,
} from './model.ts'
import type { Config, Entry } from './model.ts'

const CONFIG: Config = {
  openStatus: 'open',
  warnOnAudience: ['learner'],
  groupBy: 'subject',
  closedLabel: 'Closed',
}

const entry = (
  path: string,
  title: string,
  status: string,
  audience: string,
  subject: string,
): Entry => ({
  path,
  reminder: {
    title,
    fields: new Map([
      ['Audience', audience],
      ['Subject', subject],
      ['Status', status],
    ]),
    category: 'follow-up',
    audience,
    subject,
    raised: '2026-08-30',
    plan: 'planning/x.md',
    status,
    summary: `do the thing in ${title}`,
  },
})

const ENTRIES: Entry[] = [
  entry('a.md', 'Reach Gitea', 'open', 'dm', 'hardware'),
  entry('b.md', 'Install the profile', 'open', 'dm', 'hardware'),
  entry('c.md', 'Open nine screens', 'open', 'learner', 'screens'),
  entry('d.md', 'Old thing', 'done', 'dm', 'hardware'),
  entry('e.md', 'Abandoned thing', 'dropped', 'learner', 'screens'),
]

describe('openEntries', () => {
  test('keeps only the open ones', () => {
    const open = openEntries(ENTRIES, CONFIG)

    expect(open.map((e) => e.path)).toEqual(['a.md', 'b.md', 'c.md'])
  })

  test('the open vocabulary is configuration, not a constant', () => {
    const open = openEntries(ENTRIES, { ...CONFIG, openStatus: 'dropped' })

    expect(open.map((e) => e.path)).toEqual(['e.md'])
  })
})

describe('shouldWarn', () => {
  test('warns when an open reminder needs the learner, whose time it costs', () => {
    expect(shouldWarn(ENTRIES, CONFIG)).toBe(true)
  })

  test('does not warn when the only learner reminders are closed', () => {
    const withoutOpenLearner = ENTRIES.filter((e) => e.path !== 'c.md')

    // Positive control in the same test: without it a function that always
    // returns false passes this, which is the hollow case a bare negative hides.
    expect(shouldWarn(ENTRIES, CONFIG)).toBe(true)
    expect(shouldWarn(withoutOpenLearner, CONFIG)).toBe(false)
  })

  test('the warning audience is configuration', () => {
    expect(shouldWarn(ENTRIES, { ...CONFIG, warnOnAudience: [] })).toBe(false)
    expect(shouldWarn(ENTRIES, { ...CONFIG, warnOnAudience: ['dm'] })).toBe(true)
  })
})

describe('statusBarText', () => {
  test('shows the count against a bell', () => {
    expect(statusBarText(3)).toBe('$(bell) 3')
  })

  test('is empty at zero, so a clean board costs no pixels', () => {
    expect(statusBarText(1)).toBe('$(bell) 1')
    expect(statusBarText(0)).toBe('')
  })
})

describe('groupEntries', () => {
  test('groups by subject, and the groups carry their entries', () => {
    const groups = groupEntries(openEntries(ENTRIES, CONFIG), CONFIG)

    expect(groups.map((g) => g.label)).toEqual(['hardware', 'screens'])
    expect(groups[0]?.entries.map((e) => e.path)).toEqual(['a.md', 'b.md'])
    expect(groups[1]?.entries.map((e) => e.path)).toEqual(['c.md'])
  })

  test('groups by audience when asked', () => {
    const groups = groupEntries(openEntries(ENTRIES, CONFIG), {
      ...CONFIG,
      groupBy: 'audience',
    })

    expect(groups.map((g) => g.label)).toEqual(['dm', 'learner'])
  })

  test('flat yields exactly one unlabelled group', () => {
    const groups = groupEntries(openEntries(ENTRIES, CONFIG), { ...CONFIG, groupBy: 'flat' })

    expect(groups).toHaveLength(1)
    expect(groups[0]?.label).toBe('')
    expect(groups[0]?.entries).toHaveLength(3)
  })

  test('a reminder missing the grouping field is filed, not dropped', () => {
    const noSubject = entry('f.md', 'Unfiled', 'open', 'dm', '')
    const groups = groupEntries(openEntries([...ENTRIES, noSubject], CONFIG), CONFIG)

    const all = groups.flatMap((g) => g.entries.map((e) => e.path))
    expect(all).toContain('f.md')
  })
})

describe('tooltipMarkdown', () => {
  test('lists the open reminders by title', () => {
    const md = tooltipMarkdown(openEntries(ENTRIES, CONFIG), [], CONFIG)

    expect(md).toContain('Reach Gitea')
    expect(md).toContain('Open nine screens')
  })

  test('does not list the closed ones', () => {
    const md = tooltipMarkdown(openEntries(ENTRIES, CONFIG), [], CONFIG)

    expect(md).toContain('Install the profile') // control: it lists something
    expect(md).not.toContain('Old thing')
    expect(md).not.toContain('Abandoned thing')
  })

  test('names malformed files by path, which is the only useful thing to say', () => {
    const md = tooltipMarkdown(openEntries(ENTRIES, CONFIG), [
      { path: 'planning/reminders/broken.md', malformed: { reason: 'no **Status:** label' } },
    ], CONFIG)

    expect(md).toContain('planning/reminders/broken.md')
    expect(md).toContain('no **Status:** label')
  })
})
