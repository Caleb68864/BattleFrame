---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/api/v13/variables/CONFIG.Combat.html , https://foundryvtt.com/api/classes/foundry.documents.Combat.html
confidence: confirmed
---

# Combat Overridable Methods Reference

Signatures verbatim from the v13 API docs. Register your subclass with `CONFIG.Combat.documentClass`.

| Method | Signature | Notes |
|---|---|---|
| `_sortCombatants` | `(a: Combatant, b: Combatant): number` | Protected, **sync** comparator. "Define how the array of Combatants is sorted." The primary hook. |
| `setupTurns` | `(): Combatant[]` | "Return the Array of combatants sorted into initiative order, breaking ties alphabetically by name." Sync; populates `this.turns`. |
| `nextTurn` / `nextRound` | `(): Promise<Combat>` | Overridable. |
| `previousTurn` / `previousRound` | `(): Promise<Combat>` | Overridable. |
| `rollInitiative` | `(ids: string\|string[], options?: {formula?: string\|null; messageMode?: string; messageOptions?: object; updateTurn?: boolean}): Promise<Combat>` | Assumes it writes a number per combatant. |
| `setInitiative` | `(id: string, value: number): Promise<void>` | **`value: number` hard-typed.** |
| `startCombat` | `(): Promise<Combat>` | "advancing to round 1 and turn 1". |
| `_onStartTurn` / `_onEndTurn` | `(combatant: Combatant, context: CombatTurnEventContext): Promise<void>` | Protected. |
| `_onStartRound` / `_onEndRound` | `(context: CombatRoundEventContext): Promise<void>` | Protected. |
| `_manageTurnEvents` | `(): Promise<void>` | Orchestrates "End Turn, End Round, Begin Round, Begin Turn". |
| `resetAll` | `(options?: {updateTurn?: boolean}): Promise<Combat>` | — |
| `getCombatantsByActor` | `(actor: string\|Actor): Combatant[]` | Returns an **array** — v13+ change, multiple combatants per actor. Directly useful for squads. |

State: `turns: Combatant[]`, `current` / `previous` (`CombatHistoryData`), accessors `combatant`, `nextCombatant`, `started`, `settings`.

**Combatant side:** `getInitiativeRoll(formula: string): Roll`; `_getInitiativeFormula(): string` — protected, and the docs explicitly invite override: *"Modules or systems could choose to override or extend this to accommodate special situations."*; `rollInitiative(formula?: string): Promise<Combatant>`.

**Not found:** the field options on `Combatant#initiative` (`required`/`nullable`/`integer`) are not stated in the docs — would need `BaseCombatant` source to confirm.

Limits: [[turn-order-model-is-replaceable-but-storage-is-not]]. Config: [[config-combat-initiative-has-no-default-formula]].
