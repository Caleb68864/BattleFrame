---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Game Phases (Round Structure)

Each round has exactly three phases. QSR p1, verbatim:

> **INITIATIVE:** Roll and organize initiative dice.
> **BATTLE:** Activate knights with initiative dice.
> **COURAGE:** Damaged knights test courage.

## Loop

- [[initiative-phase]] — generate, roll, organize the pool.
- [[battle-phase-initiative-steps]] — spend dice, alternating.
- [[courage-phase]] — triggered "After all initiative dice have been spent" (QSR p2).
- Then [[victory-condition-quickstart]] is checked; if unmet, "start a new round from the initiative phase."

Dice do **not** carry between rounds — the pool is regenerated and re-rolled fresh each round. `confidence: partial` on the non-carryover point: the QSR never states it explicitly, but the initiative phase unconditionally re-gathers and re-rolls the pool, and the courage phase begins only once all dice are spent, which together leave no mechanism for carryover. Goonhammer states the loop plainly: "as long as the game hasn't ended then you go back up to the start to roll initiative dice and progress through each phase all over again!" (https://www.tabletopbattles.com/goonhammer-reviews-greathelm-a-micro-skirmish-game-of-chivalric-fantasy/)

## Round limit

The QSR has **no round limit** — the game runs until only one side has knights. Goonhammer indicates the full game does: "Each scenario will tell you how many rounds to play." Not found in the QSR.

Related: [[greathelm-overview]]
