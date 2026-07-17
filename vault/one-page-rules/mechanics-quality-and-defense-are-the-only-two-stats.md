---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Every Unit Has Exactly Two Stats: Quality and Defense

The reason OPR is a good first ruleset for a new engine. The entire statline is **two numbers**.

**Quality** — the universal action stat. GF Core Rules v3.5.1:

> **Quality Tests:** Roll one six-sided die, and if you score the model's quality value or higher, then it counts as a success.

Quality drives **everything**: shooting to-hit, melee to-hit, morale tests, spellcasting. There is no separate ballistic/weapon skill, no strength, no toughness stat, no attacks stat on the model (attacks live on **weapons**), no leadership.

**Defense** — the universal save. Rolled by the **defender**, and *failing* it causes the wound ([[mechanics-two-roll-combat-hit-then-block]]).

The `/api/tts` payload reflects exactly this — `"defense": 2, "quality": 3` and nothing else statlike ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]).

## The universal modifier floor

> Regardless of modifiers, rolls of **6 always succeed**, and rolls of **1 always fail**.

This applies to **every d6 roll in the system** — Quality tests *and* Defense blocks. It is a single global clamp, and it is why `AP(4)` never makes a save literally impossible. Any engine implementing OPR should express this as **one shared roll primitive** with the clamp built in, rather than reimplementing it per call site.

## Everything else is a special rule

The two stats carry the whole game because all variation is pushed into **parameterised special rules** — `Tough(X)`, `AP(X)`, `Blast(X)`, `Deadly(X)`, `Fear(X)`, `Caster(X)`. Crucially the API delivers these **already parsed**: `{"name":"Tough","rating":15,"label":"Tough(15)"}`.

This is the structural fact that makes [[design-ship-a-rules-engine-with-no-bundled-opr-content]] viable: the engine implements **behaviour keyed on rule name**, and takes **values from user-supplied data**, never shipping OPR's prose.

## Design implication

A BattleFrame actor schema for OPR needs, essentially: `quality: int`, `defense: int`, `size: int`, `rules: [{name, rating}]`, `weapons: [{name, range, attacks, rules}]`. That is a remarkably small surface — and a strong argument for OPR as a first implementation.

**Confidence: confirmed** — quoted from the v3.5.1 PDF, and consistent across GF, GFF, AoF, AoFS, AoFR. The one exception is Warfleets, which replaces Quality/Defense with **Evasion/Toughness** and has no Quality test at all ([[family-warfleets-is-a-separate-engine]]).
