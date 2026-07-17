---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://github.com/thomascgray/opr-af-to-tts/blob/master/netlify/functions/get-army/get-army.ts
confidence: partial
---

# `/api/tts?id={armyId}` — Fetch a User's Army List as JSON

The endpoint that turns an Army Forge **share link** into structured army-list JSON. This is the single most important endpoint for an "import my army into Foundry" feature.

```
GET https://army-forge.onepagerules.com/api/tts?id={armyId}
```

Beta host variant (same path):
```
GET https://army-forge-beta.onepagerules.com/api/tts?id={armyId}
```

## Evidence

Two independent community projects call exactly this URL in shipped source:

- `opr-af-to-tts` — `netlify/functions/get-army/get-army.ts` L36-40:
  ```ts
  const baseUrl = isBeta === 'true'
      ? 'https://army-forge-beta.onepagerules.com/api/tts'
      : 'https://army-forge.onepagerules.com/api/tts';
  const res = await got.get(`${baseUrl}?id=${armyId}`).json();
  ```
- `opr-card-generator` — `api/src/relay.ts` L11:
  `const OPR_TTS_URL = 'https://army-forge.onepagerules.com/api/tts';`

## Why `partial` and not `confirmed`

I verified the endpoint **exists**: `GET /api/tts?id=INVALID123` returns **HTTP 500** (not 404, not 401), matching the error path in af-to-tts's own code (`"Army Forge failed to export list. Sorry!"`).

But I did **not** have a valid army-list ID, so I have **not** personally observed a successful 200 payload. The response shape at [[army-list-json-shape]] is derived from community TypeScript definitions, **not** from my own observation. Verify against a real share link before building against it.

The 500-on-invalid-id (rather than 401/403) indicates **no authentication is required** — the endpoint does not gate on a session.

Getting the `id`: see [[army-forge-share-link-format]].

Related: [[army-forge-api-exists-but-is-undocumented]], [[import-own-list-vs-bulk-scrape]]
