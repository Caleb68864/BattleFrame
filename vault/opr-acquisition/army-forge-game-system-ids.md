---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/JeanOmeg/opr-card-generator/blob/main/api/src/relay.ts
confidence: partial
---

# Army Forge Game System IDs Map Slug → Integer

Army Forge identifies its five game systems by **integer**, but the app URLs and army payloads use **lowercase initials**. Any importer needs this mapping to call the numeric-id endpoints.

From `opr-card-generator`, `api/src/relay.ts` L15-21, verbatim:

```ts
const GAME_SYSTEM_IDS: Record<string, number> = {
  gf: 2,    // Grimdark Future
  gff: 3,   // Grimdark Future: Firefight
  aof: 4,   // Age of Fantasy
  aofs: 5,  // Age of Fantasy: Skirmish
  aofr: 6,  // Age of Fantasy: Regiments
};
```

The slug side is corroborated independently by `opr-af-to-tts` (`src/utils.tsx`, `getUrlSlugForGameSystem`), which maps the same five initials to URL slugs:
`gf` → `grimdark-future`, `gff` → `grimdark-future-firefight`, `aof` → `age-of-fantasy`, `aofs` → `age-of-fantasy-skirmish`, `aofr` → `age-of-fantasy-regiments`.

## Verification status

- **`gf` = 2 — confirmed by me.** `GET /api/army-books?gameSystem=2&filters=official` returned 109 books including Alien Hives, Battle Brothers, Blessed Sisters — unambiguously Grimdark Future factions.
- **`gff` = 3 — partial.** `/api/rules/common/3` returns 200 with a distinct payload (27,993 bytes vs 27,813 for id 2), consistent with a different system, but I did not confirm it is Firefight specifically.
- **`aof`=4, `aofs`=5, `aofr`=6 — unverified.** Taken from third-party source only; I did not probe these.

Note the numbering **starts at 2**, not 1. What id `1` is (if anything) is unknown. Do not assume a 0- or 1-indexed sequence.

Related: [[army-forge-api-army-books-endpoint]], [[army-forge-api-common-rules-endpoint]]
