---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/module-sub-types/ , https://foundryvtt.com/article/system-data-models/
confidence: confirmed
---

# Document Subtypes Must Be Declared Statically in the Manifest

The single most important constraint on [[modules-can-contribute-document-subtypes]].

A subtype's **name** must exist in the package manifest's `documentTypes` field. It cannot be invented at runtime. The purpose is server-side: "This makes the server aware of these custom sub-types so that they are not discarded as invalid Documents."

```json
"documentTypes": {
  "Actor": {
    "sidekick": {},
    "villain": {}
  },
  "JournalEntryPage": {
    "quest": {
      "htmlFields": ["description.long", "description.short"],
      "filePathFields": { "img": ["IMAGE"] }
    }
  }
}
```

**The split that matters:**

- **Type name** → static, manifest, ships in the package file. Server-enforced.
- **DataModel class** → dynamic, registered in JS at `init`. See [[registering-a-typedatamodel-at-init]].

So "can subtypes be registered dynamically at runtime?" is two questions with two answers: the *schema/behaviour* yes, the *type name* no.

**Architectural consequence:** this is fine for *authored* plugins (a ruleset module is a package with a manifest — it can declare its own types at author time) and fatal for *user-generated* types (a user cannot invent a new Actor type from inside the running app without editing a manifest file and reloading).

Per-subtype optional keys: `htmlFields` (properties under `system` needing HTML sanitization) and `filePathFields` (media properties → allowed categories, e.g. `["IMAGE"]`; extracts base64 data into real files).
