---
tags: [wargame-research, incountry]
source: https://www.boardgamequest.com/inx-incountry-review/
confidence: confirmed
---

# Action Economy — Move Up To Speed, Then Shoot OR Take a Reaction Token

On activation a unit does two things in order:

1. **Move** up to its **speed value**.
2. **Then either shoot, or gain a reaction token** ([[reaction-token-overwatch]]).

"Units move up to their speed value, then either shoot or gain reaction tokens (overwatch)." — https://www.boardgamequest.com/inx-incountry-review/

## Why this matters architecturally

This is a **fixed two-slot activation**, not a spendable action-point pool. The second slot is an exclusive binary choice: act now (shoot) or bank a conditional future action (react). That means an activation can **install a trigger** rather than resolve an effect — the engine needs deferred/conditional action state, not just immediate resolution.

Note the interaction with [[control-point-economy]]: a "priority order" changes *when* a unit activates, not *how much* it does. Whether a priority order also grants extra actions is **not found**.

## Unknowns (not found)

- Whether a unit may shoot *before* moving, or split movement around shooting.
- Whether declining to move grants any benefit.
- Whether any unit/skill breaks the one-move-one-action pattern.
- Speed values, and whether speed is in inches ([[movement-and-measurement]]).

Related: [[reaction-token-overwatch]], [[activation-order-priority-units]], [[lean-token-and-line-of-sight]]
