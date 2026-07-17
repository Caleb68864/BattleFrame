---
tags: [wargame-research, battletech]
source: https://static1.squarespace.com/static/5e5f11b6a6b48b3ae5c4ee36/t/5e69a64e3d430e6e35ad7fda/1583982189894/CAT3500D+BattleTech+A+Game+of+Armored+Combat+Rulebook.pdf
confidence: confirmed
---

# Classic BattleTech Mechanics — Hub

Overview note for Classic BattleTech's rules model. Everything here was read out of **CAT3500D, *BattleTech: A Game of Armored Combat* (AGoAC) rulebook** — Catalyst's **free, official** PDF, the current introductory boxed-set ruleset. It is a subset of *Total Warfare* (the paid tournament rulebook) but the core engine is the same and it is legitimately free to read.

Sub-notes:
- [[classic-heat-scale]]
- [[classic-hit-location-and-facing]]
- [[classic-movement-points]]
- [[classic-to-hit-modifiers]]
- Spatial model: [[hex-vs-inches-is-the-fault-line]]
- Data format: [[megamek-mtf-unit-format]]
- Engine verdict: [[engine-fit-assessment]]

## The turn is six phases, in fixed order (confirmed)

> "A BattleTech game consists of a series of turns, each being ten seconds of real time. Each turn consists of several smaller segments, called **phases**. The players execute the phases in a given order, with **all players completing a phase before anyone moves onto the next phase**."

1. **Initiative Phase**
2. **Movement Phase**
3. **Weapon Attack Phase**
4. **Physical Attack Phase**
5. **Heat Phase**
6. **End Phase**

The task brief's guessed structure was **exactly right**. No hidden phases.

## Initiative is re-rolled every turn (confirmed)

One player per side rolls **2D6**; high total wins Initiative for that turn. **Re-roll all ties.** There is no initiative track, no card deck, no persistent order — it is a fresh opposed 2D6 roll each turn, and it is **per side, not per unit**.

## Movement is reverse-initiative *and* alternating (confirmed)

This is the detail that matters most for an engine:

> "The side that **lost** Initiative must act first. They choose one of their 'Mechs and assign it a movement action. The side that **won** Initiative then does the same. Movement **alternates** between sides until all 'Mechs have been moved."

So Classic BattleTech **is an alternating-activation game** — winning initiative means *moving last*, i.e. reacting with full information. But the alternation is **scoped to a phase**, not to a whole unit's turn. A unit does not "activate" once and do everything; it moves in the Movement Phase, then separately declares fire in the Weapon Attack Phase.

**This is the structural mismatch with a conventional skirmish engine**, which models activation as *unit → does all its things → next unit*. See [[classic-phase-activation-vs-unit-activation]].

### Unequal numbers rule (confirmed)
If one side has at least **twice** as many 'Mechs left to declare for, it declares for **two** per alternation; three times as many → **three**; and so on. This keeps the alternation balanced without leaving a mass of units to move at the end.

## Weapon attacks: declare-all, then resolve-all (confirmed)

The Weapon Attack Phase runs the same loser-first alternation, but as a **two-stage declare/resolve**:

1. **Declaration** — alternating, each 'Mech declares *all* attacks: which weapons, at what target(s), and whether it will **torso twist** or **flip arms**. **Declarations are locked** — "Players may not change an attack declaration once made."
2. **Resolution** — after *all* declarations, resolve one 'Mech at a time, loser-of-initiative first.

Two consequences the rules state explicitly:
- **All declared attacks must be made, even if the target is already destroyed** — a 'Mech always gets its declared attacks off even if it dies mid-phase. There is no "wasted shot" reallocation.
- Within one 'Mech, the controller chooses weapon resolution order, and **each hit is fully resolved (damage, crits) before the next** — including each individual missile hit.

**Simultaneity is real here.** Two 'Mechs can kill each other in the same phase. An engine that resolves an attack the instant it's declared cannot reproduce this.

## Physical Attack Phase (confirmed)

Repeats the Weapon Attack Phase's steps (declare/alternate/resolve), **except** no torso twisting or arm flipping. All physical damage lands **before** the Heat Phase — so a melee kill still doesn't spare the killer its own heat.

## Heat Phase (confirmed)

Adjust each 'Mech's heat scale for heat built and dissipated this turn, then resolve excess-heat effects (ammo explosion, MechWarrior damage). 'Mechs shut down by heat make **restart attempts here**. See [[classic-heat-scale]].

## End Phase (confirmed)

Cleanup and mandatory/optional odds and ends:
- Unconscious MechWarriors roll **2D6** to regain consciousness
- **Twisted torsos return to forward facing**
- **Flipped arms return to forward facing**
- Submerged 'Mech with destroyed life support → pilot takes 1 damage
- Voluntary shutdown, or restart of a previously voluntarily shut-down 'Mech

Note that torso twist un-does itself every End Phase — twist is a **per-turn transient facing modifier**, not a persistent state. That's a facing-system requirement: see [[classic-hit-location-and-facing]].

## Victory (confirmed)

Default: last side with surviving 'Mechs on the map. Simultaneous mutual destruction, or a stalemate where neither side can move or damage the other, is a **draw**. Scenarios may override.

## What an engine must own to run this

- A **six-phase turn machine** where a phase is a barrier — all units complete phase N before any starts N+1
- **Per-turn re-rolled side initiative**, with the loser acting first
- **Alternating activation within a phase**, with the 2:1 unequal-numbers ratio rule
- **Locked declarations** with deferred simultaneous resolution
- A **hex/facing spatial layer** ([[hex-vs-inches-is-the-fault-line]])
- A **heat economy** run as its own phase ([[classic-heat-scale]])
