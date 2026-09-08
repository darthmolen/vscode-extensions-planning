import { describe, expect, test } from 'vitest'

import { choosePlanPath, identity, isName, planPattern, safeDirectory } from './plan.ts'

describe('identity — a document is its name, and the directory is its status', () => {
  test('strips the prefix that changes with status', () => {
    expect(identity('planning/backlog/promoted_seed-a-test-household_2026-08-30.md')).toBe(
      'seed-a-test-household_2026-08-30',
    )
    expect(identity('planning/completed/feature_world-shim_2026-08-28.md')).toBe(
      'world-shim_2026-08-28',
    )
  })

  test('keeps a reminder category, which is not a status', () => {
    expect(identity('planning/reminders/verify_boss-2-cold-clone_2026-09-01.md')).toBe(
      'verify_boss-2-cold-clone_2026-09-01',
    )
  })

  test('agrees with pyquest/scripts/plans.ts, or a checked reference opens nothing', () => {
    // Both sides strip exactly `feature_`, `promoted_` and `closed_`. If they
    // disagree, `validate:plans` calls a reference resolved and the button here
    // reports no plan — the worst pairing, because nothing looks broken.
    expect(identity('planning/feature_a_2026-09-03.md')).toBe(
      identity('planning/backlog/promoted_a_2026-09-03.md'),
    )
  })
})

describe('isName', () => {
  test('a name has no directory, no glob and no extension', () => {
    expect(isName('world-shim_2026-08-28')).toBe(true)
  })

  test('a legacy glob is not a name', () => {
    expect(isName('planning/**/feature_world-shim_2026-08-28.md')).toBe(false)
    expect(isName('planning/completed/feature_world-shim_2026-08-28.md')).toBe(false)
  })
})

describe('planPattern', () => {
  test('a name globs the whole board, because a name says nothing about where', () => {
    expect(planPattern('world-shim_2026-08-28')).toBe('planning/**/*.md')
  })

  test('strips backticks off a name too', () => {
    expect(planPattern('`world-shim_2026-08-28`')).toBe('planning/**/*.md')
  })

  test('passes the glob through — it is already a workspace-relative pattern', () => {
    expect(planPattern('planning/**/feature_world-shim_2026-08-28.md')).toBe(
      'planning/**/feature_world-shim_2026-08-28.md',
    )
  })

  test('strips backticks the skill wraps the reference in', () => {
    expect(planPattern('`planning/**/feature_spa_2026-08-28-v2.md`')).toBe(
      'planning/**/feature_spa_2026-08-28-v2.md',
    )
  })

  test('a reminder with no plan has nothing to open', () => {
    expect(planPattern('planning/x.md')).toBe('planning/x.md') // control
    expect(planPattern(undefined)).toBeUndefined()
    expect(planPattern('')).toBeUndefined()
    expect(planPattern('   ')).toBeUndefined()
  })

  test('a leading slash or ./ is trimmed, because RelativePattern wants neither', () => {
    expect(planPattern('/planning/x.md')).toBe('planning/x.md')
    expect(planPattern('./planning/x.md')).toBe('planning/x.md')
  })

  test('refuses to escape the workspace', () => {
    expect(planPattern('planning/x.md')).toBe('planning/x.md') // control
    expect(planPattern('../../etc/passwd')).toBeUndefined()
  })
})

describe('safeDirectory', () => {
  test('a normal setting passes through', () => {
    expect(safeDirectory('planning/reminders', 'fallback')).toBe('planning/reminders')
  })

  test('a traversal setting falls back rather than escaping the workspace', () => {
    expect(safeDirectory('planning/reminders', 'fallback')).toBe('planning/reminders') // control
    expect(safeDirectory('../../etc', 'fallback')).toBe('fallback')
    expect(safeDirectory('planning/../../etc', 'fallback')).toBe('fallback')
  })

  test('an empty or whitespace setting falls back', () => {
    expect(safeDirectory('planning/reminders', 'fallback')).toBe('planning/reminders') // control
    expect(safeDirectory('', 'fallback')).toBe('fallback')
    expect(safeDirectory('   ', 'fallback')).toBe('fallback')
    expect(safeDirectory(undefined, 'fallback')).toBe('fallback')
  })

  test('a trailing slash is trimmed, so the glob does not double up', () => {
    expect(safeDirectory('planning/reminders/', 'fallback')).toBe('planning/reminders')
  })
})

