---
date: 2026-07-17
parent_spec: 2026-07-17-greathelm-player-layer.md
---

# GREATHELM momentum — the economic loop is unimplemented

## Context

Momentum is not a side stat; the vault (`vault/greathelm/momentum.md`, `confirmed`)
calls it **"the bridge between the mobility half and the damage half"** of the game and
**"the real reason [[action-economy-per-die-not-per-model]] doesn't degenerate."** It is a
core mechanic, and today it does nothing.

QSR p2, verbatim:

> Knights gain 1 momentum every time they win a clash test (whether attacking or
> defending). Before rolling, an attacking knight may spend any amount of momentum for +1
> per momentum spent. All knights have a momentum limit of 3. Additional momentum is
> discarded.

Sources: Sprint (face 6) **+2**, Encircle (face 5) **+1**, win any clash **+1**, Parry
success **+1 more**. Loss: a successful **Bash strips all** the defender's momentum — that
is Bash's entire purpose. Cap **3**, overflow discarded.

## What exists vs. what runs

`system.momentum` is a real schema field (`data/knight.ts`, `NumberField` capped at 3), the
sheet shows it, and the action hints promise it ("Sprint … Gains 2 momentum", "Bash … strips
momentum"). But nothing ever changes it and nothing ever reads it:

- **Gain never persists.** `planMovement` returns `momentumGain` (`round/actions.ts:44,46`)
  and no caller writes it to the Actor. Winning a clash grants nothing. The number the hint
  promises never lands.
- **Spend does not exist.** `resolveClashTest` (`combat/clash.ts`) rolls a flat `1d6` for
  each side with no bonus input. An attacker cannot spend momentum for +1 — the one place
  momentum is meant to *matter* has no seam for it.
- **Bash's strip is a comment.** `combat/clash.ts:180` documents "Bash … only strips
  momentum and repositions", but no code clears the defender's momentum.

So the loop is severed at every joint: movement generates momentum that evaporates, clash
tests are pure coin-flips with no investment, and Bash is a reposition with no economic
teeth. This is the same species as the courage-outcomes and victory-wiring gaps — logic
computed (`momentumGain`) but never consumed — and like those it passes every existence
check because the schema field and the hint text are both present.

## The design decision this forces

Spending momentum is a **pre-roll attacking-knight choice** — "spend any amount for +1
each". That is a fourth player choice in the same family as first-or-second and
attack-target, and it belongs in the seam those already use: `ui/choice-prompts.ts` (a
`promptMomentumSpend` returning 0–3, gated by a settings toggle with a documented engine
default of 0, i.e. never auto-spend the player's economy). `resolveClashTest` grows a
`momentumBonus` parameter; the round persists gains and the Bash strip via `actor.update`,
the way `applyClashDamage` already persists wounds.

## Open question — must resolve before building

**Does momentum persist between rounds?** `vault/greathelm/momentum.md` "Not found": the QSR
never says it resets and the courage phase doesn't clear it, so it *plausibly* persists — but
this is **not confirmed** and needs the full rulebook. It changes the state model: if it
resets each round, the round loop clears it; if it persists, only "New Battle"
(`resetKnight`, already clears `system.momentum` to 0) does. Do not guess — verify against
the rulebook, the same discipline that caught the in/ft/mm confusion.

## Why not now

It is a feature, not polish: it needs the persistence rule confirmed, a new player-choice
prompt designed, and — most of all — **live play** to feel whether the mobility→momentum→
lethality loop reads correctly at the table. That is exactly the testing this session was
told it could not do. Captured here so the finding is not lost; build it when the rulebook
question is answered and a play session is available.
