---
tags: [foundry-vtt, system-development]
source: https://gitlab.com/api/v4/projects/31995966/repository/files/system.json/raw?ref=develop
confidence: confirmed
---

# Foundry v14 Is Current as of July 2026

**Current stable: 14.365, released 15 July 2026.** v14 reached Full Stable on **1 April 2026** (14.359). Recent line: 14.365 (Jul 15), 14.364 (Jun 10), 14.363 (May 22). **No v15 in any channel.** Confirmed from [foundryvtt.com/releases](https://foundryvtt.com/releases/).

Two further confirmations:

1. **Custom System Builder's shipping `system.json`** (develop branch) declares:
   ```json
   "compatibility": { "minimum": "14", "verified": "14.364", "maximum": "14" }
   ```
   A major community system verified against **14.364** means v14 is not merely released — it is the mainstream target.

2. **`foundryvtt.com/api` now serves v14 at unversioned URLs.** v13 docs require explicit `/api/v13/` paths. The `SystemManifestData` interface page renders as **14.365**.

**Implication:** a new system started now should target v14, not v13. The v13 docs are the *archive*.

**On the `"maximum": "14"` pin** — CSB caps at v14. This is a **trap**: `maximum` hard-blocks your system on the next core release. The cautionary example is pf2e, whose master sits pinned at `"maximum": "12"`. Recommended for a new system: `"compatibility": {"minimum": "14", "verified": "14.365"}` with **no `maximum`**. dnd5e straddles with `minimum: "13.347", verified: "14"`.

**ApplicationV1 is NOT removed in v14** — confirmed from CSB's v14 init code, which still calls:
```js
foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
```
`foundry.appv1.sheets.ActorSheet` exists and is namespaced under `foundry.appv1` — relocated and clearly signposted as legacy, but alive. CSB registers **both** V1 and V2 sheets side by side (`CharacterSheet` and `CharacterSheetV2`), which is direct evidence that even a well-maintained v14 system has not finished migrating.

Community reading puts ApplicationV1 removal around **V16** (`FormApplication#filepickers` deprecation was explicitly extended to V16; issue #13436). The blanket "V1 removed in V16" claim is **unverified** — only the filepickers date is confirmed.

For a greenfield system: build ApplicationV2-only. See [[v13-v14-sheet-registration-namespaces]] and [[v14-breaking-changes-that-matter]].
