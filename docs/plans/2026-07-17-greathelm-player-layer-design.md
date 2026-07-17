---
date: 2026-07-17
topic: "GREATHELM player layer — make the round a game instead of an auto-battler"
author: Caleb Bennett
status: draft
tags:
  - design
  - battleframe
  - greathelm
---

# GREATHELM Player Layer — Design

## Summary

The rules engine is correct and verified live: pool sizing, 6→1 ordering, base contact,
opposed clash tests, damage, courage. **The player makes no decisions.** Dice are assigned
to knights round-robin, and the round resolves itself in one atomic call.

This design gives the player the decisions the rulebook says are theirs.

## The problem, stated precisely

`vault/greathelm/action-economy-per-die-not-per-model.md` (`confirmed`): the dice pool is a
**player-level** resource. **Any die may activate any of that player's knights. There is no
activation limit. One knight may legally take every action in a round.**

So *"which knight spends which die"* is not a detail — **it is the entire tactical game**.
SS-13's own code says so:

> ***"ENGINE DEFAULT, not a rule.*** *… Which knight spends which die is the player's choice,
> every time. Round-robin is a placeholder… **it is not an AI and does not claim to be a good
> one. A real per-die knight picker is the obvious next increment."***

Round-robin does not approximate that choice badly. **It deletes it.** What ships today is an
auto-battler that happens to obey GREATHELM's rules.

Two smaller choices were defaulted the same way, both QSR-confirmed:
- the initiative winner's **first-or-second** choice (defaults to "first")
- **which** touching enemy to attack when several qualify

## The architectural consequence — and a prediction coming true

`runRound(options)` is a pure `async` function: it resolves all 14 dice and returns. Player
agency means it must **suspend** at each die, wait for a choice, and continue.

This is precisely what the original design predicted, from games we are not even building yet:

> *"**INX** — reaction tokens let a non-active unit act during another's activation.
> **Classic BattleTech** — *'the target chooses'* resolves geometric ties **before the
> attacker rolls**. Both mean **attack resolution cannot be a pure function** — it must
> suspend and prompt another player. Genuinely hard, genuinely shared."*

It was filed as the toolkit's **Resolution Stack**, deferred to Phase 5 behind three
rulesets. **It has now arrived from a fourth direction — the player's own turn.** GREATHELM
builds its own suspendable loop; the toolkit extracts the pattern later, from real examples.

**That is Approach C working exactly as designed**: the abstraction arrives from evidence
rather than from a brain dump. Do **not** pre-emptively generalise this into core or a
toolkit now — one example is not evidence.

## Approach

**A round session: an explicit state machine the UI drives.**

```
createRoundSession(knights, pools, firstPlayerId)
   ├── remainingDice()        → unspent dice, by side
   ├── legalTargetsFor(die)   → knights this die may activate, + why not
   ├── spendDie(dieId, knightId, choices?) → resolves ONE die, returns what happened
   └── isComplete()           → all dice spent → courage phase runs
```

The existing pure functions (`resolveDieAction`, `resolveClashTest`, `runCouragePhase`,
`planMovement`) are **reused unchanged**. This is a control-flow change, not a rules change.

**Rejected: keeping `runRound` and passing a `chooseKnight` callback.** It inverts control —
the round would call *up* into the UI and block. A session the UI *pulls* from is testable
without a canvas, matches how the game is actually played (you look at your pool and decide),
and is the shape the Resolution Stack will want when INX's reactions eventually need to
interrupt someone else's activation.

## Components

All in `packages/battleframe-greathelm/`. **Core is not touched.**

| # | Component | Owns | Does NOT own |
|---|---|---|---|
| ① | **Round session** | Pool state, spent dice, legality, one-die resolution, completion → courage | Any UI. Any canvas. It must be testable headless. |
| ② | **Pool panel** (ApplicationV2) | Rendering the 7 faces + the action each buys; click-to-select a die; showing why a die is unusable | Rules. It asks the session. |
| ③ | **Canvas highlighting** | Tinting legal knights when a die is selected; showing base-contact pairs | Deciding legality — that is the session's answer |
| ④ | **Choice prompts** | first-or-second; which enemy to hit | Defaults — those become settings |
| ⑤ | **Settings** | Per-prompt toggles | — |

**Why the panel asks the session rather than computing legality itself:** two copies of a
predicate is how the `=== 0` base-contact bug survived in three places. One source of truth.

