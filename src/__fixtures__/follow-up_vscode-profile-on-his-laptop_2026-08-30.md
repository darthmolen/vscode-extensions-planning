# Install and verify the Area 2 VS Code profile on the son's laptop

**Category:** follow-up
**Audience:** dm
**Subject:** hardware
**Raised:** 2026-08-30
**Plan:** `planning/**/feature_area-2-scribes-rite-and-sandbox_2026-08-28.md`
**Status:** open

## What to do

Import `tools/vscode/pyquest-area2.code-profile` on **his** the son's laptop and confirm the five
rungs of the ladder actually behave: the activity bar, the minimap, breadcrumbs, and the two
settings the profile turns off. Then open one Area 2 exercise in it and check it is usable
rather than merely installed.

The plan's own words: *the win condition is not passing tests, the win condition is that it
works on the other person's machine.*

## Why it cannot be a test

The profile is a JSON file this repository can validate all day. What it cannot do is open a
different computer and look at it. A profile that imports cleanly and leaves an unreadable
editor passes every check we have, and the failure surfaces during a session, in his time.

## What it changes

**Works:** area-2 stops being hardware-blocked. It is the last thing holding that track, and
area-3 waits on area-2a shipping, so this releases two tracks rather than one.

**Does not work:** the ladder is wrong on real hardware and Phase 3 of that plan reopens — which
is cheap now and expensive in week six, when it is the thing standing between him and a session.

**Do it in the same sitting as the other three laptop tasks.** Four separate reminders name that
machine — this, the Gitea push, the Ursina framerate, and the nine-screen check. They are one
afternoon together and four interruptions apart.
