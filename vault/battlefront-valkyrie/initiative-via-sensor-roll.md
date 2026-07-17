---
tags: [wargame-research, battlefront-valkyrie]
source: https://www.fatdragongames.com/fdgfiles/battlefront-valkyrie-fdg0400/
confidence: partial
---

# Initiative via Sensor Roll

Initiative is **re-determined every round** during the [[round-structure|Command Phase]] by a **sensor roll**.

Confirmed: "In the Command Phase reserve power is allocated and sensor rolls determine initiative."

**What is NOT found in public sources:**
- The exact dice mechanic of the sensor roll (die type, number of dice, whether it is opposed).
- Whether ship Sensor rating is a per-ship stat, a fleet-wide stat, or the best sensor in the fleet.
- Tie-breaking rules.
- Whether reserve power can be spent to boost the sensor roll (**plausible given [[reserve-power-allocation]] feeds "boxes/abilities", but unverified — do not assume**).

Initiative produces a binary **winner/loser**, which then drives both [[movement-alternating-half-all-half]] and [[combat-igo-ugo-one-ship-at-a-time]].

**Ordering subtlety worth noting for an engine:** power is allocated *before* initiative is known (both happen in the Command Phase, and the publisher text lists allocation first). Whether allocation is strictly before the sensor roll is **partial** — the sequence within the Command Phase is implied by word order only, not confirmed.

Related: [[round-structure]], [[known-criticism-initiative-is-fiddly]]
