---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/api/v13/variables/CONFIG.Combat.html , https://gitlab.com/peginc/swade/-/raw/develop/src/module/documents/combat/SwadeCombat.ts
confidence: confirmed
---

# Turn Order Model Is Replaceable, Storage Is Not

The headline answer on combat. **The ordering *model* is fully replaceable; the ordering *storage* is not.**

## What you CAN do (all confirmed by shipping systems)

- **Group/squad activation** — [[swade-card-based-initiative-precedent|SWADE]]'s `_sortCombatants` sorts by group membership with leaders first; `setupTurns` calls `expandGroupIfNeeded()`.
- **Non-deterministic activation** — [[lancer-activation-based-combat-precedent|Lancer]]'s `nextTurn` sets `turn: null` rather than advancing, because "the next up isn't deterministic."
- **Recompute order mid-round** — `setupTurns()` is re-invocable and re-sorts from live combatant state.
- **Replace the tracker UI wholesale** — see [[combat-tracker-is-replaceable-via-config-ui-combat]].

## What core hard-assumes and you CANNOT override

1. **`Combatant#initiative` is a `NumberField`.** This is schema, not method — non-numeric order values cannot be persisted there.
2. **`Combat#setInitiative(id, value: number)`** is number-typed.
3. **`turn` is a numeric index into `this.turns`.** `startCombat` "advanc[es] to round 1 and turn 1". You can set `turn: null` (Lancer does) but `turn` cannot be a string key.
4. **`_sortCombatants(a, b): number` is a synchronous comparator.** No async lookups inside it.
5. **`setupTurns(): Combatant[]` must synchronously return a flat array.** A true nested/tree turn structure must be flattened for core, with hierarchy reconstructed in your own tracker UI.

## The universal workaround

Every exotic system *projects* its ordering onto a number. Two variants:

- **Project and store** — SWADE encodes card value + suit as `value + suit/10`, keeping cards as the real source of truth in separate fields.
- **Ignore entirely** — Lancer does `initiative ??= 0` and sorts on its own data inside `_sortCombatants`.

For Battleframe (group activation, dice-pool-driven order): the second pattern is the fit. Sort on ruleset-owned flag data, never populate `initiative`, and rebuild presentation in a custom tracker.

Related: [[combat-overridable-methods-reference]].
