---
date: 2026-07-17
status: gated — do not build until Alpha Strike is in progress
parent_spec: 2026-07-16-battleframe-core-mvp.md
---

# Facing geometry — a core primitive, gated on its third witness

## Why this note exists

"What generic feature would let us build the most wargaming modules?" has one strong,
evidence-backed answer that is not already in core: **facing.** This note records the case
for it, the core/ruleset split, the open questions, and — most importantly — **why it is not
built yet.** It is written so that when Alpha Strike is built, facing is designed from real
requirements instead of guessed.

## The evidence — three independent witnesses

Facing is not one ruleset's idea. The researched games demand it from different directions:

- **Alpha Strike** (the planned neutrality-proof ruleset): binary facing — a rear attack is
  **+1 damage**. "The hex never fully leaves Alpha Strike."
- **Classic BattleTech**: hexside facing feeds the **hit-location table** — front/side/rear
  change *where* a hit lands, not just how much.
- **OPR Regiments**: facing and **formations** for multi-base units.

Three structurally different uses (a flat damage modifier, a table lookup, a formation rule) of
**one geometric fact**: which way a base points, and which arc — front / flank / rear — another
model attacks from.

## It is already in core's declared scope

The engine design's core-primitives table lists the Base Model as *"circle/oval with real-world
size … **optional facing**"*, and immediately draws the line: *"What facing **does**
(BattleTech's hexside→hit-table is ruleset logic)"* is **not** core's. So the split is already
decided in principle:

- **Core owns the geometry.** Which direction a base faces, and given two tokens, which arc
  (front/flank/rear) the second sits in relative to the first's facing. This is the same
  category as `measure.between` (geometry in core) and the area `ContainmentMode` (the *choice*
  is the ruleset's) — pure spatial fact, no game meaning.
- **The ruleset owns the meaning.** +1 damage, a hit-table row, a formation constraint. Core
  must not learn any of it (the neutrality test would fail if it did).

## The oval connection — this is the same gap twice

An oval base has no measurable extent until you know **which way it is turned on the table** —
and that orientation *is* its facing. This is why `radiusPx` currently approximates an oval as
its **major-axis circumscribing circle**: exact oval-to-oval base-to-base needs each base's
orientation, which core does not model. So facing is not only a combat primitive; it is the
missing input that would make **oval base measurement exact** (OPR's 120×92 bases). Build
facing and the oval approximation can be retired at the same time. This is the strongest
reason facing belongs in the **base model**, next to the geometry that already depends on it.

## ⛔ Why it is gated — build it with Alpha Strike, not before

This project's standing rule: **a primitive generalised from one ruleset takes that ruleset's
shape.** Facing has three witnesses on paper but **zero in code** — no shipped ruleset uses it
yet (GREATHELM has no facing). Building it now means guessing the questions below, and a wrong
guess that Alpha Strike then adopts becomes load-bearing.

Alpha Strike is the natural first consumer: it is the next-planned structurally-different
ruleset, its facing is the *simplest* real case (binary front/rear), and it is the deliberate
test of whether core absorbed any bias. **Build facing while building Alpha Strike**, shaped by
what Alpha Strike actually reads, then confirm the shape survives BattleTech's hit-table use
before calling it done. Two consumers, not one — the same bar every core generalisation meets.

## Open questions to resolve *from the ruleset*, not now

1. **How many arcs?** Binary (front/rear) covers Alpha Strike; front/flank/rear covers
   BattleTech and OPR. Likely a parameter (arc count or arc boundaries in degrees), the way
   `ContainmentMode` is a parameter — but do not fix the parameterisation until two rulesets
   pull on it.
2. **Where is facing stored?** Foundry tokens already carry a `rotation`. Is facing the token's
   visual rotation, or a separate `flags.battleframe.facing` decoupled from the sprite? Games
   differ on whether the model's visual orientation is its game facing.
3. **What is the core query?** Candidate: `arcOf(observer, target) -> "front" | "flank" |
   "rear"` (or a numeric bearing the ruleset buckets itself — which keeps arc *counts* out of
   core entirely, and may be the more neutral shape).
4. **Does facing change on movement?** A rigid translation preserves facing; a pivot changes
   it. That is ruleset movement logic, but core's storage choice (Q2) constrains it.

## Acceptance criteria (for when it is built)

- `[STRUCTURAL]` Core exposes only facing **geometry** — direction and arc. No damage modifier,
  hit table, or formation rule appears in `packages/battleframe/src`; the neutrality vocabulary
  test still passes.
- `[MECHANICAL]` At least **two** shipped rulesets consume it (Alpha Strike + one more). One
  consumer is a guess with extra steps.
- `[BEHAVIORAL]` Oval base-to-base measurement becomes exact once orientation is available, and
  the major-axis approximation in `radiusPx` is removed with a regression test proving the new
  result differs from the old for a non-circular base.
- `[STRUCTURAL]` A ruleset that does not care about facing (GREATHELM) is entirely unaffected —
  no new required flag, no behaviour change.

## Related

- `docs/backlog/battleframe-toolkit-extraction.md` — the same gate discipline, applied to
  schedulers and the resolution stack.
- `docs/backlog/battleframe-alphastrike-ruleset.md` — the first facing consumer.
- `docs/building-a-ruleset-module.md` — lists facing under "what core does not provide yet".
