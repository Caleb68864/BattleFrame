---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://army-forge.onepagerules.com/api/army-books?gameSystem=2&filters=official
confidence: confirmed
---

# `/api/army-books` — The Entire Army Book Database, Unauthenticated

This endpoint serves OPR's **whole army-book catalogue and full book contents** — every unit, weapon, rule, and points cost — with no authentication.

## Catalogue (index of books)

```
GET https://army-forge.onepagerules.com/api/army-books?gameSystem={id}&filters=official
```

**Verified**: `gameSystem=2&filters=official` → HTTP 200, **133 KB**, JSON array of **109 army books**.

> **Gotcha:** `filters=official` is required to get results. A bare `?gameSystem=2` returns an empty array `[]` with HTTP 200 — silently looking like "no data" rather than an error.

Catalogue item keys (verified):
```
uid, name, genericName, factionName, factionNameGeneric, factionId,
factionRelation, background, hint, official, popularity, unitCount,
versionString, visibility, userId, enabledGameSystems, coverImagePath,
bannerImagePath, balanceValid, balanceValidReason, downvotes,
editedAt, modifiedAt
```

Real sample (verbatim from response):
```json
{"uid":"w7qor7b2kuifcyvk","name":"Alien Hives","versionString":"3.5.3","unitCount":41,"official":true}
```

## Single book (full content)

```
GET https://army-forge.onepagerules.com/api/army-books/{uid}?gameSystem={id}
```

**Verified**: `army-books/w7qor7b2kuifcyvk?gameSystem=2` (Alien Hives, official) → HTTP 200, full book, **41 units**. A community book (`RWvb-wUkrWS_hHBx`) returned **565 KB** with 59 units.

Works identically for official and community books. Shape documented at [[army-book-json-shape]].

## This is the bulk-scrape vector

This endpoint makes it trivially easy to mirror OPR's entire ruleset. That is precisely why the legal question is live — see [[import-own-list-vs-bulk-scrape]]. **Ease of access is not permission.**

Related: [[army-forge-game-system-ids]], [[army-forge-api-exists-but-is-undocumented]]
