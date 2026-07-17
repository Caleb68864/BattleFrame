---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/system-data-models/ , https://foundryvtt.com/article/module-sub-types/
confidence: confirmed
---

# Registering a TypeDataModel at init

The runtime half of a subtype. Both systems and modules do this identically — write the class into `CONFIG.<Document>.dataModels` during the `init` hook.

System-provided type (no prefix):
```javascript
Hooks.on("init", () => {
  CONFIG.Actor.dataModels.character = CharacterData;
});
```

Module-provided type ([[document-subtypes-are-namespaced-by-package-id|prefixed]]):
```javascript
Hooks.on("init", () => {
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    "quest-pages.quest": QuestModel
  });
});
```

`CONFIG.Actor.dataModels` and `CONFIG.Item.dataModels` are plain mutable objects. **A module can write into them at `init` without the system's permission or cooperation** — nothing gates the assignment. Confirmed by the official module sub-types article prescribing exactly this for modules.

The class must extend `foundry.abstract.TypeDataModel`, not the base `DataModel` — the docs are explicit that `TypeDataModel` "should always be used when defining `DataModel`s that represent type-specific data." See [[typedatamodel-defineschema-and-data-preparation]].

**Caveat:** writing a model for a type name that is not in any active package's manifest does not conjure the type into existence — see [[document-subtypes-must-be-declared-statically-in-the-manifest]].
