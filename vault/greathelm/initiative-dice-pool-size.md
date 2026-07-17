---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Initiative Dice Pool Size

Each player has their **own private pool**, regenerated every round.

QSR p1, verbatim:

> At the start of each round, you gain 1 initiative dice for every knight you control in the play area, plus 1. Each player starts the game with 7.

So: `pool = knights_currently_in_play + 1`. Opening pool = 6 + 1 = **7**.

## Minimum of 3

The Kickstarter text states a floor the QSR omits:

> The number of dice you roll is always 1 plus the number of knights currently under your control, to a minimum of 3 dice.

— https://www.kickstarter.com/projects/1674560143/greathelm

`confidence: partial` on the minimum: confirmed by the designer's Kickstarter copy, **not present in QSR v0.4**. See [[version-discrepancies-qsr-vs-kickstarter]]. The floor only binds at ≤1 knight remaining, so it rarely matters.

## Design consequence

The pool **shrinks as your knights die** — losing models costs you tempo as well as bodies, compounding a losing position. This is a deliberate death-spiral. `confidence: unverified` — this is my inference from the formula, not stated by any source.

## Components note

QSR p1 asks for "6 knights and 8 six-sided dice (per player)" — 8, not 7, presumably slack for the re-roll. Kickstarter says "About 10 six-sided dice per player."

Related: [[initiative-phase]] · [[initiative-dice-are-the-action-menu]]
