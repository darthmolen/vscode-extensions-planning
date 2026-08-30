# Tell him the turtle was a robot, and let him find the dragon

**Category:** follow-up
**Audience:** learner
**Subject:** curriculum
**Raised:** 2026-08-30
**Plan:** `planning/**/feature_spa_2026-08-28-v2.md`
**Status:** open

## What to do

At some point in Area 0 or 1, when he is drawing and the arrow on screen is just a thing that
moves — tell him where the name came from.

**Logo, 1967**, at BBN. The turtle came a couple of years later at the MIT AI Lab and it was a
**robot**: a dome about the size of a dinner plate, clear plastic shell, wheels underneath, a pen
in its belly, crawling over butcher paper on the floor. `forward(100)` and the thing drove. When
screens got cheap the on-screen cursor inherited the name and became a triangle, because a
triangle is easy to draw and shows you which way it faces.

Then let him type this himself:

```python
turtle.shape("turtle")
```

It is a real, built-in Python shape and he gets an actual little turtle. The shim implements it
with the standard library's own polygon, so it is the same turtle he would get on his own
machine.

**And the dragon is in there.** `turtle.shape("dragon")` works in PyQuest. It is deliberately
undocumented — better found than announced, and better still if he finds it because he tried it
on a hunch after the turtle worked.

## Why it cannot be a test

Nothing here is a defect. The code works either way; what is at stake is whether a
11-14-year-old learns that the tool he is using has a history and a joke hidden in it. A test
can assert `shape("dragon")` resolves — one does — but it cannot notice that nobody ever told
him.

Timing is the part that has no automated form. Too early and it is noise before he has drawn
anything; too late and he has already stopped seeing the arrow.

## What it changes

**If it lands** — note it here and close it. The payoff worth watching for is whether he tries
other names unprompted. That is the moment to point at `register_shape` and the quest below.

**If it falls flat** — also worth recording, and not a failure. It is a thirty-second aside, not
a lesson.

## Why the dragon is legal at all

The obvious move was renaming `turtle` to `dragon` outright, for the RPG framing. It was
rejected: the lexicon table renames **game** concepts, which are ours — Area not Tier, Invasion
not Patrol. `turtle` is **Python's**, and Area 2 puts his code on his own machine with real
Python. `import dragon` would be something he has to unlearn the first time he runs a file
outside the game, and *the work itself stays real from week one*.

A custom **shape** breaks nothing, because `register_shape()` is a genuine turtle API. The
dragon is a real feature used as an easter egg rather than a fiction pretending to be one.

## Related

- `planning/backlog/feature_own-shape-quest_2026-08-30.md` — the quest where he makes his own
- `docs/decisions/0003-learner-python-runs-off-the-main-thread.md` — why the shim exists at all
