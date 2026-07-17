---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/module-sub-types/
confidence: confirmed
---

# Document Subtypes Are Namespaced by Package ID

A module-provided subtype is **always** addressed as `module-id.subtype`. The module ID prefix is applied automatically by core; you declare the bare name in the manifest and reference the prefixed name everywhere in code.

Declared in `module.json` as `quest`, but used as `quest-pages.quest`:

```javascript
Hooks.on("init", () => {
  Object.assign(CONFIG.JournalEntryPage.dataModels, {
    "quest-pages.quest": QuestModel
  });
});
```

Same for sheet registration (`types: ["quest-pages.quest"]`) and localization keys (`"TYPES.JournalEntryPage.quest-pages.quest": "Quest"`).

System-provided subtypes are **not** prefixed — a system declaring `character` is just `character`.

This namespacing means collisions between ruleset modules are structurally impossible, which is a real asset for a plugin architecture: two ruleset modules can both define a `unit` type and they will never clash.

Related: [[modules-can-contribute-document-subtypes]], [[document-subtypes-must-be-declared-statically-in-the-manifest]].
