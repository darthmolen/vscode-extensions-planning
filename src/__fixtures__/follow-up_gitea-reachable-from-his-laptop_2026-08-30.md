# Make Gitea reachable from the son's laptop, and push to it from there

**Category:** follow-up
**Audience:** dm
**Subject:** hardware
**Raised:** 2026-08-30
**Plan:** `planning/**/feature_gitea-lan-access-for-the-son_2026-08-27.md`
**Status:** open

## What to do

Gitea is running and healthy on the parent's machine, bound to the LAN on purpose (§6.4: push is
the verification mechanism). What has never happened is a push **from his machine to it**: an
account provisioned, a remote configured, an SSH key or credential that works, and a real commit
arriving.

Prove it with a throwaway repository and a real commit, from his laptop, over the LAN.

## Why it cannot be a test

`infra/smoke.sh` already creates a repository and pushes a commit — from the machine Gitea runs
on, where it works and proves nothing about the network. The thing that fails here is a firewall
rule, a host name that resolves on one machine, or a key that was never installed, and none of
those is visible from this side of the wire.

## What it changes

**Works:** two API verifiers unblock — `git-signal` and `local-repo` are the only phases of
`feature_api-and-runner` still unbuilt, and both are waiting solely on this. It is also the win
condition of Area 2a: he pushes and the board updates by itself.

**Does not work:** find out now, while it is a network problem to solve on a weekday, rather than
in week six when it is the reason a session does not happen. The backlog item notes it is worth
doing early and opportunistically for exactly this reason.

**Batch it with the other laptop tasks** — the VS Code profile, the Ursina framerate, and the
nine-screen check all need the same machine in reach.
