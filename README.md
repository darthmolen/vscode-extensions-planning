# VS Code Extensions for the Planning Kanban

Editor surfaces for the planning workflow that the
[`ai-plugins-and-skills`](https://github.com/darthmolen/ai-plugins-and-skills) skills write to
disk. The skills own the file format; these extensions own what you see without opening a
directory.

## What is here

| Extension | Where | What it does |
|---|---|---|
| **Reminders** | [`src/planning-reminders/`](src/planning-reminders/) | Shows open `set-reminders` files as a count in the status bar, a quick pick, and a panel view — and closes them from the tick box |

One directory per extension under `src/`, each a self-contained npm package with its own
`package.json`, its own build and its own tests. The root stays free of any one extension's
toolchain, so a second extension does not have to negotiate with the first.

## Working on one

Every command runs from the extension's own directory, not from here:

```bash
cd src/planning-reminders
npm install
npm test          # vitest
npm run compile   # tsc --noEmit, then esbuild to dist/
./test-extension.sh   # verify, package, install into the running VS Code
```

Press **F5** from this repository root for an Extension Development Host — the launch
configuration in [`.vscode/launch.json`](.vscode/launch.json) points at `src/planning-reminders` and
compiles it first. The host opens this repository, which has no `planning/reminders/` of its
own, so [`.vscode/settings.json`](.vscode/settings.json) aims the extension at the test
fixtures instead. Without that you get an empty board, and **an empty board and a broken
extension look identical** — the bell hides itself at zero.

## Where the file format is defined

The Reminders extension parses and writes files produced by the `set-reminders` skill, which
lives in `ai-plugins-and-skills`. **The vocabulary belongs to the skill, not to the
extension** — the status that counts as outstanding, the label written when a reminder closes,
and the directory the files live in are all settings, defaulted to what the skill specifies. An
extension that hard-coded them would have to ship a release every time the skill reworded a
heading.

## Publishing

Releases are tag-triggered, and **the tag names the extension**:

```bash
git tag planning-reminders-v0.2.0
git push origin planning-reminders-v0.2.0
```

[`.github/workflows/release.yml`](.github/workflows/release.yml) reads the package out of the tag
prefix, checks that `src/<package>/package.json` agrees on the version, then builds, tests,
packages and publishes it. A second extension needs a tag prefix and a directory, not a second
workflow — which is why the tags are prefixed at all.

The Marketplace PAT is an Azure DevOps token scoped to *Marketplace → Manage*. It belongs to the
publisher account rather than to any one extension, so **one secret publishes every package here**.
Put it in a gitignored `.env` as `MarketplaceAdoPat` (see [`.env.example`](.env.example)) and push
it into CI without printing it:

```bash
./scripts/set-vsce-secret.sh
```

The end-to-end runbook — bumping from the last published version, the lock-file gate, the review
poll, the two STOP gates — is [`.claude/skills/publish-release`](.claude/skills/publish-release/SKILL.md).

## Adding an extension

1. A new directory under `src/`, holding a complete npm package.
2. A row in the table above.
3. A launch configuration and a compile task in `.vscode/`, named after the extension.

Nothing at the root gets a dependency. That is the whole point of the layout.
