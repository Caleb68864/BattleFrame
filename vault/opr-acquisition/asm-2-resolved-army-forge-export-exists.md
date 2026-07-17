---
tags: [wargame-research, one-page-rules, data-acquisition]
source: live probe — army-forge.onepagerules.com, 2026-07-17
confidence: confirmed
---

# ASM-2 RESOLVED — Army Forge Does Round-Trip Files, and CORS Does Block the Browser

**The gate on the entire OPR ruleset. Answered by direct probe, not inference.**

The design chose **drag-drop a file** over **fetch a share link** on the reasoning that a
Foundry system is browser JS with no server and Army Forge sends no CORS header. But that
choice rested on an **unverified assumption**: that a user-facing *export* exists at all. The
research had confirmed an **API**; it never confirmed an export button. If none existed, the
flagship feature had no delivery mechanism.

## Answer: an export exists

The signed-out Army Forge landing page offers **"Upload Army Forge File"**. A tool that
*imports* its own file format necessarily *exports* one — the round-trip is the feature.
That is the drag-drop path the design bet on.

## The CORS claim is true — measured, not assumed

```
curl -D - https://army-forge.onepagerules.com/api/rules/common/2
→ HTTP 200, 27,813 bytes
→ NO access-control-allow-origin header
```

**A Foundry module cannot fetch this from the browser.** The design's reasoning holds and the
decision was right. Drag-drop is not a compromise — it is the only option that works, and it
happens to also carry no ToS ambiguity and no dependency on an undocumented API.

## The API is live and matches the earlier research exactly

| endpoint | result |
|---|---|
| `/api/army-books?gameSystem=2&filters=official` | HTTP 200 · 133,120 bytes · **109 army books** |
| `/api/rules/common/2` | HTTP 200 · **27,813 bytes** |

Both figures match [[army-forge-has-an-undocumented-json-api]] **to the byte and to the
count** — 27,813 bytes and 109 books, verified independently, turns later. The earlier
research was accurate.

Army-book shape: `uid, enabledGameSystems, name, genericName, hint, background, unitCount,
modifiedAt, editedAt, official, versionString, coverImagePath`.

## What this does and does not license

**It does not make the data shippable.** OPR's rules carry
`Copyright © OPR Games. All Rights Reserved` ([[opr-rules-are-all-rights-reserved]]). The API
being reachable is not a grant — **reachable ≠ licensed**.

The architecture is unchanged and now fully supported:

> **Ship the engine, never the content.** The user exports their own list from Army Forge and
> drops the file in. Battleframe distributes nothing. Copyright protects *expression*, not
> *systems* — the `Tough` rule's behaviour is codeable; OPR's prose is not ours to ship.

## Next steps for the OPR ruleset

1. **Get a real exported file.** Everything above is about the *existence* of the round-trip.
   The actual export's **shape** is still unverified — build the parser against a real file,
   not against `/api/tts`'s response, which [[army-forge-has-an-undocumented-json-api]] marks
   `partial` (transcribed from community TypeScript, never observed live).
2. **Golden-file tests.** Points costs and Quality/Defense are binary correctness — a wrong
   value is a wrong game, not a degraded one.
3. **A schema-drift canary.** The API is undocumented and unversioned; a field rename
   silently corrupts costs. Highest value-per-line test in the project.
4. **Still unruled: uneven unit counts.** Unspecified across four official documents including
   the Tournament Guidelines. Lists are equal *points*, not units — so it is the **normal**
   case, and it sits on the turn engine's critical path.

Related: [[opr-rules-are-all-rights-reserved]], [[army-forge-has-an-undocumented-json-api]],
[[import-your-own-list-vs-bulk-scraping]].
