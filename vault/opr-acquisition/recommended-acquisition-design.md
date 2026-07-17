---
tags: [wargame-research, one-page-rules, data-acquisition]
source: inference
confidence: unverified
---

# Recommended Acquisition Design for a Foundry OPR Importer

**Inference — a synthesis of the confirmed findings into a recommendation.** Reasoning, not fact.

## The shape

> **A share-link importer, not a downloader.** The user pastes their own Army Forge share link; the module fetches that one list, hydrates rule text, maps it to Foundry actors. Nothing is bundled, mirrored, or cached beyond a rule glossary.

This answers the user's actual wish — *"instantly pull up the rules and parse them"* — while staying firmly inside [[import-own-list-vs-bulk-scrape]] case (a).

## Flow

1. **User pastes a share link** — `https://army-forge.onepagerules.com/share?id=XXX&name=XXX` ([[army-forge-share-link-format]]).
2. **Extract the id** — `/id=([^&]+)/`.
3. **Fetch the list** — `GET /api/tts?id={id}` ([[army-forge-api-tts-endpoint]]). Use `loadout` — upgrades already resolved.
4. **Hydrate core rule text** — `GET /api/rules/common/{gameSystemId}` ([[army-forge-api-common-rules-endpoint]]), mapping `list.gameSystem` through [[army-forge-game-system-ids]]. **Cache this** — it is ~27 KB and changes rarely.
5. **Validate against a schema** — fail loudly, never silently ([[verdict-army-forge-api-stability-risk]]).
6. **Map to Foundry** — units → Actors, weapons → Items, rules → Items/effects, `bases.round` → token size.

## Decisions worth making up front

**Always ship paste-the-JSON as a first-class path, not a fallback.** It sidesteps CORS ([[army-forge-cors-blocks-direct-browser-calls]]), survives the API vanishing, needs no proxy, and carries zero legal ambiguity. If CORS blocks direct fetch, prefer Foundry's Node-side fetch over standing up a hosted relay — a relay makes *you* the party fetching at scale, which changes your posture.

**Do not ship compendium packs of OPR army books.** Not "for convenience", not a subset. See [[import-own-list-vs-bulk-scrape]].

**Do not use an LLM.** The data is already structured ([[verdict-parsing-needs-no-llm]]).

**Do not build on** the BattleScribe repos ([[official-battlescribe-repos-are-stale]]) or the Army Forge clones ([[community-army-forge-clones]]) — both years stale.

**Do not vendor community code.** af-to-tts has **no licence** (all rights reserved); card-generator is **PolyForm Noncommercial** (incompatible with MIT). Endpoint URLs are facts and are free to use; their code is not. Reimplement.

## Do this first, before writing code

**Ask OPR.** Discord / https://forum.onepagerules.com / `marketing@onepagerules.com`. One paragraph: *"Building a free Foundry VTT importer that reads a user's own shared list via `/api/tts` — any objection?"*

It costs nothing, converts [[opr-permission-claim-is-unverified]] from `unverified` to settled, and may buy advance warning of schema changes — the single best mitigation available. Credit OPR prominently and link their free rules either way.

## Honest assessment

The acquisition and parsing half of this project is **low-risk and largely solved** — proven in production by [[integration-opr-af-to-tts]] for years. The genuinely novel, genuinely hard work is Foundry-side: mapping OPR's multi-model units with mixed loadouts onto Foundry's actor/token model. Note that af-to-tts **makes the user do that mapping manually** — strong evidence it does not automate cleanly. Budget accordingly, and expect that to be where the real design effort goes.