describe('choosePlanPath', () => {
  test('nothing matched means nothing to open', () => {
    expect(choosePlanPath(['planning/x.md'])).toBe('planning/x.md') // control
    expect(choosePlanPath([])).toBeUndefined()
  })

  test('one match is the answer', () => {
    expect(choosePlanPath(['planning/completed/feature_x_2026-08-01.md'])).toBe(
      'planning/completed/feature_x_2026-08-01.md',
    )
  })

  test('in-progress wins, because that is the copy being worked on', () => {
    const chosen = choosePlanPath([
      'planning/completed/feature_x_2026-08-01.md',
      'planning/in-progress/feature_x_2026-08-01.md',
      'planning/backlog/feature_x_2026-08-01.md',
    ])

    expect(chosen).toBe('planning/in-progress/feature_x_2026-08-01.md')
  })

  test('in-progress beats the queue root when both copies exist', () => {
    // The case the precedence logic exists for, and the one neither of the two
    // tests below covered: each named half the ordering and they never met.
    const chosen = choosePlanPath([
      'planning/feature_x_2026-08-01.md',
      'planning/in-progress/feature_x_2026-08-01.md',
    ])

    expect(chosen).toBe('planning/in-progress/feature_x_2026-08-01.md')
  })

  test('the whole board orders in one list', () => {
    const chosen = choosePlanPath([
      'planning/needs-review/completed/2026-08-29-x.md',
      'planning/backlog/feature_x_2026-08-01.md',
      'planning/completed/feature_x_2026-08-01.md',
      'planning/waves/wave-3_x_2026-08-29.md',
      'planning/feature_x_2026-08-01.md',
      'planning/in-progress/feature_x_2026-08-01.md',
    ])

    expect(chosen).toBe('planning/in-progress/feature_x_2026-08-01.md')
  })

  test('the queue root beats completed and backlog', () => {
    const chosen = choosePlanPath([
      'planning/backlog/feature_x_2026-08-01.md',
      'planning/feature_x_2026-08-01.md',
      'planning/completed/feature_x_2026-08-01.md',
    ])

    expect(chosen).toBe('planning/feature_x_2026-08-01.md')
  })

  test('needs-review copies lose to every real board position', () => {
    const chosen = choosePlanPath([
      'planning/needs-review/completed/2026-08-29-x.md',
      'planning/completed/feature_x_2026-08-01.md',
    ])

    expect(chosen).toBe('planning/completed/feature_x_2026-08-01.md')
  })

  test('ties break deterministically rather than by filesystem order', () => {
    const forwards = choosePlanPath([
      'planning/completed/feature_b_2026-08-01.md',
      'planning/completed/feature_a_2026-08-01.md',
    ])
    const backwards = choosePlanPath([
      'planning/completed/feature_a_2026-08-01.md',
      'planning/completed/feature_b_2026-08-01.md',
    ])

    expect(forwards).toBe(backwards)
    expect(forwards).toBe('planning/completed/feature_a_2026-08-01.md')
  })
})

describe('choosePlanPath narrows by name before ranking the board', () => {
  const BOARD = [
    'planning/backlog/promoted_seed-a-test-household_2026-08-30.md',
    'planning/completed/feature_seed-a-test-household_2026-08-31.md',
    'planning/completed/feature_world-shim_2026-08-28.md',
    'planning/reminders/verify_boss-2-cold-clone_2026-09-01.md',
  ]

  test('picks the one document carrying the name', () => {
    expect(choosePlanPath(BOARD, 'world-shim_2026-08-28')).toBe(
      'planning/completed/feature_world-shim_2026-08-28.md',
    )
  })

  test('a name nothing carries opens nothing, rather than the first file on the board', () => {
    // The glob handed in is every planning document, so without the narrowing
    // this would cheerfully open an unrelated plan.
    expect(choosePlanPath(BOARD, 'a-plan-that-does-not-exist_2026-01-01')).toBeUndefined()
  })

  test('the plan wins over the stub it grew from, when both carry the name', () => {
    const collision = [
      'planning/backlog/promoted_a-submission_2026-09-03.md',
      'planning/feature_a-submission_2026-09-03.md',
    ]
    expect(choosePlanPath(collision, 'a-submission_2026-09-03')).toBe(
      'planning/feature_a-submission_2026-09-03.md',
    )
  })

  test('a legacy glob reference still ranks the whole match set, as before', () => {
    const matches = [
      'planning/completed/feature_world-shim_2026-08-28.md',
      'planning/in-progress/feature_world-shim_2026-08-28.md',
    ]
    expect(choosePlanPath(matches, 'planning/**/feature_world-shim_2026-08-28.md')).toBe(
      'planning/in-progress/feature_world-shim_2026-08-28.md',
    )
  })

  test('no reference at all falls back to ranking, so old callers still work', () => {
    // Best board position among these is `completed/` (the backlog stub ranks
    // below it), and the tie between the two completed plans breaks on path.
    expect(choosePlanPath(BOARD)).toBe(
      'planning/completed/feature_seed-a-test-household_2026-08-31.md',
    )
  })
})
