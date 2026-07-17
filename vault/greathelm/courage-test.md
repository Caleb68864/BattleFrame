---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Courage Test — Roll-Under-Pressure d6

Resolved during the [[courage-phase]]. QSR p2, verbatim:

> **courage difficulty**
> Starting from zero, add..
> +1 for each allied knight **removed from play**.
> +1 for each **damage** on the knight taking the test.

> **taking courage tests**
> Roll a d6 for the testing knight.
> Roll **equal to or higher than** the courage test difficulty to pass and remain on the field.
> If you roll a **6**, the knight automatically passes the test and remain on the battlefield.
> If you fail the test, the knight **immediately flees the battlefield**.

## Difficulty formula

```
difficulty = (allied knights removed from play) + (damage markers on this knight)
```

Roll 1d6 ≥ difficulty to pass. Natural 6 always passes regardless of difficulty.

## Properties

- **Difficulty 0 or 1 is an auto-pass** (any d6 ≥ 1). So the first damaged knight of the game, with no allies dead, never actually fails.
- **Difficulty ≥ 7 means only a natural 6 saves you** — the auto-pass clause is the sole floor. At 4 allies dead + 3 damage = 7, you're on a 1-in-6.
- Damage is counted **per testing knight**, but casualties are counted **warband-wide**.

## The cascade — this is the game's real losing condition

Each knight lost raises the difficulty for *every remaining knight*. Fleeing knights are "removed from play", so a failed test presumably increments the counter for subsequent tests in the same phase — meaning **failures compound within a single courage phase**. Combined with [[courage-phase]]'s rule that the player with the most damage tests *first*, a bad round can collapse an entire warband at once.

`confidence: partial` on the intra-phase cascade: it follows from "removed from play" + "+1 for each allied knight removed from play" + tests being sequential, but no source states explicitly that a knight fleeing mid-phase raises difficulty for the rest of that same phase. **Verify against the full rulebook before implementing** — it materially changes the death-spiral rate.

Note this interacts with [[initiative-dice-pool-size]]: fewer knights → fewer dice → less ability to disengage → more tests.

Related: [[courage-phase]] · [[damage-and-removal]] · [[victory-condition-quickstart]]
