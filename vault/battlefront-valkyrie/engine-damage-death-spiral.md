---
tags: [wargame-research, battlefront-valkyrie]
source: https://miniature-mayhem.blogspot.com/2025/01/battlefront-valkyrie-at-ewg.html
confidence: confirmed
---

# Engine Damage Is a Three-Way Death Spiral

**Engine is the load-bearing stat of the entire game.** Damaging it degrades three separate systems at once:

1. **Movement** — reduces speed. ([[movement-alternating-half-all-half]])
2. **Reserve Power** — fewer power cubes available. ([[reserve-power-allocation]])
3. **Shields** — shield dice drop to the reduced value. ([[shield-dice-defense]])

Confirmed: "Engine damage directly weakens shields, reduces movement speed, and decreases available reserve power." And: "The better your engines, the more reserve power cubes you will have to use."

At **Engine 0** the ship cannot move and begins **drifting** — see [[drifting-and-voluntary-power-down]].

**This is the single most important coupling in the game's data model.** Engine is not a stat that gates one subsystem; it is an input to movement, the action economy, and defence simultaneously. Any engine architecture must treat Engine as a derived-value source, recomputed on change, with at least three dependents.

Note the interaction with [[hit-location-hull-vs-engine]]: engine hits happen on a 6 (1/6 of dice), and per [[shield-dice-defense]] shields block hull damage *first* — so engine damage is both rare and hard to prevent.

Related: [[repair-phase]], [[known-criticism-initiative-is-fiddly]]
