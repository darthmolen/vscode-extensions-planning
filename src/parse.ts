/**
 * Parsing a `set-reminders` markdown file.
 *
 * This module imports nothing from `vscode` and must keep it that way — it is the
 * part that has to be right, so it is the part that stays trivially testable.
 */

/** A reminder that parsed. `fields` holds every bold label, in file order. */
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

// Strips the backticks every real file wraps the plan glob in, so that
// `planning/<glob>/feature_x.md` in the file becomes a bare path in the model.
// (Written as a line comment on purpose: the glob contains a sequence that
// would close a block comment early, which cost one build to discover.)
const unbacktick = (value: string): string => value.replace(/^`+|`+$/g, '').trim()

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

  const titleIndex = lines.findIndex((line) => H1.test(line))
  if (titleIndex === -1) {
    return { reason: 'no H1 title — a reminder has to say what to do on its first line' }
  }
  const title = (H1.exec(lines[titleIndex] ?? '')?.[1] ?? '').trim()

  const fields = readFields(lines, titleIndex + 1)

  const status = fields.get('Status')
  if (status === undefined || status === '') {
    return { reason: 'no **Status:** label — cannot tell whether this is open or closed' }
  }

  const plan = fields.get('Plan')

  return {
    title,
    fields,
    category: fields.get('Category'),
    audience: fields.get('Audience'),
    subject: fields.get('Subject'),
    raised: fields.get('Raised'),
    plan: plan === undefined ? undefined : unbacktick(plan),
    status,
    summary: readSummary(lines),
  }
}
