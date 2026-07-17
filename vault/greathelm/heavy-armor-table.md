---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Heavy Armor Table

The **second** roll of an attack. Rolled by the defender *after losing* a [[clash-test]]. QSR p2, verbatim:

> If the defender loses a clash test they may take damage. (**Bashes do not deal damage**) Roll a d6:
>
> **6: Impervious.** No damage markers are applied.
> **2-5: Struck.** Damage markers from the attack are applied.
> **1: Pierced.** Damage markers +1 from the attack are applied.

## Distribution

| Roll | Result | Effect | p |
|---|---|---|---|
| 6 | Impervious | 0 damage | 1/6 |
| 2–5 | Struck | damage as declared | 4/6 |
| 1 | Pierced | damage **+1** | 1/6 |

Expected multiplier on a Heavy attack (2 base): (4/6 × 2) + (1/6 × 3) + (1/6 × 0) = **1.83**. On a Light attack (1 base): (4/6 × 1) + (1/6 × 2) + (1/6 × 0) = **1.0**. `confidence: unverified` — arithmetic mine.

## Key points

- **Bashes never reach this table** — Bash deals no damage at all. See [[bash-action]].
- **Riposte bypasses it entirely** — "deals attacker 1 damage with no armor table roll" ([[clash-defenses]]). This is the only guaranteed damage in the game, and the table is exactly why that clause is valuable.
- Winning a clash therefore does **not** guarantee damage: 1-in-6 of all successful attacks are shrugged off.
- It's called "**heavy** armor table", implying alternates. Goonhammer confirms a light armour variant in the full game: "Light armour will instead take that extra damage on a 1-3 while having +1 to all dodge rolls and also +1" to all moves" (https://www.tabletopbattles.com/goonhammer-reviews-greathelm-a-micro-skirmish-game-of-chivalric-fantasy/). So **armour type selects which table you roll on** — a clean extension point. The light table's full face-by-face breakdown is **not found**.

Related: [[clash-test]] · [[damage-and-removal]] · [[equipment]]
