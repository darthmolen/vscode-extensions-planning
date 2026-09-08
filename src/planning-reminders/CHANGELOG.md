# Change Log

All notable changes to the Planning Reminders extension.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-09-08

First release to the Visual Studio Marketplace.

### ✨ Features

- **A count in the status bar.** Open `set-reminders` files are surfaced as a bell and a number at
  the bottom left. The bell hides itself at zero, so it costs nothing on a clear board.
- **A quick pick.** Click the bell to see every outstanding reminder, grouped, and jump to one.
- **A panel view beside Terminal.** The same board as a tree, with a tick box per reminder — ticking
  it writes the closure back to the markdown file rather than only changing what you see.
- **The file format belongs to the skill, not the extension.** The directory scanned, the status
  that counts as outstanding, and the label written on close are all settings, defaulted to what the
  `set-reminders` skill specifies. Rewording a heading in the skill does not require a release here.

### 🔧 Internal

- Reads and writes the frontmatter directly, so a reminder closed from the panel is the same file
  the skill would have written.
- `parse`, `format`, `model` and `plan` import nothing from `vscode`, which is what lets them be
  tested without an editor. `test-extension.sh` fails the build if that ever stops being true.
