---
tags: [wargame-research, one-page-rules]
source: https://army-forge.onepagerules.com/api/tts?id=test
confidence: confirmed
---

# The /api/tts Schema Is a Ready-Made VTT Import Format

The JSON returned by `GET /api/tts?id={listId}` is **already shaped like a VTT actor import**. It carries every field a Foundry token/actor needs, pre-resolved. This is the concrete import contract for a BattleFrame OPR module.

Observed top-level keys (from `id=test`):

```
id, key, name, isCloud, forceOrg, modified, gameSystem, modelCount,
description, pointsLimit, campaignMode, cloudModified, narrativeMode,
activationCount, listPoints, units, specialRules, forceOrgErrors
```

Observed per-unit keys:

```
id, cost, name, size, bases, items, rules, valid, defense, quality,
weapons, upgrades, genericName, hasCustomRule, disabledSections,
hasBalanceInvalid, disabledUpgradeSections, armyId, xp, notes, traits,
combined, joinToUnit, selectionId, selectedUpgrades, loadout
```

Real sample unit (trimmed):

```json
{ "id": "eWXrBd1", "cost": 490, "name": "Combat Walker", "size": 1,
  "bases": { "round": "120x92", "square": "100x60" },
  "defense": 2, "quality": 3, "combined": false, "joinToUnit": null, "xp": 0 }
```

Weapons arrive **fully resolved with a pre-rendered label**:

```json
{ "name": "Chest-GL", "range": 18, "attacks": 1, "attacksMultiplier": 1,
  "label": "Chest-GL (18\", A1, Blast(3))", "count": 1,
  "specialRules": [ { "name": "Blast", "rating": 3, "label": "Blast(3)" } ] }
```

Rules arrive as `{ name, rating, label }` — e.g. `{"name":"Tough","rating":15,"label":"Tough(15)"}`.

## Why this is a strong fit

- **`quality` and `defense`** map straight onto the two stats the whole game runs on — [[mechanics-quality-and-defense-are-the-only-two-stats]].
- **Parameterised rules** (`{name, rating}`) mean `Tough(15)`, `AP(1)`, `Blast(3)` are machine-readable **without parsing prose**. This is the key enabler for [[design-ship-a-rules-engine-with-no-bundled-opr-content]] — the engine can implement `Tough` as behaviour keyed on `name`, and take `rating` from user-supplied data.
- **`bases`** gives token size in mm directly (round *and* square).
- **`activationCount`** is pre-computed — directly relevant to [[mechanics-alternating-activation-with-uneven-unit-counts-is-unspecified]].
- **`xp`**, **`traits`**, **`campaignMode`**, **`narrativeMode`** expose campaign state — see [[mechanics-campaign-persistence-xp-injuries-and-permadeath]].
- **`combined` / `joinToUnit`** model the Combined Units and Hero-attachment rules explicitly.

## Caveats

- **Schema is undocumented and unversioned** — see the risks in [[api-army-forge-has-an-undocumented-public-json-api]]. Treat this key list as *observed on one sample in July 2026*, not a spec.
- Only **one list** (`id=test`) was inspected. Fields that are null/empty here (`items`, `traits`, `notes`) may carry structure in other lists. **Not verified:** whether `loadout` differs from `weapons`, and the shape of `specialRules` at top level vs per-unit.
- The `label` fields are **OPR's copyrighted expression**. Rendering user-fetched labels at runtime is one thing; **storing them in your repo as fixtures is redistribution** — see [[licence-cannot-bundle-opr-rules-text-in-a-foundry-module]].

**Confidence: confirmed** for the field names and sample values above (fetched and parsed directly).
