---
tags: [foundry-vtt, system-development]
source: https://gitlab.com/peginc/swade/-/raw/develop/src/module/documents/combat/SwadeCombat.ts
confidence: confirmed
---

# SWADE: Card-Based Initiative Precedent

The best evidence that **non-numeric turn order works in Foundry** — SWADE orders combat by drawing playing cards, not rolling dice.

`rollInitiative` draws cards from a Foundry Cards deck, handles Hesitant / Level Headed / Quick / Incapacitated / redraw rules, then **projects card → number**:

```js
const initiative = pickedCard.value + pickedCard.system['suit'] / 10;
```

Suit becomes a decimal tiebreaker. Crucially, SWADE persists `cardValue`, `suitValue`, `hasJoker`, `cardString` as its **real source of truth** — `initiative` is a derived sort key, not the model.

`_sortCombatants` sorts by a rich multi-level key: group membership (leaders first; within group, player-owned before GM, Wildcards before Extras, Command edge prioritized) → Hold status → `iniB - iniA` → name → id. **This is group activation working in production.**

`setupTurns` calls `super` then `expandGroupIfNeeded()`.

Registration (`src/swade.ts`), verbatim:
```js
CONFIG.Combat.documentClass    = SwadeCombat;
CONFIG.Combatant.documentClass = SwadeCombatant;
CONFIG.ui.combat               = SwadeCombatTracker;
if (CONFIG.Combat.initiative.decimals < 7) CONFIG.Combat.initiative.decimals = 7;
CONFIG.time.roundTime = 6;
```

Note it bumps `decimals` to 7 to preserve the suit fraction, never sets `initiative.formula`, and replaces the tracker UI.

**Lesson for Battleframe:** the projection trick (real model in your own fields, numeric `initiative` as a derived sort key) is the sanctioned pattern. See [[turn-order-model-is-replaceable-but-storage-is-not]].

Contrast: [[lancer-activation-based-combat-precedent]].
