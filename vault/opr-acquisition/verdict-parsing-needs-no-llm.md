---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://army-forge.onepagerules.com/api/army-books/w7qor7b2kuifcyvk?gameSystem=2
confidence: confirmed
---

# Verdict: A Reliable Auto-Downloader + Parser Needs No LLM. None. Zero.

**The honest answer the user asked for: LLM extraction is not needed, and using it here would be a mistake.**

## Why this is unambiguous

The question "PDF parsing or JSON?" has a clean answer: **it is already JSON, and it is good JSON.** I verified this against live responses ([[army-book-json-shape]]).

The data arrives:

- **Fully structured** — `quality`, `defense`, `cost`, `size` are typed scalars, not prose to be mined.
- **Already parsed** — weapons come as `{name, range: 18, attacks: 4, specialRules: [...]}`. Nobody has to regex `"18\", A4, Rending"` — though the API helpfully supplies that rendered string in `label` too.
- **Already joined** — rules carry stable `id`s that key into [[army-forge-api-common-rules-endpoint]] for prose.
- **Already resolved** — `/api/tts` hands back a `loadout` with every upgrade applied ([[army-list-json-shape]]).
- **Already sized for VTT** — `bases: {round: "120x92", square: "100x60"}`. Token dimensions, free.

No OCR. No PDF text extraction. No layout heuristics. No LLM. `JSON.parse()` and a field mapper.

**An LLM in this pipeline would be strictly worse**: nondeterministic output over data that is already deterministic, hallucination risk on points costs and stats where correctness is binary, plus latency and cost — in exchange for nothing.

## The one genuinely hard part (still not an LLM problem)

`upgradePackages[].sections[].label` holds natural language: `"Replace any Heavy Razor Claw"`. Applying those against a unit's equipment is real logic, and it is fiddly.

**But you sidestep it entirely by importing from `/api/tts` instead of from army books**, because Army Forge has already run its own upgrade engine and handed you the resolved `loadout`. The hard part is *someone else's solved problem* — as long as you consume lists rather than books.

This is a case where the legally-clean path ([[import-own-list-vs-bulk-scrape]]) and the technically-easy path are **the same path**. That is a rare and welcome alignment; take it.

## Residual risk — and it is not parsing

The real risk is **schema drift**, not parse difficulty. The API is undocumented and unversioned ([[army-forge-api-exists-but-is-undocumented]]). Defend with schema validation at the boundary (zod or equivalent) and a clear user-facing error when Army Forge changes shape — never a silent mis-import that quietly corrupts someone's stats.

Related: [[verdict-army-forge-api-stability-risk]], [[recommended-acquisition-design]]
