---
tags: [foundry-vtt, system-development]
source: https://raw.githubusercontent.com/Eranziel/foundryvtt-lancer/master/src/module/combat/lancer-combat.ts
confidence: confirmed
---

# Lancer: Activation-Based Combat Precedent

The closest precedent to a wargame activation model — Lancer has **no initiative at all**.

- Activations are stored per combatant as `system.activations = {max, value}`, with `resetActivations()` and `modifyCurrentActivations()`.
- `_sortCombatants`: "Sort by Players then Neutrals then Hostiles" — `b.disposition - a.disposition`, then defers to `super`.
- **`nextTurn` sets `turn: null`** instead of advancing — because "the next up isn't deterministic." Players choose who activates next.
- Does **not** override `setupTurns`.
- `prepareBaseData()` does `initiative ??= 0` — initiative exists only to satisfy the schema and does not drive order.

**This is the more radical of the two precedents.** Where [[swade-card-based-initiative-precedent|SWADE]] projects its model onto `initiative`, Lancer abandons `initiative` entirely and lets the players drive selection. `turn: null` is the key trick — it tells core "no current turn" rather than fighting the numeric index.

**Lesson for Battleframe:** if turn order is player-chosen activation (which most skirmish wargames are), Lancer's shape is the template — ignore `initiative`, sort on your own data, set `turn: null`, and own the tracker UI ([[combat-tracker-is-replaceable-via-config-ui-combat]]).

**Not found:** the `lancer-initiative` module's source could not be verified — `BoltsJ/lancer-initiative` raw paths 404'd and GitHub code search required auth. Any claim about that module is **unverified**; it is worth locating separately, since a *module* supplying combat behaviour to a system is directly analogous to Battleframe's design.

Related: [[turn-order-model-is-replaceable-but-storage-is-not]].
