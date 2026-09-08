# Planning Reminders

[![Version](https://vsmarketplacebadges.dev/version/darthmolen.planning-reminders.svg)](https://marketplace.visualstudio.com/items?itemName=darthmolen.planning-reminders)
[![Installs](https://vsmarketplacebadges.dev/installs/darthmolen.planning-reminders.svg)](https://marketplace.visualstudio.com/items?itemName=darthmolen.planning-reminders)
[![Downloads](https://vsmarketplacebadges.dev/downloads-short/darthmolen.planning-reminders.svg)](https://marketplace.visualstudio.com/items?itemName=darthmolen.planning-reminders)
[![CI](https://github.com/darthmolen/vscode-extensions-planning/actions/workflows/ci.yml/badge.svg)](https://github.com/darthmolen/vscode-extensions-planning/actions/workflows/ci.yml)

Surfaces `reminders-set` markdown files as a count in the status bar, beside the errors and
warnings — so the work no test can catch stops living in a directory nobody opens.

The filesystem stays the persistence layer. It stops being the interface.

## What it reads

Any directory of markdown files following the `reminders-set` skill contract: YAML frontmatter,
then an H1 instruction.

```markdown
---
kind: reminder
status: open
category: follow-up
audience: dm
subject: hardware
date: 2026-08-30
plan: gitea-lan-access_2026-08-27
---

# Make Gitea reachable from a learner's laptop

## What to do

Prove it with a throwaway repository and a real commit, over the LAN.
```

**The metadata is frontmatter, not a block of bold labels.** One copy of each fact — a `**Status:**`
line beside a `status:` field is two, and the second one is the one that goes stale. Files written
before that migration still parse, and frontmatter wins wherever both appear.

`plan:` is a **name, never a path**. A plan moves between board columns and a reminder outlives all
of it, so a stored path is wrong within days and dead exactly when someone finally follows it.

Nothing here is project-specific. The directory, the grouping field, the status vocabulary, the
closure field and the warning audience are all settings.

## What it does today

- A `$(bell) N` item in the left cluster of the status bar, showing open reminders
- Amber background when an open reminder is addressed to an audience that costs session time
- A tooltip listing what is open, grouped, with no filenames
- A **quick pick** on click — every outstanding reminder, grouped, and a jump to the file
- A **panel view** beside Terminal, with a tick box per reminder; ticking one writes the closure
  back to the markdown rather than only changing what you see
- Re-reads the directory when a file is written from anywhere — including by an agent, mid-session
- Files that do not parse are surfaced by path rather than silently skipped

The bell hides itself at zero, so a clear board costs no status bar real estate.

## Closing one

Ticking the box writes the answer back to the file — into the frontmatter, beside the status a
validator reads:

```yaml
status: done
closed: 2026-09-06 — pushed over the LAN; the key was never installed
```

The note is required, and the prompt will not accept an empty one. That is not politeness: *done*
on its own records that somebody ticked a box, which is the one fact nobody will ever need. The
clause after the dash is why the file is kept at all.

Nothing else in the body is touched — not reflowed, not reordered, and nothing deleted. A reminder
is a record of a question and its answer, and the question has to survive for the answer to mean
anything. The one exception is a file written before the closure moved into frontmatter: its old
`**Closed:**` line is removed as the field takes over, so the answer is never left in two places
with nothing to say which is current.

A reminder that turned out not to matter is dropped instead, with the reason in the same field.
Closing never deletes the file and never moves it — filing a closed reminder into `completed/` is a
separate act, done by a person.

## Works with the planning skills

The file format belongs to the [`reminders-set`](https://github.com/darthmolen/ai-plugins-and-skills/tree/main/skills/reminders-set)
skill, one of the optional `plan-*` AI skills at
[**darthmolen/ai-plugins-and-skills**](https://github.com/darthmolen/ai-plugins-and-skills/tree/main/skills).
Those skills write the board; this extension is what you see without opening a directory.

Neither needs the other. The skills work with no editor extension installed, and the extension reads
any directory of markdown that follows the contract, whether an agent or a person wrote it.

## Settings

| Setting | Default | |
|---|---|---|
| `reminders.directory` | `planning/reminders` | Workspace-root-relative |
| `reminders.groupBy` | `subject` | `subject` · `audience` · `category` · `flat` |
| `reminders.openStatus` | `open` | The status vocabulary belongs to the skill |
| `reminders.warnOnAudience` | `["learner"]` | Which audiences turn the bar amber |
| `reminders.statusBarPriority` | `49` | Higher is further left; Problems is 50 |
| `reminders.closedField` | `closed` | The frontmatter field a closure is written to |

`reminders.statusBarPriority` exists because 50 is an internal VS Code constant with no
compatibility promise, and because other extensions may claim adjacent numbers. If the count
lands somewhere unhelpful, change this rather than filing a bug.

## Developing

```bash
npm install
npm test          # vitest — parser, formatter, model, manifest wiring
npm run compile   # tsc --noEmit, then esbuild to dist/
```

`parse.ts`, `format.ts`, `model.ts` and `plan.ts` import nothing from `vscode` and must stay that way.
They are the part that has to be right, which is why they are the part that is trivially
testable. `store.ts`, `statusBar.ts` and `extension.ts` are a thin shell that decides nothing.

Press **F5** from the repository root — one level up from here — for an Extension Development
Host. Or install a build, which is what `./test-extension.sh` does end to end:

```bash
npx vsce package
code --install-extension planning-reminders-0.2.0.vsix --force
```

Requires VS Code 1.80 or later — `TreeItem.checkboxState` was finalized there, and ticking a
reminder off is the core interaction.
