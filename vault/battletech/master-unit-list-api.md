---
tags: [wargame-research, battletech]
source: http://www.masterunitlist.info/Unit/QuickList?Name=Atlas%20AS7-D
confidence: confirmed
---

# The MUL Has a Live, Undocumented JSON API Returning Alpha Strike Card Stats

**Answer to "is the Alpha Strike card data available machine-readable?" — YES, and it's official-side.** I called this endpoint directly and read the response.

## The endpoint (verified working, 2026-07-16)

```
http://www.masterunitlist.info/Unit/QuickList?Name=Atlas%20AS7-D
```

Also live on the Azure host it's actually served from:
```
https://masterunitlist.azurewebsites.net/Unit/QuickList?Name=WHM-7A
```

⚠️ `www.masterunitlist.info` has a **TLS certificate mismatch** (cert only covers `*.azurewebsites.net`), so HTTPS on the vanity domain fails validation. Verified query params: `Name`, `MinTons`, `MaxTons`, `Types`, `Factions`, `AvailableEras`.

## Response shape (real, abridged — Atlas AS7-D-DC)

```json
{"Units":[{
  "Id":142, "Name":"Atlas AS7-D-DC", "Class":"Atlas", "Variant":"AS7-D-DC",
  "Tonnage":100, "BattleValue":1858, "Cost":10406000,
  "Technology":{"Id":1,"Name":"Inner Sphere"},
  "Rules":"Advanced", "TRO":"MWC", "RS":"RS:3039u",
  "DateIntroduced":"2776", "EraId":10, "EraStart":2571,
  "ImageUrl":"https://i.ibb.co/VtHKQ7Q/atlas-rg.png",
  "Type":{"Id":18,"Name":"BattleMech"},
  "Role":{"Id":108,"Name":"Juggernaut"},

  "BFType":"BM", "BFSize":4, "BFMove":"6\"", "BFTMM":0,
  "BFArmor":10, "BFStructure":8, "BFThreshold":0,
  "BFDamageShort":5,  "BFDamageShortMin":false,
  "BFDamageMedium":5, "BFDamageMediumMin":false,
  "BFDamageLong":1,   "BFDamageLongMin":false,
  "BFDamageExtreme":0,
  "BFOverheat": …, "BFPointValue": …, "BFAbilities": …
}], "Search":…, "Crumbs":[…]}
```

## Why this is the headline technical finding

The `BF*` fields **are the Alpha Strike card**, one-to-one ([[alpha-strike-card-anatomy]]):
`BFType, BFSize, BFMove, BFTMM, BFArmor, BFStructure, BFThreshold, BFDamageShort/Medium/Long/Extreme, BFOverheat, BFPointValue, BFAbilities`

("BF" = BattleForce, Alpha Strike's ancestor.)

Note **`"BFMove":"6\""`** — the value is literally `6"`, **inches**, embedded as a string with a quote mark. That confirms Alpha Strike is an inches game and is a small parsing gotcha.

It also carries `BattleValue` ([[battle-value]]) for Classic, so **one endpoint serves both flavours**, and `.mtf` files cross-reference it via `mul id:` ([[megamek-mtf-unit-format]]).

## ⚠️ Undocumented and unlicensed

- **No published API documentation** — no docs on `Home/GettingStarted`; the params above are community-discovered ([piotrberlowski/mul-search](https://github.com/piotrberlowski/mul-search), `casperionx/mul_api`).
- **No terms of use, no export feature, no rate-limit statement found.** It appears to be the site's own internal AJAX backend, not a public API.
- **It is not a grant.** Reachable ≠ licensed. See [[master-unit-list-is-officially-licensed]].

**Do not treat this as a green light to bulk-scrape.** An undocumented internal endpoint can change or be blocked without notice, and using it at scale against an officially-licensed Topps property is precisely the risk this project must not take casually.