## Interaction

1. Round starts → both pools roll → **first-or-second prompt** (if enabled) → panel opens.
2. Panel shows the active player's unspent dice, highest face first (the round resolves
   6→1, so the pool is walked down).
3. **Click a die** → legal knights highlight on the canvas; illegal ones are dimmed with a
   reason (*"no enemy in base contact"*).
4. **Click a knight** → the die resolves. Movement reports its capped allowance; attacks run
   the clash test and apply damage.
5. If several enemies are in base contact → **target prompt** (if enabled).
6. Sides alternate per the QSR; when a side has no dice left, the other continues.
7. All dice spent → **courage phase runs automatically** (it is not a player choice — the
   rulebook decides who tests and in what order).

**Turn order is unchanged.** The session enforces 6→1 and alternation; the player chooses
*which knight*, never *which face* — the face is what the die rolled.

## Error handling

The failure modes here are all *silent-wrongness* again, so:

- **A die can never be spent illegally.** The session rejects it; the panel should not have
  offered it. If the session rejects a die the panel offered, that is a **bug, and it must
  throw** — not silently no-op.
- **A selected die that becomes illegal** (its target died mid-round) → re-derive legality on
  every render, never cache it.
- **The panel must not compute legality.** See above.
- **Session state lives in memory for the round.** If a client reloads mid-round the round is
  lost. That is acceptable for the MVP and must be *stated*, not discovered — a reload
  losing a half-played round silently would be the worst outcome.
- **GM-only**, as SS-13 established: a round mutates shared state.

## Success criteria

- [ ] A GM plays a full round choosing every die→knight assignment, from the UI, no console.
- [ ] Round-robin is **gone** — `assignDiceRoundRobin` has no production caller.
- [ ] Legal knights highlight; illegal ones show *why*.
- [ ] first-or-second and target prompts appear, and each can be toggled off.
- [ ] With all prompts off, behaviour matches today's defaults (a documented fallback, not a
      limitation).
- [ ] The session is unit-tested **headless** — no canvas, no Application.
- [ ] The round loop is **in the shipped bundle** (reachability, not existence).
- [ ] Core requires zero changes.

## Out of scope

- **Toolkit extraction / a generic Resolution Stack.** One example is not evidence. Phase 5,
  gated on three rulesets.
- **Undo.** The engine has no history layer yet.
- **Multi-client turn passing.** GM-only for now; the other player tells the GM what they want.
- **Persisting a half-played round** across reloads.
- **Auto-moving tokens.** SS-13 decided this deliberately: the vault confirms knights cannot
  move through models, terrain, or gaps narrower than their base, so sliding a token along a
  straight line would break a confirmed rule silently. The engine states the legal distance;
  the GM moves the model.
- Any rule the QSR does not state. Where it gives a human a choice, **ask** — do not invent.

## Open questions

| # | Question | Impact |
|---|---|---|
| 1 | Does an ApplicationV2 panel re-render cleanly on every session change, or does it need a targeted part update? | Perf only; the pool is 7 items. |
| 2 | Canvas tinting API on v14 — the vault has **no note** on token tinting at any confidence. | Escalate rather than guess, per the `getSceneControlButtons` precedent (which worked, but was verified live before being trusted). |
| 3 | What happens if a knight is removed mid-round (reduced to 0)? | Re-derive legality every render; the session must tolerate a vanished knight. |

## Notes for the build

Every lesson this project has already paid for:

- **Acceptance criteria must test reachability, not existence.** `grep dist/greathelm.js`, not
  "the function exists". SS-10/SS-11 were fully satisfied by dead code.
- **Fixtures must resemble real Foundry objects.** A canvas Token has no `.flags` (they are on
  `.document.flags`) and its `.width` is PIXI bounds, not grid units. A convenient double
  manufactures confidence.
- **Never `=== 0`** for contact. And when a predicate is duplicated, fixing one copy is worse
  than fixing none.
- **`npm run build` does not typecheck** on its own — the root script now runs `tsc` first.
- **Foundry caches system JS for 4 hours.** Hard-reload after redeploy or you will debug the
  old bundle.
- **`ui.notifications[level]` must be called bound** — `notifyUser` currently detaches it and
  throws while reporting an error, masking the original failure. **Fix this on the way past.**
