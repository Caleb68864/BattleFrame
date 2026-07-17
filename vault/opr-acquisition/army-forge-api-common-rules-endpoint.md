---
tags: [wargame-research, one-page-rules, data-acquisition]
source: https://army-forge.onepagerules.com/api/rules/common/2
confidence: confirmed
---

# `/api/rules/common/{gameSystemId}` — Core Rule Descriptions

Returns the **core special-rule glossary** for a game system: the full prose text of rules like Ambush, Fear, Tough, AP, Rending.

```
GET https://army-forge.onepagerules.com/api/rules/common/{gameSystemId}
```

**Verified live**: `/api/rules/common/2` → HTTP 200, `application/json`, **27,813 bytes**. `/api/rules/common/3` → HTTP 200, 27,993 bytes.

Real response, first record, verbatim:
```json
{"rules":[
  {"id":"3FeiOe3krHMa",
   "name":"Aircraft",
   "description":"May only use Advance actions, moving in a straight line, and adding 30\" to its total move (even if Shaken). Aircraft ignore all units and terrain when moving and stopping, can't seize or contest objectives, can't be charged, and units targeting them get -12\" range.",
   "coreType":1}
]}
```

Shape: `{ rules: [{ id, name, description, coreType }] }`

## Why this endpoint matters

Army list payloads ([[army-list-json-shape]]) reference rules **by name and rating only** — e.g. `{"name":"Tough","rating":12}`. They do **not** embed rule text. To render a usable Foundry sheet with actual rule descriptions, you must join the list against this endpoint. Both known community tools perform exactly this merge.

**This is also the endpoint that forces a server-side proxy** — see [[army-forge-cors-blocks-direct-browser-calls]].

The `{gameSystemId}` is the **numeric** id (2, 3, ...), not the slug — see [[army-forge-game-system-ids]].

Related: [[army-forge-api-exists-but-is-undocumented]]
