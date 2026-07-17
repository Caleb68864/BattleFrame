---
tags: [wargame-research, one-page-rules, data-acquisition]
source: inference
confidence: partial
---

# OPR Acquisition & Parsing — Index

Technical research into **programmatically acquiring and parsing One Page Rules content** for a Foundry VTT importer. Scope is acquisition and parsing only; general OPR mechanics and licensing live in the sibling `vault/one-page-rules/`.

**Headline:** Army Forge has a live, unauthenticated, undocumented JSON API. The data is already fully structured — **no PDF parsing and no LLM extraction are needed**. No Foundry OPR module exists; the Tabletop Simulator tools have already proven the pattern.

## The API

- [[army-forge-api-exists-but-is-undocumented]] — a live unauthenticated JSON API with zero official documentation; treat as breakable.
- [[army-forge-api-tts-endpoint]] — `/api/tts?id=` turns a user's share link into their army list; **the** endpoint for the importer.
- [[army-forge-api-army-books-endpoint]] — `/api/army-books` serves OPR's entire book database, unauthenticated; the bulk-scrape vector.
- [[army-forge-api-common-rules-endpoint]] — `/api/rules/common/{id}` supplies core rule prose that lists reference but do not embed.
- [[army-forge-share-link-format]] — "Share as link" is the user-facing handle, and the reason this stays legally clean.
- [[army-forge-game-system-ids]] — slug→integer map (`gf`=2 …); required for the numeric-id endpoints.
- [[army-forge-cors-blocks-direct-browser-calls]] — the architectural constraint: a browser likely cannot call this directly.

## The data

- [[army-book-json-shape]] — real verbatim samples: units, weapons, rules, upgrades — and free token base sizes.
- [[army-list-json-shape]] — the `/api/tts` shape; its pre-resolved `loadout` is why importing lists beats importing books.

## Prior art

- [[no-foundry-vtt-opr-module-exists]] — a green field, verified across five surfaces (beware the "One Page Parser" false positive).
- [[integration-opr-af-to-tts]] — Army Forge→Tabletop Simulator; the closest analogue and best reference architecture. **No licence.**
- [[integration-opr-card-generator]] — Army Forge→printable cards; independently corroborates every endpoint. PolyForm Noncommercial.
- [[official-battlescribe-repos-are-stale]] — OPR's own GitHub data org, abandoned since 2021-22. Do not build on it.
- [[community-army-forge-clones]] — self-contained clones with a bespoke PDF parser; a fossil of the hard way.

## Official sources

- [[rules-are-pdf-only-no-html-version]] — stats and rules are JSON; only the core rulebook prose is PDF-locked, and it is not on the critical path.

## Verdicts

- [[verdict-parsing-needs-no-llm]] — **no LLM, no OCR, no PDF extraction.** `JSON.parse()` and a field mapper. An LLM here would be strictly worse.
- [[verdict-army-forge-api-stability-risk]] — the real risk is silent schema drift, not parsing; validate at the boundary.

## Legal / ethical

- [[opr-terms-conditions-scope-is-print-files]] — the ToS governs Patreon STLs and says **nothing** about APIs or scraping; neither prohibition nor permission.
- [[opr-permission-claim-is-unverified]] — the widely-repeated "OPR permits this" has no traceable source. Ask them.
- [[import-own-list-vs-bulk-scrape]] — **the central distinction.** Importing a user's own list and mirroring OPR's database differ in kind, not degree.
- [[recommended-acquisition-design]] — build a share-link importer, not a downloader; and ask OPR first.
