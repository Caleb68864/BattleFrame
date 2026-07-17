---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/JeanOmeg/opr-card-generator/blob/main/api/src/relay.ts
confidence: unverified
---

# "OPR Permits This for Community Use" — A Claim With No Traceable Source

A single sentence is doing a lot of load-bearing work in this ecosystem, and it should not be trusted without checking.

In `opr-card-generator`, `api/src/relay.ts`, the header comment ends:

> `// OPR permits this for free, non-monetized community use.`

**I could not verify this claim.** I found no OPR statement — no blog post, no terms clause, no forum post, no Discord announcement — granting permission to use the Army Forge API. The developer states it as settled fact and cites nothing.

## Why it is plausible anyway

Circumstantial support exists, and it is not nothing:

- OPR **voluntarily published** their army data as public machine-readable BattleScribe files under their own GitHub org ([[official-battlescribe-repos-are-stale]]).
- The API is **unauthenticated** and has stayed that way for years while community tools hammered it.
- Community tools using it are **prominently promoted** in OPR community spaces (the AF→TTS tool is well known and linked from Steam Workshop mods).
- The [[integration-opr-af-to-tts]] source says *"ask Adam @ army forge for the right one"*, implying working relationships between OPR staff and tool developers.
- OPR's whole commercial model is selling **miniatures**, not rules — rules are free. Tools that get people playing serve their business.
- No `Disallow` in robots.txt; no API clause in the terms ([[opr-terms-conditions-scope-is-print-files]]).

## Why it must not be relied upon

Tolerance is not a licence. Every one of the above is **OPR declining to object**, which is revocable at any moment and grants nothing. "Nobody stopped us" is not a legal position, and a second-hand claim in a code comment is not a permission grant.

## What to actually do

**Ask.** This is cheap and it resolves the entire ambiguity:

- OPR Discord / forum (https://forum.onepagerules.com) — where tool developers already talk to staff.
- `marketing@onepagerules.com` — the contact OPR publishes in its news posts.

A one-paragraph "I'm building a free Foundry VTT importer that reads a user's own shared army list via `/api/tts` — is that OK, and do you object to the load?" converts this note from `unverified` to `confirmed` and costs nothing.

**Design so the answer barely matters**: if the module only ever fetches lists the user explicitly shared, a "no" from OPR is survivable (fall back to paste-the-JSON). If the module bulk-mirrors army books, a "no" kills it. See [[recommended-acquisition-design]].
