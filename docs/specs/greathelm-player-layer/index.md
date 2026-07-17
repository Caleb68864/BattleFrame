---
type: phase-spec-index
master_spec: "../2026-07-17-greathelm-player-layer.md"
date: 2026-07-17
sub_specs: 5
---

# GREATHELM Player Layer — Phase Specs

Refined from [2026-07-17-greathelm-player-layer.md](../2026-07-17-greathelm-player-layer.md)
(34/35). Design: [2026-07-17-greathelm-player-layer-design.md](../../plans/2026-07-17-greathelm-player-layer-design.md).

> [!note] This lands on a working system, not a greenfield
> The rules engine is **correct and live-verified** on Foundry v14.363: a real round played —
> 14 dice, initiative on most 6s, actions resolving 6→1, opposed clash tests, damage
> persisting (3/2/1/1, capped at 3), four courage tests firing for damaged knights in base
> contact. **This is a control-flow change, not a rules change.** Reuse
> `resolveDieAction`, `resolveClashTest`, `planMovement` and `runCouragePhase` unchanged.

## What this fixes

The round plays itself. `vault/greathelm/action-economy-per-die-not-per-model.md`
(`confirmed`): the pool is a **player-level** resource — any die may activate any knight,
there is no activation limit, one knight may take every action in a round. **Choosing which
knight spends which die IS GREATHELM.** Round-robin doesn't approximate that choice; it
deletes it.

## Sub-Specs

| Sub-Spec | Title | Depends on | Phase Spec |
|---|---|---|---|
| SS-01 | Round session — suspendable state machine | — | [sub-spec-1-round-session.md](sub-spec-1-round-session.md) |
| SS-02 | Pool panel — click a die, click a knight | SS-01 | [sub-spec-2-pool-panel.md](sub-spec-2-pool-panel.md) |
| SS-03 | Canvas highlighting — show what's touching | SS-01 | [sub-spec-3-canvas-highlighting.md](sub-spec-3-canvas-highlighting.md) |
| SS-04 | Choice prompts + settings toggles | SS-01 | [sub-spec-4-choice-prompts.md](sub-spec-4-choice-prompts.md) |
| SS-05 | Integration — kill round-robin, wire the panel | SS-02, SS-03, SS-04 | [sub-spec-5-integration.md](sub-spec-5-integration.md) |

## Waves

A clean diamond. Verified acyclic; no consumer precedes its producer.

| Wave | Sub-Specs | Note |
|---|---|---|
| 1 | **SS-01** | The session. Everything else asks it questions. |
| 2 | SS-02, SS-03, SS-04 | Parallel — panel, highlighting, prompts all depend only on the session |
| 3 | SS-05 | Integration. Last, by definition. |

## Requirement Traceability

**No orphaned requirements.**

| Requirement | Covered By |
|---|---|
| R1: GM plays a full round choosing every die, no console | SS-05 *(`[HUMAN REVIEW]`)* |
| R2: `assignDiceRoundRobin` has zero production callers | SS-05 *(mechanical grep)* |
| R3: Legal knights highlight; illegal show why | SS-02 *(reason)*, SS-03 *(canvas)* |
| R4: first-or-second prompt, disableable | SS-04 |
| R5: target prompt when 2+ in contact, disableable | SS-04 |
| R6: All prompts off → today's documented defaults | SS-04 |
| R7: Session unit-tested headless | SS-01 |
| R8: Session is the only place legality is decided | SS-01 *(owns it)*, SS-02 + SS-03 *(greps asserting they don't)* |
| R9: Core requires zero changes | SS-05 *(core-vocabulary grep + `[HUMAN REVIEW]`)* |
| R10: `notifyUser` calls the notification bound | SS-05 |

## The checks that matter most

Two, and both exist because this project already paid for them:

**1. Reachability, not existence** — SS-05:
```
[ -n "$(grep -oE 'createRoundSession|pool-panel|PoolPanel' \
  packages/battleframe-greathelm/dist/greathelm.js)" ]
```
The entire round loop was once tree-shaken out of the bundle (146 lines, `grep runRound` → 0)
**while every acceptance criterion passed.** An AC that dead code satisfies is not an AC.

**2. One source of truth for legality** — SS-02 and SS-03 each carry a grep asserting they
contain **no** contact maths. Three duplicate `=== 0` checks once existed; fixing only the
obvious one would have produced clashes that damage knights, then a courage phase that thinks
everyone is disengaged mid-melee — **worse than the original, because it would look like it
worked.**

## Known-unverified APIs — escalate, don't assert

| API | Vault status | Approach |
|---|---|---|
| **Token tinting** (SS-03) | **No note at any confidence** | Feature-detect; if absent, skip, log once, **round stays playable** |
| **`DialogV2`** (SS-04) | `grep -rni "DialogV2" vault/` → **nothing** | Feature-detect exactly as `resolveConversionPrompt` does |

Precedent: `getSceneControlButtons` also had zero vault notes and worked first try —
**because the code accommodated both payload shapes and asserted nothing.** Copy that posture,
then record the real shape in `vault/foundry-systems/` afterwards.

## Execution

```
/forge-run docs/specs/2026-07-17-greathelm-player-layer.md
```

Point at the **master spec**, not this directory. **218 tests currently pass; none may
regress.**

After deploying to a live world, **hard-reload** — Foundry serves system JS with
`Cache-Control: max-age=14400` and you will otherwise debug the old bundle for four hours.
