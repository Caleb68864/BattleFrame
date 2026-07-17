---
tags: [wargame-research, battlefront-valkyrie]
source: https://www.fatdragongames.com/fdgfiles/battlefront-valkyrie-fdg0400/
confidence: partial
---

# Action Economy: There Is No "Activation"

**Battlefront Valkyrie has no activation-based action economy.** A ship does not "activate and then do N actions."

Instead, a ship's agency is distributed across the [[round-structure|four phases]]:

| Phase | What a ship does |
|---|---|
| Command | Receives + spends [[reserve-power-allocation|Reserve Power cubes]] on card boxes/abilities |
| Movement | Moves once, when its turn in the [[movement-alternating-half-all-half\|half/all/half]] schedule comes up |
| Combat | Fires its weapons once, when its turn in the [[combat-igo-ugo-one-ship-at-a-time\|IGO-UGO]] alternation comes up |
| Repair | Attempts repair ([[repair-phase]]) |

**The real action economy is Reserve Power**, not actions. Cubes are the currency; ability boxes on the ship card are the sinks. The number of cubes derives from current Engine value, which makes the action economy **degrade as the ship takes damage** ([[engine-damage-death-spiral]]).

**Marked `partial`:** the phase-distributed structure is confirmed, but the **complete list of what Reserve Power can be spent on was not found**. Without that list, the action economy cannot be fully specified. This is the **single biggest research gap** — see [[research-gaps-and-how-to-close-them]].

**Engine note:** do not model this with an `Activation` or `ActionPoints` primitive borrowed from skirmish games. The primitives here are **Phase**, **PowerCube**, and **AbilityBox**.

Related: [[round-structure]], [[reserve-power-allocation]], [[ship-card-is-the-state-container]]
