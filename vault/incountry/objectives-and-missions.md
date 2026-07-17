---
tags: [wargame-research, incountry]
source: https://www.boardgamequest.com/inx-incountry-review/
confidence: confirmed
---

# Objectives — Five Scenario-Driven Missions, Including Asymmetric

Victory is **scenario-defined**, not a single universal condition.

**Confirmed:** the INX 2.0 starter set contains **5 missions** with varied objectives (https://www.boardgamequest.com/inx-incountry-review/):
- **Elimination** — "straight-up death match"
- **Objective control** — hold points
- **Escape the board** — exit models off a table edge
- **Asymmetric attack/defence** — "a somewhat asymmetric mission where one side is defending and the other is attacking"

The publisher also sells a standalone product line **"Escape From Incountry 2.0"** (https://inxcountry.com/collections/escape-from-incountry-2-0), suggesting the escape scenario type is developed further as its own supplement. Its rules relationship to base 2.0 is **not found**.

## Why this matters architecturally

- Win conditions must be **pluggable per scenario**, not hardcoded.
- The **asymmetric attack/defence** mission means scenarios can assign *different* win conditions to each side — the objective model cannot assume both players score on the same axis.
- **Board-exit** as a win condition means the table edge is a scoring zone, and models can legitimately leave play without being casualties. An engine must distinguish "removed: escaped" from "removed: killed."

## Unknowns (not found)

- Whether scoring is **incremental per round** or **end-of-game only**.
- Any points/VP tally system, or whether missions are simply win/lose.
- Round limit / game length in rounds. Reviews give a wall-clock length ([[table-size-and-game-length]]) but no round cap.
- Whether missions are drawn randomly or chosen.

Related: [[force-construction-tiers-and-teams]], [[table-size-and-game-length]]
