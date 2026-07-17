---
tags: [wargame-research, one-page-rules, data-acquisition]
source: inference
confidence: unverified
---

# The Central Distinction: Importing Your Own List vs. Mirroring OPR's Database

**This note is reasoning, not a legal finding.** I am not a lawyer and this is not legal advice. But the distinction is the most important idea in this research, and it is not a close call.

The same three endpoints support two very different products. They are **not** on a spectrum — they are different in kind.

## (a) User imports their own army list — the obvious feature

The user builds a list in Army Forge, clicks "Share as link", pastes it into Foundry.

- The user **initiates** each fetch, once, for data **they authored**.
- One request per import. Trivial load.
- Only ever touches content the user **deliberately published** via a share link.
- Nothing is stored, redistributed, or shipped inside the module.
- The module is a **client** of Army Forge, exactly as a browser is. This is what [[army-forge-api-tts-endpoint]] is *for*.
- Every existing OPR integration works this way ([[integration-opr-af-to-tts]], [[integration-opr-card-generator]]) and OPR has tolerated them for years ([[opr-permission-claim-is-unverified]]).
- If OPR objects, the fallback is trivial: paste the JSON manually. **The feature survives a "no".**

This is a **transient conduit for the user's own data**. It is the obvious, defensible feature.

## (b) Bulk-mirroring the army-book database — a different proposition entirely

Crawl [[army-forge-api-army-books-endpoint]] across all game systems, snapshot every book, ship the corpus inside the module as compendium packs.

- Redistributes **OPR's copyrighted creative content** — rule prose, faction background, unit names — to people who never asked OPR for it.
- OPR's footer: "Copyright © onepagerules All Rights Reserved". No Creative Commons, no open licence ([[rules-are-pdf-only-no-html-version]]).
- Stats and points *may* be closer to uncopyrightable facts; **descriptions and background prose plainly are not.** The Alien Hives book alone carries paragraphs of original prose per rule.
- Goes stale immediately and silently — Alien Hives is at v3.5.3 and moving. Users field illegal lists and blame you.
- Systematic automated harvesting is where "OPR declined to object" most plausibly stops being true.
- **A "no" from OPR is fatal.** The whole feature is the redistribution.

The absence of an anti-scraping ToS clause ([[opr-terms-conditions-scope-is-print-files]]) does **not** help here. Scraping and redistribution are separate questions, and copyright governs the second one regardless of how the bytes were obtained. **Getting data legitimately does not grant the right to republish it.**

## The recommendation

**Build (a). Do not build (b).**

The tell that this is right: **(a) is also the easier build.** `/api/tts` returns a resolved `loadout` — no upgrade engine to reimplement ([[verdict-parsing-needs-no-llm]]). (b) is more code, more risk, more staleness, *and* more legal exposure. There is no tradeoff being made here; (b) is worse on every axis including the selfish ones.

A middle path exists and should also be declined: shipping a *cached subset* "for convenience". That is still redistribution, just smaller.

See [[recommended-acquisition-design]] for the concrete shape.
