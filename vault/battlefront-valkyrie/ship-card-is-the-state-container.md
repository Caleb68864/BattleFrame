---
tags: [wargame-research, battlefront-valkyrie]
source: http://edmontonwargamer.blogspot.com/2025/09/battlefront-valkyrie.html
confidence: confirmed
---

# The Ship Card Is the Entire State Container

**All ship state lives on the physical ship card.** This is the game's defining design choice and reviewers single it out as its greatest strength.

Verbatim: "super-slick energy allocation and combat system, **all managed on ship cards**. This is very, very well designed."

The card holds:
- **Shield dice per arc**, colour-coded, in `full/reduced` slash notation on the **left side** ([[shield-dice-defense]], [[firing-arcs]])
- **Reserve Power ability boxes** along the **bottom**, where cubes are placed ([[reserve-power-allocation]])
- **Weapon stats** — dice, arcs, range bands ([[attack-roll-resolution]])
- **Points cost** ([[fleet-construction-points]])
- **Turn rating** ([[tractor-beams]])

Hull and Engine values are tracked **off-card on dial counters** (included in the starter set; a community remix exists at MakerWorld model 874225).

**Engine note — this is the key architectural insight.** The ship card is a **complete, self-contained entity state model**. Everything a ship needs to resolve any rule is on one card plus two dials. There is no global state a ship must consult, no army-wide morale, no shared pool. That maps cleanly onto an **ECS-style component per card region** or a single `Ship` aggregate. The physical design has already done the data modelling — follow it rather than inventing a schema.

Related: [[action-economy-is-not-activation-based]], [[fleet-construction-points]]
