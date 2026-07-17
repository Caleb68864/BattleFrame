---
date: 2026-07-17
status: design — build in progress
ruleset: Simple Skirmish (Simple Fantasy Skirmish) by Peter Vodden
license: CC BY-NC 4.0 (attribution, non-commercial)
source: https://petervodden.blog/portfolio/simple-fantasy-skirmish/
---

# Simple Skirmish — a second ruleset, and the second witness for centre-to-centre measurement

## Why this ruleset

The user asked for a **genuinely free-to-ship** ruleset. Simple Skirmish is **CC BY-NC 4.0** —
free to redistribute and adapt with attribution, non-commercial. A free Foundry module carries
it cleanly, provided it attributes Peter Vodden and is never sold. Unlike OPR / Alpha Strike
(free to *read*, copyright reserved), its rules text is licensed for redistribution, so this is
the first ruleset whose mechanics BattleFrame may actually ship rather than BYO-data.

It is also structurally useful: it is **unit-based** (small units of models in loose
formation), where GREATHELM is single-model, and it measures **centre-to-centre**, where
GREATHELM measures **base-to-base**. Two independent shapes stress the core the way the
architecture intends.

## Attribution (required by the license)

Every shipped artifact (module.json description, README, an in-repo NOTICE) must carry:
"Based on *Simple Fantasy Skirmish* by Peter Vodden (petervodden.blog), licensed CC BY-NC 4.0."
The module is distributed free and must never be sold (the NC clause). No verbatim rulebook PDF
is redistributed — only an implementation of the mechanics.

## The mechanics (from the official one-page quick reference)

**Stats (per unit):** three that matter, each a d6 target, any of which may be absent (the unit
cannot do that action):
- **Attack** (per type — Melee / Ranged / Magic): roll **≥ Attack** on a d6 to hit.
- **Save** (may be per type): the defender rolls a d6 per hit; a result **< Save = one
  casualty**. (Lower Save is a better save.)
- **Skill**: roll ≥ Skill to succeed at a skill action.
- **Move**: 3" shambling / 6" standard / 9" fast.
- A unit also has a **model count** (dice thrown scale with it).

**Turn structure** (ruleset owns the loop; core provides no scheduler):
- **Round:** clear activation markers → roll Initiative (highest chooses who goes first).
- **Turn:** pick an un-activated unit → (1) Move or not → (2) Attack or not → (3) mark it
  activated. Players **alternate** turns until every unit is activated, then a new round.

**Combat resolution** (Melee / Ranged / Magic identically):
1. Attacker picks a target unit and type, rolls **1 d6 per model**; each die **≥ Attack** is a
   hit.
2. Defender rolls **1 d6 per hit**; each die **< Save** is a casualty (no Save → every hit is a
   casualty).
3. Remove that many models. A unit at zero models is destroyed.

**Measurement** — the load-bearing difference from GREATHELM:
- **Movement** and **Line-of-sight**: unit **centre to centre**.
- **Range / charge-in**: unit centre to the **nearest enemy model**.
- Ranged/Magic range is 12" (or per unit).

**Advantage points:** cover, height, fighting over obstacles each grant points; both sides'
points cancel, and each **net** point lets a player alter one die result. (Deferred past MVP —
see scope.)

**Champions:** elite models rolling bigger dice (d8/d10/d12), attach/detach from units.
(Deferred past MVP.)

**Rule of halves:** if half a unit can do a thing / is in a state, the whole unit is. (A
resolution convenience, deferred.)

## The engine function this ruleset needs: centre-to-centre measurement

Core's `measure.between` returns **base-to-base only** (`mode: "base-to-base"`). Simple Skirmish
measures **centre-to-centre** (movement, LoS) and **centre-to-nearest-model** (range). So core
must be able to answer centre-to-centre distance.

This is the parameterised-neutrality seam that was **deliberately not built speculatively** five
commits before this ruleset existed (see the measurement scene-id decision entry's restraint,
and the standing rule "a primitive generalised from one ruleset takes that ruleset's shape").
Now there is a **second witness**: GREATHELM wants base-to-base, Simple Skirmish wants
centre-to-centre. Two rulesets pulling in different directions is exactly the evidence the
architecture requires before generalising. So core's `between` gains a `mode?: "base-to-base" |
"centre-to-centre"` parameter (default `base-to-base`, so GREATHELM is untouched), and the
result reports which mode it used. Centre-to-nearest-**model** stays in the ruleset — "nearest
model of a unit" is unit-formation logic core knows nothing about; the ruleset walks its models
and calls core's centre-to-centre per pair.

## MVP scope (what the passes build)

1. **Core:** `measure.between(a, b, mode?)` gains centre-to-centre. (Engine function.)
2. `packages/battleframe-simple-skirmish` scaffold: package.json, tsconfig, vite, module.json
   (with attribution + `documentTypes.Actor.unit`), lang/en.json, styles.
3. Unit Actor data model: model count, per-type Attack/Save, Skill, Move.
4. Combat resolution: hits (≥Attack) → saves (<Save) → casualties, pure and tested.
5. Centre-to-nearest-enemy-model range/charge helper (composes core centre-to-centre).
6. Casualty application → model-count decrement → unit destroyed at zero.
7. Round/turn session: per-round initiative, alternating activation, activation markers,
   completion.
8. Victory: last side with a surviving unit.
9. Registration + entry wiring (`registerRuleset`, load-order-independent, fail-loud).
10. Unit sheet.
11. Activation UI (scene control to run a round / activate units).
12. i18n completeness.
13–15. Advantage points, champions, and an end-to-end integration test — as far as scope allows.

## The Basic Game is the MVP

The full rules split into a **Basic Game** (Attack + Save only) and an **Advanced Game** (adds
Skill, champions, advantage points, designed scenarios). The MVP is precisely the Basic Game,
so its scope is the rulebook's own natural first tier, not an arbitrary cut.

**Victory (confirmed, not guessed):** the Basic Game is a **deathmatch** — "the loser is the
first to have no models remaining." Last side with a surviving model wins. The Advanced Game
lets players design scenarios with their own victory conditions; that is deferred with the rest
of the Advanced tier.

## Deferred (Advanced Game / needs a second witness)
- Advantage points, champions, rule-of-halves, terrain/vertical movement modifiers, the leeway
  marker — all real rules, none blocking a first playable round; built once the core round works.
- **Skirmish-formation enforcement** (no model >1 base-width from a neighbour) — a movement
  constraint core has no collision for; like GREATHELM movement, the GM positions models and the
  engine measures. Not auto-enforced in MVP.

## Neutrality check

Core gains one thing: a measurement mode, driven by two witnesses. Everything unit-shaped —
model counts, Attack/Save/Skill, activation markers, advantage points — lives in the module.
The neutrality vocabulary test must stay green: core learns "centre-to-centre" (geometry), never
"unit", "casualty", or "champion" (rules).
