---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://army-forge.onepagerules.com/api/rules/common/2
confidence: confirmed
---

# Army Forge Has a Live, Unauthenticated HTTP API — But No Public Documentation

Army Forge exposes a working JSON HTTP API under `https://army-forge.onepagerules.com/api/`. I verified three endpoints return live JSON over plain unauthenticated GET requests (see [[army-forge-api-army-books-endpoint]], [[army-forge-api-common-rules-endpoint]], [[army-forge-api-tts-endpoint]]).

**Critical caveat: there is no official developer documentation.** I searched for an API reference, developer portal, or OpenAPI spec and found **none**. This API is:

- **Undocumented** — no published contract.
- **Unversioned** — no `/v1/` prefix, no version header.
- **Unannounced** — OPR has never publicised it as a public API.

It is an *internal* API belonging to the Army Forge web app that happens to be reachable without credentials. Everything known about it publicly has been reverse-engineered by community developers reading network traffic.

The strongest evidence it is meant to be usable at all is a code comment in [[integration-opr-af-to-tts]]:

> `// to get the data hit https://army-forge.onepagerules.com/api/rules/common/3 where the number is the game system. ask Adam @ army forge for the right one`

"Ask Adam @ army forge" implies informal, person-to-person access norms — not a documented public contract.

**Design implication:** treat every endpoint as capable of breaking without notice. Any importer must fail gracefully and must not assume schema stability.

Related: [[verdict-army-forge-api-stability-risk]], [[recommended-acquisition-design]]
