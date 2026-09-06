/**
 * Parsing a `set-reminders` markdown file.
 *
 * This module imports nothing from `vscode` and must keep it that way — it is the
 * part that has to be right, so it is the part that stays trivially testable.
 *
 * **Frontmatter is the source of truth, and the bold labels are a fallback.**
 * The planning corpus moved its metadata into YAML frontmatter on 2026-09-05, and
 * `pyquest/scripts/validate-plans.ts` checks that block against a closed
 * vocabulary — so the frontmatter is the copy something actually verifies, and a
 * bold `**Status:**` line beside it is the second source of truth that the
 * migration existed to remove.
 *
 * The fallback stays anyway, and not out of politeness: a reminder written by
 * hand from memory, or one restored from an older branch, should appear in the
 * list rather than be reported malformed. Reading both is what makes the
 * extension useful during the window where both shapes exist.
 */

/** A reminder that parsed. `fields` holds every bold label in the body, in file order. */
export interface Reminder {
  readonly title: string
  readonly fields: ReadonlyMap<string, string>
  readonly category: string | undefined
  readonly audience: string | undefined
  readonly subject: string | undefined
  readonly raised: string | undefined
  readonly plan: string | undefined
  readonly status: string
  readonly summary: string
}

/** A file in the reminders directory that did not parse. Never silently dropped. */
export interface Malformed {
  readonly reason: string
}

export const isReminder = (value: Reminder | Malformed): value is Reminder =>
  'title' in value

const H1 = /^#\s+(.*\S)\s*$/
const H2 = /^##\s+/
const LABEL = /^\*\*([A-Za-z][A-Za-z -]*):\*\*\s*(.*)$/
const FENCE = /^---\s*$/

// Strips the backticks a hand-written file may still wrap the plan reference in.
// (Written as a line comment on purpose: a glob contains a sequence that would
// close a block comment early, which cost one build to discover.)
const unbacktick = (value: string): string => value.replace(/^`+|`+$/g, '').trim()

/**
 * The frontmatter block, as a flat map, plus where the body starts.
 *
 * A deliberately small subset of YAML — `key: value`, one per line, no nesting
 * and no lists — mirroring `pyquest/scripts/plans.ts`. The two have to agree
 * about what a reminder says, and the way to make them agree is for both to
 * accept exactly the same small thing.
 */
export function readFrontmatter(lines: readonly string[]): {
  front: Map<string, string>
  body: number
} {
  const front = new Map<string, string>()
  if (!FENCE.test(lines[0] ?? '')) return { front, body: 0 }

  const end = lines.findIndex((line, i) => i > 0 && FENCE.test(line))
  if (end === -1) return { front, body: 0 }

  for (const line of lines.slice(1, end)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    const at = line.indexOf(':')
    if (at === -1) continue
    const key = line.slice(0, at).trim()
    const value = line
      .slice(at + 1)
      .replace(/\s+#.*$/, '')
      .trim()
      .replace(/^["']|["']$/g, '')
    if (key !== '') front.set(key, value)
  }

  return { front, body: end + 1 }
}

/**
 * The metadata block is what sits between the H1 and the first H2 — and the bound
 * matters. The body carries bold leads of its own (`**Works:**`, `**Below 60:**`)
 * and reading those as metadata would fill `fields` with prose.
 */
function readFields(lines: readonly string[], from: number): Map<string, string> {
  const fields = new Map<string, string>()

  for (let i = from; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (H2.test(line)) break

    const match = LABEL.exec(line)
    if (match) {
      const [, label, value] = match
      if (label !== undefined && value !== undefined) fields.set(label, value.trim())
    }
  }

  return fields
}

/** The first paragraph under `## What to do`, unwrapped onto one line. */
function readSummary(lines: readonly string[]): string {
  const start = lines.findIndex((line) => /^##\s+What to do\s*$/i.test(line))
  if (start === -1) return ''

  const paragraph: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim()
    if (line === '') {
      if (paragraph.length > 0) break
      continue
    }
    if (H2.test(line)) break
    paragraph.push(line)
  }

  return paragraph.join(' ')
}

export function parseReminder(text: string): Reminder | Malformed {
  const lines = text.split(/\r?\n/)
  const { front, body } = readFrontmatter(lines)

  const titleIndex = lines.findIndex((line, i) => i >= body && H1.test(line))
  if (titleIndex === -1) {
    return { reason: 'no H1 title — a reminder has to say what to do on its first line' }
  }
  const title = (H1.exec(lines[titleIndex] ?? '')?.[1] ?? '').trim()

  const fields = readFields(lines, titleIndex + 1)

  /** Frontmatter wins, because frontmatter is the copy `validate:plans` checks. */
  const pick = (key: string, label: string): string | undefined => {
    const value = front.get(key) ?? fields.get(label)
    return value === undefined || value === '' ? undefined : value
  }

  const status = pick('status', 'Status')
  if (status === undefined) {
    return {
      reason:
        'no status — add `status:` to the frontmatter (or a **Status:** label), or nothing can tell whether this is open or closed',
    }
  }

  const plan = pick('plan', 'Plan')

  return {
    title,
    fields,
    category: pick('category', 'Category'),
    audience: pick('audience', 'Audience'),
    subject: pick('subject', 'Subject'),
    // `date:` in frontmatter is the day it was raised — the same fact the body's
    // **Raised:** label carried, under the name the rest of the corpus uses.
    raised: pick('date', 'Raised'),
    plan: plan === undefined ? undefined : unbacktick(plan),
    status,
    summary: readSummary(lines),
  }
}
