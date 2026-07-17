---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/api/v13/variables/CONFIG.Combat.html
confidence: confirmed
---

# CONFIG.Combat.initiative Has No Default Formula

The real shape of `CONFIG.Combat` in v13:

```
documentClass:      typeof foundry.documents.Combat
dataModels:         Record<string, typeof TypeDataModel>
typeLabels:         Record<string, string>
typeIcons:          Record<string, string>
initiative:         { formula: null; decimals: number }
sounds:             { epic: {label, nextUp[], startEncounter[], yourTurn[]}, mc: {...} }
fallbackTurnMarker: string
```

**`initiative.formula` is typed `null` by default.** Core ships no initiative formula. A system must either set it or override `Combatant#_getInitiativeFormula`. A system that does neither simply has no roll-based initiative — which is a legitimate choice, not a broken state ([[lancer-activation-based-combat-precedent|Lancer]] never sets it).

`decimals` controls rounding of the stored/displayed number. [[swade-card-based-initiative-precedent|SWADE]] bumps it to 7 to preserve its suit fraction:
```js
if (CONFIG.Combat.initiative.decimals < 7) CONFIG.Combat.initiative.decimals = 7;
```

Note `CONFIG.Combat` also carries `dataModels` / `typeLabels` / `typeIcons` — **Combat itself supports subtypes**, same as Actor and Item. A ruleset module could in principle contribute a Combat subtype ([[modules-can-contribute-document-subtypes]]), though a single system-level Combat subclass dispatching to the active ruleset is the simpler path.

Also confirmed alongside: `CONFIG.time.roundTime` (SWADE sets 6).

Related: [[combat-overridable-methods-reference]].
