---
tags: [wargame-research, battlefront-valkyrie]
source: https://miniature-mayhem.blogspot.com/2025/01/battlefront-valkyrie-at-ewg.html
confidence: confirmed
---

# Ship Destruction Triggers an Explosion Template (Chain Reactions)

When a ship is destroyed it **explodes**, damaging everything nearby — including friendlies.

Verbatim: "When a ship pops, it causes a multi-inch explosion template that hits any other ships within it for damage," and this can trigger **chain reactions** among already-damaged vessels.

Playtest reports describe "chaotic final moments" caused by cascading explosions.

**Not found:**
- The exact template radius (only "multi-inch").
- How much damage the explosion deals, and whether shields apply against it.
- Whether the explosion can itself destroy a ship and cascade further (**strongly implied by "chain reactions" but the recursion depth/limit is not stated**).
- Whether explosion damage uses the [[hit-location-hull-vs-engine|hull/engine location]] rules.

**Engine note:** this is a **recursive, order-dependent event cascade** — destruction emits an area event that can cause further destruction. It cannot be modelled as a simple "remove model" step. Combined with [[combat-igo-ugo-one-ship-at-a-time]], resolution order materially changes outcomes.

Related: [[measurement-in-inches]], [[hit-location-hull-vs-engine]]
