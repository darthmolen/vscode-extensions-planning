# Open all nine screens on the son's laptop at 1366×768

**Category:** follow-up
**Audience:** learner
**Subject:** screens
**Raised:** 2026-08-30
**Plan:** `planning/**/feature_spa_2026-08-28-v2.md`
**Status:** open

## What to do

On **his** laptop, in **his** browser, at its native 1366×768 — not a devtools viewport
on the parent's machine — open all nine screens and look at them:

`/map` · `/tome` · `/defend` · `/party` · `/journal` · `/console` ·
`/area/3` · `/area/3/quest/a3-recipe-book` · `/area/3/boss`

Two of them are worth more than the other seven:

- **`/map`** is the tightest layout in the app. A fixed 420px panel sits beside a 1000×700 SVG,
  so at 1366 the islands get roughly 870px. If anything crowds, it crowds here first. Read the
  island labels — `AREA 3`, `Collections`, `3 of ~5` — at normal viewing distance.
- **`/tome`** is second: a 264px syllabus rail, the 72px overland rail, and a manual pane that
  caps at 660px. Check the syllabus rows still read as rows.

Then check the two pieces of fixed chrome everywhere, since they are what a short viewport eats
first: the **72px rail** with its six labels, and the **46px breadcrumb bar**.

## Why it cannot be a test

Nothing in the suite has his screen. The tests run in jsdom, which has no layout at all — no
font metrics, no wrapping, no overflow. A devtools viewport at 1366×768 has his *resolution* and
none of his **font rendering, OS scaling, or browser**, and the difference between those is
precisely what "legible to an 11–14-year-old" turns on.

This criterion has been in the plan since it was written and no run of anything will ever fail
because of it. That is the whole reason this file exists.

## What it changes

**If it is fine** — say so here and close it. That is the likely outcome and the one that
otherwise goes unrecorded, leaving somebody to wonder in three months whether it was ever done.

**If something is cramped** — it opens a backlog item and gets noted in the Phase 2 review. It
does **not** block: the plan makes this an observation rather than a gate, and Phases 3 and 4
start regardless. The likely fixes, in order of preference: the Map's panel collapses below a
breakpoint rather than the islands shrinking; the rail narrows; the type ramp comes down a step.
That order is deliberate — shrinking the islands costs the most legibility for the least space.

**If a screen is genuinely unusable** — content he cannot reach at all, as opposed to content
that is tight — that is the one outcome that *does* block, and it goes back to the plan rather
than to a backlog item.

## Notes

- Audience is `learner` because it needs his machine, which means it happens in his time.
  Doing it at the **start** of a session costs ten minutes; discovering it mid-quest costs the
  quest.
- The app runs on the parent's machine (§6.1); his laptop needs only a browser pointed at it.
  Confirm it is reachable over the LAN first — that is a separate open question in
  `planning/backlog/feature_gitea-lan-access-for-the-son_2026-08-27.md`, and if it bites, this
  reminder is blocked on that one rather than on anything in the SPA.
