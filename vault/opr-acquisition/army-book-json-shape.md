---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://army-forge.onepagerules.com/api/army-books/w7qor7b2kuifcyvk?gameSystem=2
confidence: confirmed
---

# Army Book JSON Shape — Fully Structured, Real Sample

Everything below is **verbatim from a live response** I fetched: `GET /api/army-books/w7qor7b2kuifcyvk?gameSystem=2` (Alien Hives, official, v3.5.3, 41 units).

## Top-level keys (verified)

```
uid, name, genericName, factionName, factionId, factionRelation,
gameSystemId, gameSystemKey, gameSystemSlug, official, versionString,
background, backgroundFull, hint, loreUrl, coverImagePath, bannerImagePath,
units[], upgradePackages[], specialRules[], spells[], customRules[],
customWeapons[], creator, username, userId, isCreator, popularity,
downvotes, voted, visibility, balanceValid, balanceValidReason,
editedAt, modifiedAt, aberration, flavouredUid, partnerSettings
```

Array sizes on the community book `RWvb-wUkrWS_hHBx`: `units[59]`, `upgradePackages[64]`, `customWeapons[319]`, `specialRules[36]`, `customRules[25]`, `spells[6]`.

## A real unit (verbatim, truncated)

```json
{
  "id": "lmZtl0E",
  "name": "Hive Lord",
  "cost": 360,
  "size": 1,
  "quality": 2,
  "defense": 2,
  "bases": { "round": "120x92", "square": "100x60" },
  "rules": [
    { "id": "dIQ3SGl2J2Ew", "name": "Fear",     "rating": 2,  "label": "Fear(2)" },
    { "id": "2atvlmICQSCV", "name": "Fearless",               "label": "Fearless" },
    { "id": "T08VkBuVmNZ_", "name": "Hero",                   "label": "Hero" },
    { "id": "a0YtInGiUDd6", "name": "Tough",    "rating": 12, "label": "Tough(12)" }
  ],
  "weapons": [ ... ],
  "upgrades": ["A1", "7ob7CvQy"],
  "items": [],
  "valid": true,
  "product": {
    "storeLinksDigital": ["https://www.myminifactory.com/object/3d-print-hive-lord-alien-hives-167499"],
    "storeLinksPhysical": ["https://www.etsy.com/listing/..."]
  }
}
```

**`bases` is a gift for Foundry** — token size (`round: "120x92"` mm) comes straight from the API. No guessing.

## A real weapon (verbatim)

```json
{
  "id": "EfbJfjUm",
  "name": "Shredder Cannon",
  "type": "ArmyBookWeapon",
  "count": 1,
  "range": 18,
  "attacks": 4,
  "weaponId": "dDtH9Phg",
  "specialRules": [
    { "type": "ArmyBookRule", "id": "cavWDboL4ubs", "name": "Rending", "label": "Rending" }
  ],
  "attacksMultiplier": 1,
  "label": "Shredder Cannon (18\", A4, Rending)",
  "originalCount": 1
}
```

Note the **pre-rendered `label`** — the API hands you the human-readable statline. Melee weapons use `range: null` (or `0`).

## A real special rule (verbatim)

```json
{
  "id": "s4lagBUlnsUE",
  "name": "Piercing Growth",
  "aliasedRuleId": null,
  "hasRating": false,
  "description": "Place one marker on this unit at the beginning of each round if it's on the table and isn't Shaken, up to a max. of four markers. For every two markers, models with this rule in this unit get AP(+1) on their wea..."
}
```

Book-local rules carry their own `description`. **Core** rules do not — those come from [[army-forge-api-common-rules-endpoint]].

## Upgrade packages (the hard part)

```json
{
  "uid": "A1",
  "hint": "",
  "calcErrors": [],
  "sections": [{
    "id": "QJoFNyq",
    "label": "Replace any Heavy Razor Claw",
    "options": [{
      "uid": "Nln2tjI",
      "cost": 5,
      "type": "ArmyBookUpgradeOption",
      "label": "Smashing Club (A1, AP(2), Blast(3))",
      "gains": [{ "name": "Smashing Club", "type": "ArmyBookWeapon", "attacks": 1, "range": 0,
                  "specialRules": [{"name":"AP","rating":2},{"name":"Blast","rating":3}] }],
      "parentPackageUid": "A1", "parentSectionUid": "IQd7evV"
    }]
  }]
}
```

Units link to packages via `unit.upgrades: ["A1", "7ob7CvQy"]`. Sections carry a natural-language `label` ("Replace any Heavy Razor Claw") that encodes the *rule* for applying the upgrade — **this is the one genuinely fiddly part of the schema**, and the main reason to prefer [[army-list-json-shape]] (which delivers upgrades already resolved).

Related: [[verdict-parsing-needs-no-llm]]
