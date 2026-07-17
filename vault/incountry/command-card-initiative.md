---
tags: [wargame-research, incountry]
source: https://www.boardgamequest.com/inx-incountry-review/
confidence: confirmed
---

# Initiative — Command Card Selection, Low Score Goes First

INCOUNTRY 2.0 initiative is **card-driven and simultaneous-selection**, not a die roll and not a fixed player order.

Each round, **each player chooses a command card**. That card determines two things at once:
1. how many **control points** the player gets that round (see [[control-point-economy]]), and
2. the player's **initiative score** for the round.

**Lower initiative goes first in the round.** (Confirmed by two independent reviews using near-identical wording — https://www.boardgamequest.com/inx-incountry-review/ and https://blog.kaiscastle.com/2026/06/16/inx-incountry-review/)

## Why this matters architecturally

The card creates a deliberate **tension/trade-off**: initiative and resource are bought from the same choice, so going first likely costs control points (or vice versa). An engine cannot model initiative as a derived stat — it is a per-round player *decision*.

## Unknowns (not found)

- Whether command card selection is **simultaneous and hidden** then revealed. Reviews do not say. This is a fog-of-war-relevant gap — see [[hidden-information-and-fog-of-war]].
- Whether cards are spent/exhausted from a hand across the game, or re-chosen freely each round.
- Tie-breaking on equal initiative scores.
- The actual range of initiative values / control point values.

Related: [[activation-order-priority-units]], [[control-point-economy]]
