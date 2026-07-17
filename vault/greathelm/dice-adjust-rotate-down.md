---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Dice Adjust — Rotate Down One

The only way to change a die after the [[initiative-phase]] re-roll. QSR p1, verbatim:

> **Dice adjust:** Rotate one of your highest initiative dice down one number. Your turn ends.

## Properties

- **Downgrade only.** You can never raise a die. Value flows one direction: 6 → 5 → 4 → 3 → 2 → 1.
- **Costs a full turn.** You trade tempo for flexibility.
- **Restricted to your *highest* dice** — per QSR wording, i.e. dice at the current initiative step. You cannot reach down and adjust a low die you're saving.

## Discrepancy with Kickstarter

The Kickstarter phrases it without the "highest" restriction:

> On your turn, instead of taking an action, you may choose to reduce the value of one of your current initiative dice by 1. Since each action is linked to a specific initiative step, adjusting a die can be a key tactical move to create opportunities with future actions.

— https://www.kickstarter.com/projects/1674560143/greathelm

"current initiative dice" is ambiguous but plausibly means the same thing (dice at the current step). QSR v0.4's "highest" is the tighter, authoritative reading. See [[version-discrepancies-qsr-vs-kickstarter]].

## Why it exists

It converts surplus movement dice into attacks. A 6-heavy roll wins [[initiative-order-determination]] but cannot damage anyone; adjusting walks those 6s down toward 2s and 1s at one turn each. Goonhammer: "Instead of activating a model in that step a player can move that dice to the next step below, giving you the option to always have dice available to attack."

Note the interaction with [[battle-phase-initiative-steps]]: adjusting a die from 6 to 5 keeps it in play for the *next* step down, so it is never lost — only delayed. But walking a 6 all the way to a 1 costs five turns.

Related: [[turn-options-activate-adjust-pass]]
