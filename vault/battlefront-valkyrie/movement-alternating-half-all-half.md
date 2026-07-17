---
tags: [wargame-research, battlefront-valkyrie]
source: https://www.fatdragongames.com/fdgfiles/battlefront-valkyrie-fdg0400/
confidence: confirmed
---

# Movement Order: Half / All / Half Split Activation

The Movement Phase uses an unusual **three-step split** driven by the [[initiative-via-sensor-roll|initiative winner]]:

1. **Initiative winner moves HALF their ships.**
2. **Initiative loser moves ALL their ships.**
3. **Initiative winner moves the REST of their ships.**

Verbatim: "the winner moving half their ships, followed by the loser moving all their ships, then the winner moving the rest of their ships."

This is the game's central positional tension: winning initiative is **not** a pure advantage. The winner must commit half their fleet blind, then gets to react with the other half. The loser gets full information on half the enemy fleet but must commit everything at once.

**Not found:**
- How "half" rounds for odd-numbered fleets (round up or down?).
- Whether the winner *chooses* which ships go in the first half (almost certainly yes, but **unverified**).
- Whether ships within a step move in any mandated order.

**Engine note:** this rule alone means a naive `for player in players: for ship in player.ships` loop is wrong. Movement order needs an explicit, initiative-derived schedule built per round.

Related: [[round-structure]], [[combat-igo-ugo-one-ship-at-a-time]], [[measurement-in-inches]]
