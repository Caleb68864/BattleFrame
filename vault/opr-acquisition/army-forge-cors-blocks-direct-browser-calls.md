---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/JeanOmeg/opr-card-generator/blob/main/api/src/relay.ts
confidence: partial
---

# CORS Blocks Direct Browser Calls — An Importer Likely Needs a Proxy

This is the most consequential **architectural** constraint for a Foundry VTT module, because Foundry module code runs as **browser JavaScript** and is therefore subject to CORS.

## The evidence

Both known community tools route Army Forge calls through a **server-side relay** rather than calling from the browser. They did not do this by accident. `opr-card-generator`'s `api/src/relay.ts` opens with an explicit explanation, verbatim:

```
// Why it exists: OnePageRules' army feed (/api/tts) is CORS-enabled, but the
// core/common rule descriptions (/api/rules/common/{id}) send no CORS header,
// so a static browser app can't read them directly. This runs server-side,
// merges both sources, and returns one combined payload. OPR permits this for
// free, non-monetized community use.
```

`opr-af-to-tts` independently does the same thing via a Netlify Function (`netlify/functions/get-army/get-army.ts`).

## My own measurement (and where it disagrees)

I sent `Origin: https://example.com` to all three endpoints and grepped the response headers:

| Endpoint | Status | `Access-Control-Allow-Origin` |
|---|---|---|
| `/api/rules/common/2` | 200 | **absent** |
| `/api/army-books?gameSystem=2&filters=official` | 200 | **absent** |
| `/api/tts?id=X` | 500 | **absent** |

So I **confirm** `/api/rules/common/{id}` sends no CORS header, matching the relay comment.

I could **not** confirm the claim that `/api/tts` is CORS-enabled: my request returned 500 (invalid id), and error responses may omit CORS headers regardless. It is also possible `/api/tts` uses an **origin allowlist** — which would return a header only for approved origins, and never for `example.com`. Marked `partial` for that reason.

## Design implication

Do not assume a Foundry module can `fetch()` Army Forge directly from the client. Plan for one of:

1. **Paste-the-JSON** — user fetches/exports, pastes into Foundry. Zero infrastructure, zero CORS, zero proxy liability. Most robust.
2. **Foundry server-side fetch** — Foundry's Node backend is not CORS-bound. A module can proxy through its own server if the architecture allows.
3. **A hosted relay** — what the community tools do. Adds infrastructure *and* makes you the party doing the fetching at scale, which changes the legal posture (see [[import-own-list-vs-bulk-scrape]]).

Note also that the relay comment asserts "OPR permits this for free, non-monetized community use" — an unsourced third-party claim. See [[opr-permission-claim-is-unverified]].

Related: [[recommended-acquisition-design]]
