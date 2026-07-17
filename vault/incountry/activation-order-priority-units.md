---
tags: [wargame-research, incountry]
source: https://blog.kaiscastle.com/2026/06/16/inx-incountry-review/
confidence: confirmed
---

# Activation Order — Alternating, Two-Pass, Priority Units First

Activation is **alternating unit-by-unit** (not IGO-UGO), and runs in **two passes** gated by priority status.

Sequence per round:
1. The player with initiative acts first (lowest score — see [[command-card-initiative]]).
2. Players **alternate activating their priority units**. Priority is conferred by spending a control point on a "priority order" ([[control-point-economy]]).
3. "Once all priority units have acted, **the rest can take a turn**." — https://blog.kaiscastle.com/2026/06/16/inx-incountry-review/

## Why this matters architecturally

The activation queue is **not** a static list. It is partitioned into two tiers, and membership in the priority tier is **purchased at the start of each round** with a resource. An engine needs:
- a per-round mutable priority flag on each unit,
- an alternating turn pump that drains the priority pool before the non-priority pool,
- handling for asymmetric pool sizes (one player may buy more priority units than the other).

## Unknowns (not found)

- What happens when one player has more priority units than the other — does the other player skip, or double-activate?
- Whether the second (non-priority) pass also alternates, and who leads it.
- Whether an unactivated unit can be held/passed.

Related: [[command-card-initiative]], [[control-point-economy]], [[action-economy-move-then-shoot-or-react]]
