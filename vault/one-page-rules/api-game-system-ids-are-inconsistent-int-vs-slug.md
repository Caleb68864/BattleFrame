---
tags: [wargame-research, one-page-rules]
source: https://army-forge.onepagerules.com/api/tts?id=test
confidence: partial
---

# Army Forge Identifies Game Systems Two Different Ways — Integer and Slug

A small but real integration trap in [[api-army-forge-has-an-undocumented-public-json-api]]. The same concept — *which OPR game is this?* — is expressed in **two incompatible encodings** depending on the endpoint.

**Integer**, as a query parameter on the army-books endpoint:

```
GET /api/army-books/RWvb-wUkrWS_hHBx?gameSystem=2
→ { "uid": "...", "enabledGameSystems": [2], ... }
```

**String slug**, in the army-list payload:

```
GET /api/tts?id=test
→ { "gameSystem": "gf", ... }
```

So `gameSystem` is an `int` in one place and a `string` in another, and `enabledGameSystems` is an **array** — an army book can be valid in **multiple** systems at once.

## Why it matters for BattleFrame

Given [[family-eight-current-rulesets-in-two-version-families]], the engine needs to know which ruleset an import targets — that choice selects the whole rules module ([[assessment-one-engine-can-host-most-of-the-family]]). Getting it wrong silently means loading the wrong damage model (e.g. GF's remove-a-model vs Firefight's wound-effects table — [[family-firefight-differs-in-damage-not-activation]]).

Implications:
- Normalise both encodings into **one internal enum** at the adapter boundary. Never let the raw values leak into the engine.
- `enabledGameSystems` being an array suits OPR's reskin structure — an army book can serve both [[family-gf-and-aof-are-the-same-engine-reskinned]].

## What is NOT known — do not guess

**The full id↔slug mapping was not found.** Only two data points were observed:
- `2` appears in `enabledGameSystems` on an army book whose `background` describes a **Grimdark Future** conversion.
- `"gf"` appears as the slug on a Grimdark Future army list.

**It is tempting but unsafe to conclude `2 == "gf"`** — the two came from *different endpoints* on *different lists*, and the numbering may well be 1=GF, 2=AoF, etc., with the observed book simply being multi-system. **Do not assume this mapping.** Probe `gameSystem=1..8` against a known list, or read the Army Forge client bundle, before encoding it.

The route that would answer this authoritatively — a game-systems catalogue — was **not found**: `/api/game-systems`, `/api/afs/game-systems`, and `/api/content/game-systems` all returned the Next.js HTML shell (404).

**Confidence: partial** — the **two encodings are confirmed** (observed in live responses); **the mapping between them is unverified**.
