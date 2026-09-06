---
kind: reminder
status: done
category: verify
audience: dm
subject: hardware
date: 2026-08-30
plan: world-shim_2026-08-28
---

# Measure the Ursina framerate at 5,000 blocks on the son's laptop

**Closed:** 2026-08-31 — the measures went really well. blew the minimums out of the water. claude is going to record results

## What to do

Run the shim's 5,000-block scene on **his** laptop and record the framerate. The plan's
criterion is **≥ 60 fps at 5,000 blocks**, measured and recorded rather than assumed, and the
number goes in the plan next to the criterion.

This is `verify` rather than `follow-up` because the expected answer is "yes, fine" — the spike
already measured a comparable scene. The point is that nobody has watched it on that machine.

## Why it cannot be a test

Framerate is a property of a GPU, a driver and a screen, not of the code. A test on the parent's
machine measures the parent's machine. §8 puts the authoring rule at "cap Area 3 worlds near
5,000 blocks", and that number is only honest if somebody has seen it hold where it matters.

## What it changes

**≥ 60 fps:** the world-shim criterion closes, the authoring cap stands, and Area 3 can be
written against a number rather than a hope.

**Below 60:** the cap comes down before any Area 3 content is authored to it — which is the whole
reason this is a plan of its own rather than a phase buried in a six-week curriculum plan, where
the number would not have got measured.

**Same sitting as the other three laptop tasks.**
