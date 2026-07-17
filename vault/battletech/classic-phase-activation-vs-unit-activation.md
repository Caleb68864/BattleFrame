---
tags: [wargame-research, battletech]
source: https://static1.squarespace.com/static/5e5f11b6a6b48b3ae5c4ee36/t/5e69a64e3d430e6e35ad7fda/1583982189894/CAT3500D+BattleTech+A+Game+of+Armored+Combat+Rulebook.pdf
confidence: confirmed
---

# Phase Activation vs. Unit Activation

A focused note on one concept: **Classic BattleTech alternates activation, but not the way a skirmish engine means it.** Split out of [[classic-battletech-mechanics]].

## The two models

**Unit activation** (One Page Rules, Infinity, most modern skirmish, and what a typical Foundry system assumes):

```
for each unit, alternating between players:
    unit moves, shoots, does everything
    → fully resolved before the next unit acts
```

**Phase activation** (Classic BattleTech):

```
for each phase in [Init, Move, Weapon, Physical, Heat, End]:
    for each unit, alternating between players:
        unit does ONLY this phase's action
    barrier — all units finish the phase before any advances
```

The rulebook is explicit about the barrier: "The players execute the phases in a given order, with **all players completing a phase before anyone moves onto the next phase**."

## Both games alternate. The unit of alternation differs.

This is the trap. Reading "movement alternates between sides until all 'Mechs have been moved" makes Classic look like a familiar IGOUGO-alternating game, and an engine with alternating activation looks like a match. **It isn't.** In Classic, a unit is *touched six times per turn* — it doesn't have a turn of its own at all. There is no moment where "the Atlas is activating."

The consequence: a unit's actions are **not co-located in time**. Every 'Mech on the board moves before *any* 'Mech shoots.

## Why this isn't a cosmetic reordering

Three rules make phase separation load-bearing rather than stylistic:

1. **Information symmetry in movement.** Because *all* movement precedes *all* shooting, a 'Mech that moves early is exposed to every opponent's positioning decision. Winning initiative means **moving last** — the reward is reacting with full knowledge. In a unit-activation game, moving and shooting together means you never grant that window. Collapsing the phases destroys initiative's entire meaning.

2. **Declaration lock + deferred resolution.** Attacks are all declared (and locked — "Players may not change an attack declaration once made") before any are resolved. Then: "All declared attacks **must be made, even if the intended target is destroyed** before all attacks against it have been resolved."

3. **Real simultaneity.** Two 'Mechs can destroy each other in the same Weapon Attack Phase. The rules bless this — a 'Mech "always gets to make its declared attacks for the phase, even if that 'Mech or its weaponry winds up being destroyed in that phase." Victory conditions explicitly cover simultaneous mutual destruction as a **draw**.

An engine that resolves an attack the moment it's declared cannot express any of this. Overkill is not reallocated; dead 'Mechs still shoot; mutual kills happen.

## Inter-phase state is a first-class thing

Because a unit's actions are spread across phases, values must **survive between phases within a turn**:

- **Movement mode + hexes traversed** → produced in the Movement Phase, consumed in the Weapon Attack Phase as the A and T of GATOR ([[classic-to-hit-modifiers]]). The tabletop physically models this with a **movement die** left on the board.
- **Torso twist / arm flip** → declared in the Weapon Attack Phase, applies through the Physical Attack Phase, **auto-reverts in the End Phase** ([[classic-hit-location-and-facing]]).
- **Heat accrued** → generated across Movement and Weapon Attack, banked, and not applied until the **Heat Phase** ([[classic-heat-scale]]).

A unit-activation engine has nowhere natural to put this. Its state model is *"unit does its thing, resolve, done"* — there is no turn-scoped, cross-phase scratch space, because nothing ever needed one.

## The engine requirement

To run Classic you need a **turn machine whose primary loop is the phase, not the unit** — with alternating activation nested *inside* each phase, a declaration buffer, a barrier between phases, and turn-scoped per-unit state that different phases write and read.

That is not a feature you add to a unit-activation engine. It's a different top-level control flow. See [[engine-fit-assessment]].
