# Planning Reminders

[![Version](https://vsmarketplacebadges.dev/version/darthmolen.planning-reminders.svg)](https://marketplace.visualstudio.com/items?itemName=darthmolen.planning-reminders)
[![Installs](https://vsmarketplacebadges.dev/installs/darthmolen.planning-reminders.svg)](https://marketplace.visualstudio.com/items?itemName=darthmolen.planning-reminders)
[![Downloads](https://vsmarketplacebadges.dev/downloads-short/darthmolen.planning-reminders.svg)](https://marketplace.visualstudio.com/items?itemName=darthmolen.planning-reminders)
[![CI](https://github.com/darthmolen/vscode-extensions-planning/actions/workflows/ci.yml/badge.svg)](https://github.com/darthmolen/vscode-extensions-planning/actions/workflows/ci.yml)

Surfaces `set-reminders` markdown files as a count in the status bar, beside the errors and
warnings — so the work no test can catch stops living in a directory nobody opens.

The filesystem stays the persistence layer. It stops being the interface.

## What it reads

Any directory of markdown files following the `set-reminders` contract: an H1 instruction,
then a block of bold labels.

```markdown
# Make Gitea reachable from the son's laptop

**Category:** follow-up
**Audience:** dm
**Subject:** hardware
**Raised:** 2026-08-30
**Plan:** `planning/**/feature_gitea_2026-08-27.md`
**Status:** open

## What to do

Prove it with a throwaway repository and a real commit, over the LAN.
```

Nothing here is project-specific. The directory, the grouping field, the status vocabulary and
the warning audience are all settings.

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

## Settings

| Setting | Default | |
|---|---|---|
| `reminders.directory` | `planning/reminders` | Workspace-root-relative |
| `reminders.groupBy` | `subject` | `subject` · `audience` · `category` · `flat` |
| `reminders.openStatus` | `open` | The status vocabulary belongs to the skill |
| `reminders.warnOnAudience` | `["learner"]` | Which audiences turn the bar amber |
| `reminders.statusBarPriority` | `49` | Higher is further left; Problems is 50 |
| `reminders.closedLabel` | `Closed` | Must match what the skill specifies |

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
