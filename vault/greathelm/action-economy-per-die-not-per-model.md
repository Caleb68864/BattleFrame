---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Action Economy — Per Die, Not Per Model

There is **no per-model activation limit**. QSR p1, verbatim:

> A knight can be activated multiple times in a round, or not at all. It is your choice.

Kickstarter is blunter:

> A knight may perform multiple actions in a round, or none at all—there is no limit on the number of actions a single knight can take.

— https://www.kickstarter.com/projects/1674560143/greathelm

## Consequence for modelling

Do **not** put an `activated: bool` flag on the knight. The budget lives entirely in the [[initiative-dice-pool-size]]. A knight is just a target for a die you already hold. You could legally pour all 7 dice into one knight.

One die = one action = one turn. There is no multi-action activation.

## What actually restrains it

Nothing in the rules — the checks are emergent:

- **Momentum caps at 3** ([[momentum]]), so repeatedly Sprinting one knight wastes the surplus. Goonhammer: "A knight can only have up to three momentum tokens at a time so there's sort of a limit to how much running around is worth doing."
- **[[outnumbering]]** punishes a lone knight who outruns his allies. Goonhammer: "You are free to keep activating the same model multiple times in a turn without any penalty but if they rush up the table then they're sure to be outnumbered with allies too far back to help."

So the restraint is positional and economic, not a hard rule. This is worth preserving in any port — the temptation to add a limiter would break the design.

Related: [[turn-options-activate-adjust-pass]] · [[initiative-dice-are-the-action-menu]]
