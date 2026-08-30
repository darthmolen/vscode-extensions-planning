import { describe, expect, test } from 'vitest'

import { choosePlanPath, planPattern, safeDirectory } from './plan.ts'

describe('planPattern', () => {
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
