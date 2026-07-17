---
tags: [wargame-research, incountry]
source: https://blog.kaiscastle.com/2026/06/16/inx-incountry-review/
confidence: confirmed
---

# Combat Resolution — d10 Roll-Under Against the Weapon's Attack Value

Shooting is a **roll-under pool**, not an opposed roll and not a roll-to-beat-a-target-number.

- The attacker rolls **d10s — typically two per attack** — against the **gun's attack value**.
- **"Each number equal to or below is a hit."** — https://blog.kaiscastle.com/2026/06/16/inx-incountry-review/
- Hits then feed damage: "successful hits adding damage totals to the weapon's base value" (https://www.boardgamequest.com/inx-incountry-review/) — i.e. hits **accumulate into a single damage number** built on the weapon's base damage, rather than each hit being resolved separately.

Damage is then compared to the target's defence — see [[damage-armor-saves-and-headshots]].

## Why this matters architecturally

- Roll-under on d10 means the **weapon stat is the target number** and lives on the weapon, not the shooter — relevant to how stats are attached in a data model.
- Hits **aggregate** into one damage event rather than N independent wound rolls. One shot = one damage resolution.

## Unknowns (not found)

- The exact formula converting hit count into the final damage number ("adding damage totals to the weapon's base value" is ambiguous — +1 per hit? add the die face?).
- What modifies the attack value: range bands, cover, movement, suppression. Reviews mention cover benefits via [[lean-token-and-line-of-sight]] but do not state the modifier.
- Why "typically two" d10s — what varies the dice count (weapon? skill? range?).
- Whether natural 1s / 10s do anything special.
- Melee/close combat rules: **not found**.

Related: [[damage-armor-saves-and-headshots]], [[action-economy-move-then-shoot-or-react]], [[lean-token-and-line-of-sight]]
