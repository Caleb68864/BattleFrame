---
tags: [wargame-research, battlefront-valkyrie]
source: https://www.rpgpub.com/threads/battlefront-valkyrie.11275/
confidence: confirmed
---

# Range Bands Modify the Dice Pool, Not the Target Number

Ranges are categorised as **short / medium / long**. Range does not change the to-hit number (always 4+ per [[attack-roll-resolution]]); it changes **how many dice you roll**.

| Range | Modifier |
|---|---|
| Short | **+1d6** |
| Medium | no modifier (implied) |
| Long | **−1d6** |

Verbatim: "Long-range attacks subtract 1d6 damage while short-range adds 1d6." And: "Roll a number of dice based on the weapon, with an added or subtracted die for close/long range."

The "medium = no modifier" row is **inference from the three-band structure and the fact that only short and long are ever mentioned as modifiers** — marked as implied, not confirmed.

**Not found:** the actual distances in inches for each band, and whether bands are per-weapon or global.

**Engine note:** dice-pool modification (rather than TN modification) keeps the probability curve per-die fixed at 50% hit / 1-in-6 engine — a clean separation that makes the damage model easy to compute.

Related: [[attack-roll-resolution]], [[firing-arcs]], [[measurement-in-inches]]
