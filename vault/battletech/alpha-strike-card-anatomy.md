---
tags: [wargame-research, battletech]
source: http://www.masterunitlist.info/Unit/QuickList?Name=Atlas%20AS7-D
confidence: confirmed
---

# Anatomy of an Alpha Strike Card — The Whole Unit Is ~14 Numbers

The defining fact about Alpha Strike, and the reason it's an engine candidate at all: **a complete unit fits in about fourteen fields.**

Field list confirmed by reading the MUL API response for the **Atlas AS7-D-DC** ([[master-unit-list-api]]) — these `BF*` fields *are* the printed card:

| Field | Atlas AS7-D-DC | Meaning |
|---|---|---|
| `BFType` | `BM` | Unit type (BattleMech) |
| `BFSize` | `4` | Size class 1–4 |
| `BFMove` | `6"` | Movement — **in inches** |
| `BFTMM` | `0` | Target Movement Modifier |
| `BFArmor` | `10` | Armor boxes |
| `BFStructure` | `8` | Structure boxes |
| `BFThreshold` | `0` | Damage threshold (aero) |
| `BFDamageShort` | `5` | Damage @ short |
| `BFDamageMedium` | `5` | Damage @ medium |
| `BFDamageLong` | `1` | Damage @ long |
| `BFDamageExtreme` | `0` | Damage @ extreme |
| `BFOverheat` | — | Heat, compressed to one number |
| `BFPointValue` | — | Cost → [[alpha-strike-point-value]] |
| `BFAbilities` | — | Special ability codes (string) |

Plus `BFDamageShortMin` / `MediumMin` / `LongMin` booleans — the "minimal damage" (`0*`) flag.

## Contrast with the Classic unit

The same Atlas as a Classic unit ([[megamek-mtf-unit-format]]) needs: 11 separate armor values (incl. rear), 8 × 12 critical slots with named contents, 9 individually-located weapons, heat sink count/type, engine, gyro, actuators, structure type.

**~14 integers vs. ~150 structured fields.** Same 'Mech.

## Why this is the crux of the engine question

An Alpha Strike unit is **structurally a One Page Rules-style unit**: a handful of stats, inches-based movement, damage as a box count, abilities as tagged keywords. That shape maps cleanly onto a paper-sized skirmish engine.

`BFArmor`/`BFStructure` are just two depleting counters — **no hit locations**. `BFOverheat` collapses the entire Classic heat scale into **one integer**. `BFAbilities` is a **keyword list** — exactly the "special rules as tags" pattern a generic engine already needs.

The one genuinely foreign field is **`BFMove` = `"6\""`** — note it's a *string with an inch mark*, not a number. Minor parsing gotcha, but it confirms **Alpha Strike is an inches game, not a hex game** ([[hex-vs-inches-is-the-fault-line]]).

See [[engine-fit-assessment]].
