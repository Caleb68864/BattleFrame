---
tags: [wargame-research, battlefront-valkyrie]
source: https://www.fatdragongames.com/fdgfiles/battlefront-valkyrie-fdg0400/
confidence: confirmed
---

# Additional Subsystems (Existence Confirmed, Rules Not Found)

The publisher confirms the rulebook contains rules for each of the following. **Their existence is confirmed; their actual mechanics were not found in any public source.** Listed here so the engine architecture reserves space for them.

- **Missiles** — presumably distinct from direct-fire weapons; mechanics not found.
- **Drones** — purchasable in groups; see [[drones-and-mines]].
- **Deployable mines** — purchasable in packs; see [[drones-and-mines]].
- **Asteroids** — see [[asteroids]].
- **Tractor beams** — see [[tractor-beams]].
- **Ramming** — mechanics not found.
- **Drifting** — see [[drifting-and-voluntary-power-down]].
- **Special gear** — nature unknown.

Verbatim: "There's more stuff, like rules for missiles, drones, asteroids, deployable mines, tractor beams, ramming, drifting, special gear, etc. In all cases, the rules are brief and simple. **No complex subsystems here.**"

That last sentence is a useful architectural signal: the designer's own framing is that each of these is a **small, self-contained rule**, not a deep subsystem. An engine should expect ~8 lightweight rule modules, not 8 heavy ones.

Related: [[game-identity]], [[round-structure]]
