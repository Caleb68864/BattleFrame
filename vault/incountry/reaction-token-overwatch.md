---
tags: [wargame-research, incountry]
source: https://inxcountry.com/pages/game
confidence: confirmed
---

# Reaction Tokens — Banked Overwatch and Counter-Attacks

The **reaction token** is the mechanic the publisher leads with: "innovative reaction mechanics" is INCOUNTRY's headline claim (https://inxcountry.com/pages/game).

Confirmed behaviour:
- A unit that forgoes shooting on its activation may instead **gain a reaction token** ([[action-economy-move-then-shoot-or-react]]).
- **"A unit with a reaction token can make overwatch or counter attacks."**
- Reaction tokens are physical components: the INX 2.0 token set ships **10x Green Reaction Tokens** (https://inxcountry.com/products/inx-token-set).

## Why this matters architecturally

Reactions mean the engine cannot assume **one actor acts at a time**. An opposing unit's move or shot can interrupt and invoke a resolution belonging to a different player, out of activation order. This requires an interrupt/trigger system and a clear resolution stack.

That the token set caps at 10 suggests a practical (possibly rules-enforced) ceiling on simultaneous reaction tokens per side — **unverified**; component counts are not necessarily rules limits.

## Unknowns (not found)

- The **trigger condition**: what enemy action provokes a reaction (entering line of sight? moving? shooting?).
- Whether the reaction resolves **before or after** the triggering action.
- Whether the token is **consumed** on use, or persists.
- Whether the token persists **across rounds** or clears at round end.
- The distinction in rules terms between an "overwatch" and a "counter attack."
- Whether reactions can chain (a reaction triggering another reaction).

These are the single most important gaps for an engine design. The trigger/resolution-order question in particular cannot be inferred safely.

Related: [[action-economy-move-then-shoot-or-react]], [[combat-resolution-d10]], [[open-questions-and-gaps]]
