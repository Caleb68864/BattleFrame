---
tags: [wargame-research, one-page-rules]
source: https://army-forge.onepagerules.com/api/tts?id=test
confidence: confirmed
---

# Army Forge Has an Undocumented, Unauthenticated Public JSON API

OPR's official list builder, **Army Forge** (`army-forge.onepagerules.com`), exposes working JSON endpoints that require **no authentication and no API key**. There is **no published API documentation** — these were found by probing.

Verified live (HTTP 200, `application/json`):

| Endpoint | Returns |
|---|---|
| `GET /api/tts?id={listId}` | **A full army list** — units, stats, weapons, rules, upgrades, points. See [[api-tts-endpoint-schema-is-a-ready-made-import-format]] |
| `GET /api/army-books/{uid}?gameSystem={n}` | A full **army book** — the source catalogue incl. name, background, `enabledGameSystems` |
| `GET /api/army-books` | HTTP 200, returns `[]` (empty without correct params) |

`gameSystem` is a small integer (`2` observed for Age of Fantasy-era content); army list JSON uses a parallel string slug (`"gameSystem": "gf"`). See [[api-game-system-ids-are-inconsistent-int-vs-slug]].

## Why this matters enormously for import/export design

`/api/tts` exists to serve the community **Tabletop Simulator** importer — the exact analogue of a Foundry VTT importer. The precedent is direct: a VTT ingesting Army Forge lists over this endpoint is a use OPR **already builds for and tolerates**. See [[api-the-tts-endpoint-is-precedent-for-vtt-import]].

This is the single most important architectural finding after the licensing. It means **BattleFrame never needs to bundle army data** — the user pastes their own Army Forge share link, and the module fetches it at runtime. See [[design-fetch-at-runtime-instead-of-bundling-sidesteps-redistribution]].

## Risks — read before depending on it

- **Undocumented = unstable.** No versioning, no deprecation policy, no contract. It can change or vanish without notice. Wrap it behind an anti-corruption layer.
- **Not a licence.** Public reachability grants no redistribution right. It supports *fetching*, not *shipping*, OPR data — [[licence-cannot-bundle-opr-rules-text-in-a-foundry-module]] still binds, and **caching is republication** if you distribute the cache.
- **Terms.** No robots/ToS review was done for the Army Forge subdomain specifically; OPR's site T&C covers STLs only ([[licence-terms-and-conditions-covers-stls-not-rules]]).
- `id=test` is a real, persistent public sample list ("Prime Brothers_2", 3000pts) — convenient as a fixture, but not a guaranteed-stable one.

**Confidence: confirmed** by direct HTTP calls returning parsed JSON (July 2026). **Unverified:** the full endpoint surface — only the routes above were probed; `/api/game-systems`, `/api/afs/game-systems` and `/api/content/game-systems` all returned the Next.js HTML shell (404), so the real route names for catalogue listing were **not found**.
