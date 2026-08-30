# Press F5 and look at where the reminders count actually lands in the status bar

**Category:** verify
**Audience:** dm
**Subject:** tooling
**Raised:** 2026-08-30
**Plan:** `planning/**/feature_reminders-vscode-extension_2026-08-30.md`
**Status:** open

## What to do

Open the repository in VS Code, press **F5**, and pick *Run Reminders extension*. In the
Extension Development Host that opens, look at the bottom-left of the status bar.

Three things to check, in order of how much they matter:

1. **A `$(bell) N` item is there at all**, and N matches the number of open reminders —
   `grep -l "Status:\*\* open" planning/reminders/*.md | wc -l` is the answer it should agree
   with. Open a file with a real error first so the Problems indicator shows a non-zero count;
   an empty Problems item is easy to mistake for correct placement.
2. **It sits in the left cluster, adjacent to Problems.** The criterion is deliberately not
   "immediately to its right" — see the plan. Adjacent and legible is the bar.
3. **Set `reminders.statusBarPriority` to 51** and confirm the item jumps to the *other* side of
   Problems. That is the only proof the escape hatch works, and it is the whole reason the
   number is a setting rather than a constant.

Then hover it and read the tooltip: it should list the open reminders grouped by subject, with
the audience after each title, and no filenames.

## Why it cannot be a test

Nothing in the suite has a status bar. The extension host is a running VS Code window, and the
placement depends on an internal constant (`status.problems` at `StatusbarAlignment.LEFT, 50`)
that carries no compatibility promise, plus whatever other extensions are installed and what
priorities they claimed. `manifest.test.ts` asserts the default priority is 49 and that the
command is wired, which is the most a test can reach — it cannot see a pixel.

The plan's success criterion says *"verified by eye in the extension host, not by reading
code."* This file exists because that sentence is otherwise a wish.

## What it changes

**It is where it should be** — say so here and close it. That is the expected outcome and the
one most likely to go unrecorded, leaving somebody in three months to wonder whether anyone
ever actually ran it.

**It is somewhere odd but legible** — fine, and interesting. Record the priority that worked
and change the default in `package.json`. This is a setting precisely so this is a one-line fix.

**It does not appear at all** — that is a wiring failure, not a placement one, and it goes back
to the plan rather than to a backlog item. Check the Extension Host output channel first; an
activation error shows up there and nowhere else.

## Notes

Audience is `dm` because it happens outside a session, on the machine the repository is already
on. It needs no hardware nobody has — just somebody to press F5 and look, which is exactly the
class of work the suite will never notice was skipped.
