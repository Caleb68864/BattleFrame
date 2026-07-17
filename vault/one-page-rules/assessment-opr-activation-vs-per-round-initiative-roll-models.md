---
tags: [wargame-research, one-page-rules]
source: inference
confidence: unverified
---

# OPR's Activation Model vs a Per-Round-Initiative-Roll Model — Same Shape, Different Order Source

Direct answer to: *how different is OPR's activation from a per-round-initiative-roll-then-alternate model (like GREATHELM), and would an engine designed for one naturally host the other?*

**Short answer: they differ in exactly one thing — where turn order comes from — and an engine that treats order as a pluggable provider hosts both trivially.**

> **Caveat:** I have **no source on GREATHELM** — it appears to be your own ruleset, and I did not research it. This note reasons from the model *as you described it*: "per-round initiative roll, then alternate." If that description is incomplete, the analysis shifts.

## The comparison

| | OPR | Per-round-initiative model |
|---|---|---|
| Unit of activation | One unit | One unit |
| Interleaving | Alternate one each | Alternate one each |
| **Order source** | **Inherited from last round's completion order** | **Re-rolled each round** |
| Randomness in order | **Only once, at deployment** | **Every round** |
| Determinism | Deterministic + path-dependent after round 1 | Stochastic each round |
| Actions per activation | Exactly one, from four | (unknown) |

**The alternating structure is identical.** Both are "players take turns activating one unit at a time until units run out." That's the hard part of the engine — the turn loop, the activation flags, the reactive strike-back handling — and it's **shared**.

The difference is a **single function**: *who goes first this round?*
- OPR: `firstPlayer = whoeverFinishedFirstLastRound` ([[mechanics-first-player-next-round-is-whoever-finished-activating-first]])
- GREATHELM (as described): `firstPlayer = rollInitiative()`

## The architectural conclusion

**Yes — an engine designed for one naturally hosts the other**, provided you make one deliberate choice: **turn order is a strategy/provider, not a stored initiative number.**

The trap is subtle and worth naming, because it's Foundry's default. Foundry's combat tracker models initiative as **a number stored per combatant**, sorted descending, re-sorted each round. That representation:
- **fits GREATHELM natively** (roll → store → sort);
- **fits OPR badly** — OPR has no per-combatant initiative value *at all*. Its order is a **property of the two players**, derived from round history, not a number on a unit.

So an engine built naively on "each combatant has an initiative score" will host GREATHELM and then **fight OPR at every step**. Built on "an order provider yields the next activating unit," both are ~20-line implementations.

## The real portability risks are elsewhere

Activation is the **easy** axis. The things more likely to strain a shared engine:
1. **Reactive strike-back decoupled from activation** ([[mechanics-melee-strike-back-is-optional-and-free]]) — needs `hasActivated` separate from melee participation. If GREATHELM has no reactive attacks, OPR forces this generalisation.
2. **Path-dependent round state** — OPR needs "who finished first," which a re-rolling model never records.
3. **The uneven-unit-count gap** ([[mechanics-alternating-activation-with-uneven-unit-counts-is-unspecified]]) — both models must answer it, and OPR gives no official answer.

## Recommendation

Model turn order as: `OrderProvider.nextActivation(state) → unit | null`, with `RoundStart.determineFirstPlayer(prevRound) → player`. OPR and GREATHELM then differ only in the second function. **Do not** put an `initiative: number` field on the combatant.

**Confidence: unverified** — this is architectural analysis, not a finding. The OPR side rests on **confirmed** sources ([[mechanics-alternating-unit-activation-is-the-core-turn-structure]]); the GREATHELM side rests entirely on your one-line description. Related: [[assessment-one-engine-can-host-most-of-the-family]].
