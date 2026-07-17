---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://onepagerules.com/resources
confidence: partial
---

# The Rules Text Is PDF-Only — There Is No Wahapedia-Style Web Version

A clean split exists in OPR's data, and it drives the whole architecture:

| Content | Machine-readable? | Source |
|---|---|---|
| **Unit stats, weapons, points, army books** | **Yes — clean JSON** | [[army-forge-api-army-books-endpoint]] |
| **Special rule descriptions** | **Yes — clean JSON** | [[army-forge-api-common-rules-endpoint]] |
| **Core rulebook prose** (turn sequence, morale, missions) | **No — PDF only** | onepagerules.com/resources |

## What I found on the resources page

- Rules ship as **PDF downloads only**, in two flavours: standard (colour) and "Print Friendly".
- Downloads include Core Rules, Beginner's Guides, Campaign Rules, Mission Cards, Tournament Guidelines.
- Translated into six languages (EN/FR/DE/IT/PL/ES), all as free PDFs.
- **No web-readable HTML version, no in-browser rules reader.** OPR has no Wahapedia equivalent.
- Core rules are **free**, not Patreon-gated. (Patreon gates *3D print files* and Army Forge Studio — see [[opr-terms-conditions-scope-is-print-files]].)
- Footer: "Copyright © onepagerules All Rights Reserved". No Creative Commons, no open licence.

Marked `partial`: derived from a single fetch of the resources page. I did not download and inspect the PDFs themselves, so I cannot state whether their text layer is clean (they are digitally-authored, so almost certainly yes — but that is inference, not observation).

## Why this barely matters

**The PDF gap is not on the critical path.** An importer needs unit stats and rule *references* — both are already JSON. The core rulebook prose is what a *human player* reads; it does not need to live in Foundry, and reproducing it would be the most legally exposed thing in the whole project ([[import-own-list-vs-bulk-scrape]]).

The user's wish to "instantly pull up the rules" splits cleanly:
- **Rule descriptions on a unit's sheet** → free, from the JSON API. Do this.
- **The whole core rulebook inside Foundry** → needs PDF work *and* is a redistribution question. Link to OPR's free PDF instead.

Related: [[verdict-parsing-needs-no-llm]]
