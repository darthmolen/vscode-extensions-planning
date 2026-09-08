# Change Log

All notable changes to the Planning Reminders extension.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-09-08

Follows the `reminders-set` contract, which moved a closure out of the body and into the
frontmatter.

### ⚠️ Breaking

- **`reminders.closedLabel` is now `reminders.closedField`**, defaulting to `closed` rather than
  `Closed`. If you had set the old key, set the new one. The rename is not cosmetic: the setting
  used to name a bold label written into the body, and now names a frontmatter field — the old name
  described a place the closure no longer goes.

### ✨ Features

- **A closure is written to the frontmatter**, beside the status a validator reads:

  ```yaml
  status: done
  closed: 2026-09-06 — pushed over the LAN; the key was never installed
  ```

  Previously the answer went into the body as `**Closed:** …` while only the status went into the
  block. One fact, one copy, in the place something actually checks.

- **Files written under the old contract migrate when they are closed.** The old `**Closed:**` line
  is removed as the field takes over. The match is deliberately case-insensitive: the old spelling
  was capitalised and the field is not, so an exact match would miss every file already on disk and
  leave the answer in two places with nothing to say which one is current.

- A file with no frontmatter at all still closes the way it always did, keeping the note beside its
  `**Status:**` line. Refusing would leave a pre-migration file unclosable.

### 🔧 Internal

- The fixtures carry `closed:` in their frontmatter, and the guard asserting the corpus keeps its
  metadata in one place now covers `Closed` too. It was the last fact still kept in the body, and
  the one most likely to be left there — a closed reminder is rarely reopened, so a stale copy sits
  unread until somebody trusts it.
- The README documents frontmatter as the shape, including that `plan:` is a name and never a path.
  The parser still accepts the pre-migration bold labels; frontmatter wins wherever both appear.
- `vitest.config.ts` is now `.mts`, which is what Vite wants for ESM config and silences the loader
  warning the file introduced in 0.2.0.

## [0.2.0] - 2026-09-08

First release to the Visual Studio Marketplace.

### ✨ Features

- **A count in the status bar.** Open `reminders-set` files are surfaced as a bell and a number at
  the bottom left. The bell hides itself at zero, so it costs nothing on a clear board.
- **A quick pick.** Click the bell to see every outstanding reminder, grouped, and jump to one.
- **A panel view beside Terminal.** The same board as a tree, with a tick box per reminder — ticking
  it writes the closure back to the markdown file rather than only changing what you see.
- **The file format belongs to the skill, not the extension.** The directory scanned, the status
  that counts as outstanding, and the label written on close are all settings, defaulted to what the
  `reminders-set` skill specifies. Rewording a heading in the skill does not require a release here.

### 🔧 Internal

- Reads and writes the frontmatter directly, so a reminder closed from the panel is the same file
  the skill would have written.
- `parse`, `format`, `model` and `plan` import nothing from `vscode`, which is what lets them be
  tested without an editor. `test-extension.sh` fails the build if that ever stops being true.
