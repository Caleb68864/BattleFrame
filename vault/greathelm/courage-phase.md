---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Courage Phase

Third and final phase of the round. QSR p2, verbatim:

> **courage phase**
> After all initiative dice have been spent, the round moves to the courage phase.

> **courage tests**
> Any damaged knight in base contact with an enemy must take a courage test.
> The player with the most total damage markers on their knights takes all of their tests first.
> If tied, player with fewest remaining knights tests first.

## Who tests

Both conditions required:
1. The knight has **≥1 damage marker**, AND
2. is in **base contact with an enemy** ([[base-contact-and-engagement]]).

An undamaged knight never tests. A damaged knight standing alone never tests. So **disengaging is a real defensive play** — Shift (face 3) out of contact and you skip the test entirely. This is likely why step 3 exists where it does in [[battle-phase-initiative-steps]]. `confidence: unverified` — that reading is mine.

## Test order

- Player with **most total damage markers across their whole warband** goes first, and takes **all** their tests before the opponent takes any.
- Tie → player with **fewest remaining knights** tests first.
- Note both tiebreaks favour making the *losing* player test first — which is brutal, because their failures raise their own subsequent difficulties. See [[courage-test]] and its cascade property.

Then [[victory-condition-quickstart]] is checked.

Related: [[courage-test]] · [[game-phases-round-structure]]
