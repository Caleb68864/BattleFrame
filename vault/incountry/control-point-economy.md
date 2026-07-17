---
tags: [wargame-research, incountry]
source: https://www.boardgamequest.com/inx-incountry-review/
confidence: confirmed
---

# Control Points — A Per-Round Player-Level Resource With Three Sinks

**Control points** are a round-scoped resource granted by the chosen command card ([[command-card-initiative]]). They belong to the **player**, not to any individual model.

Confirmed sinks — control points may be spent to:
1. **Issue a unit a priority order** (moves that unit into the first activation pass — see [[activation-order-priority-units]]),
2. **Remove a unit's suppression token** ([[suppression-tokens]]),
3. **Bring an asset card into play** ([[asset-cards-off-table-support]]).

## Why this matters architecturally

This is a **player-scoped resource pool distinct from per-model action points**. An engine that models only per-unit action economy will miss it. It couples three otherwise-unrelated subsystems (turn order, status recovery, off-table assets) into one budget, so control points are a genuine cross-cutting piece of game state.

## Unknowns (not found)

- Typical control point counts per round.
- Cost of each sink (are all three 1 point? do assets cost more?).
- Whether unspent control points carry over between rounds (**probably not**, given they are re-granted by card each round — but this is an inference, not sourced).

Related: [[command-card-initiative]], [[activation-order-priority-units]], [[suppression-tokens]], [[asset-cards-off-table-support]]
