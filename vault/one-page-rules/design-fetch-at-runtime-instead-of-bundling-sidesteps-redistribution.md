---
tags: [wargame-research, one-page-rules]
source: inference
confidence: unverified
---

# Fetch at Runtime Instead of Bundling — the Import Design That Avoids Redistribution

The import half of [[design-ship-a-rules-engine-with-no-bundled-opr-content]]. The distinction is simple and load-bearing:

- **Bundling** = *you* copy OPR's data and distribute it to thousands of users. Clearly implicates the distribution right.
- **Runtime fetching** = *the user* asks *your tool* to retrieve *their own list* from *OPR's own server*. You distribute nothing.

The second is what a browser does. It mirrors the flow OPR already serves for Tabletop Simulator ([[api-the-tts-endpoint-is-precedent-for-vtt-import]]).

## The flow

1. User builds their army in Army Forge (on OPR's site, under OPR's terms).
2. User clicks **"Share as link"** and pastes it into the Foundry module.
3. Module extracts the list id and calls `GET /api/tts?id={listId}` ([[api-army-forge-has-an-undocumented-public-json-api]]).
4. Module maps the JSON onto Foundry actors and tokens ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]).
5. Data lives in **the user's world**, never in your repo or your server.

Every step is user-initiated, and the data moves from **OPR to the user** — the module is a conduit, not a publisher.

## Design rules that follow

- **No proxy server.** Fetch **client-side**, direct from the user's browser to Army Forge. Routing through a server of yours makes *you* the one copying, and creates a caching liability. (Watch for CORS — if Army Forge doesn't send permissive headers this may force a proxy, which materially worsens the legal posture. **Unverified — CORS headers were not tested.**)
- **Cache in-world only.** Persisting the imported actor in the user's world is normal VTT behaviour. Shipping that cache in the module is redistribution.
- **No fixtures in the repo.** Synthetic test data only. This constraint is easy to violate accidentally.
- **Anti-corruption layer.** The API is undocumented and unversioned; isolate the mapping behind one adapter so a schema change is a one-file fix.
- **Degrade gracefully.** The endpoint can vanish. Manual stat entry must remain a first-class path — a module that is *only* an importer dies with the endpoint.

## Caveats — this is not a free pass

- **Fetching is not licensed either.** Public reachability grants nothing; [[licence-opr-rules-have-no-open-licence]] still stands. This is *analogous to tolerated precedent*, not *permitted by grant*.
- **Volume matters.** A polite importer looks like a browser. A crawler enumerating every army book to build a local mirror is bulk extraction — and would implicate the **EU database right** ([[licence-army-books-and-unit-stats-share-the-core-rules-status]]). Rate-limit; fetch only what the user asked for.
- **Terms of the Army Forge subdomain specifically were not reviewed** — **not found**. Check `robots.txt` and any subdomain ToS before shipping.
- Resolve it properly via [[licence-ask-opr-directly-is-the-only-clean-path]].

**Confidence: unverified** — architectural recommendation, not a finding, and not legal advice. The *flow* it imitates is **confirmed**.
