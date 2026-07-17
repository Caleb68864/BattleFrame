---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/JeanOmeg/opr-card-generator
confidence: confirmed
---

# Integration: `opr-card-generator` — Army Forge → Printable Unit Cards

The **second** independent consumer of the Army Forge API, and the most recently maintained OPR tool I found. Its value here is **corroboration**: two unrelated developers independently arrived at the same three endpoints, which is strong evidence those endpoints are real and stable-ish rather than one person's lucky guess.

- **Repo:** https://github.com/JeanOmeg/opr-card-generator (TypeScript, ~2 stars, last updated **July 2026**)
- **Purpose:** "Generate printable unit cards for One Page Rules Army Forge lists, including rules, spells and custom artwork."

## What it confirms

`api/src/relay.ts` L11-13, verbatim — all three endpoints in one place:

```ts
const OPR_TTS_URL = 'https://army-forge.onepagerules.com/api/tts';
const OPR_COMMON_RULES_URL = 'https://army-forge.onepagerules.com/api/rules/common';
const OPR_ARMY_BOOKS_URL = 'https://army-forge.onepagerules.com/api/army-books';
```

It also supplies the [[army-forge-game-system-ids]] mapping and the clearest public statement of the CORS situation ([[army-forge-cors-blocks-direct-browser-calls]]).

## Same architecture as af-to-tts

Share link → extract id → **server-side relay** → merge `/api/tts` + `/api/rules/common` → render. The relay is deliberately framework-free so it runs both as an Express server and a Netlify Function.

Two independent projects converging on "you must proxy server-side and merge two endpoints" means that is simply **the shape of this problem**. Budget for it.

## Licence: PolyForm Noncommercial 1.0.0 — read carefully

The repo **does** have a LICENSE: [PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0).

This permits use **only for noncommercial purposes**. It is *not* OSI-approved and is **incompatible with most permissive open-source licences**. If a Foundry module were released under MIT, it could **not** vendor this code. Even a noncommercial Foundry module should treat borrowing here as a licence-compatibility decision, not a freebie.

As with [[integration-opr-af-to-tts]]: the endpoint URLs are facts and are free to use; the code is licensed and is not.

Related: [[army-forge-api-exists-but-is-undocumented]]
