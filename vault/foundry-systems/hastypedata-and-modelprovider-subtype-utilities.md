---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/module-sub-types/
confidence: confirmed
---

# hasTypeData and modelProvider: Subtype Introspection Utilities

Two core utilities for working with subtypes generically — directly useful to a system that must reason about types it did not author.

**`doc.system.modelProvider`** — returns the System or Module instance that provides this document's subtype, or `null` if none applies.

```javascript
doc.system.modelProvider;
```

This is the mechanism by which a ruleset-neutral system can ask "which ruleset owns this actor?" without maintaining its own registry. It answers with the actual package object.

**`Document.hasTypeData`** — static; whether a document class supports subtypes at all.

```javascript
Actor.hasTypeData;    // true
Playlist.hasTypeData; // false
```

`hasTypeData` is effectively the answer to "which documents can receive module subtypes" — anything with a `system` field.

Related: [[modules-can-contribute-document-subtypes]], [[document-subtypes-are-namespaced-by-package-id]].
