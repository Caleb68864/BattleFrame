---
tags: [foundry-vtt, system-development]
source: https://gitlab.com/api/v4/projects/31995966/repository/files/src%2Fmodule%2Fcustom-system-builder.ts/raw?ref=develop
confidence: confirmed
---

# v13/v14 Sheet Registration Namespaces

Read from [[custom-system-builder-is-the-key-precedent|CSB's]] shipping v14 init code — the globals moved. The current namespaced calls:

```js
// Actors / Items collections
foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
foundry.documents.collections.Actors.registerSheet(game.system.id, CharacterSheetV2, { /* ... */ });
foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
foundry.documents.collections.Items.registerSheet(game.system.id, EquippableItemSheetV2, { /* ... */ });

// Generic document sheet config
foundry.applications.apps.DocumentSheetConfig.registerSheet( /* ... */ );
foundry.applications.apps.DocumentSheetConfig.unregisterSheet( /* ... */ );
```

Key relocations vs. older tutorials:
- `Actors` / `Items` → **`foundry.documents.collections.Actors` / `.Items`**
- `DocumentSheetConfig` → **`foundry.applications.apps.DocumentSheetConfig`**
- `ActorSheet` / `ItemSheet` (V1) → **`foundry.appv1.sheets.*`**

Note CSB passes `game.system.id` as the first argument — the **package id** that owns the registration.

**That first argument is the module/system boundary.** The official module sub-types article registers a sheet from a *module* with the module's own id:
```javascript
DocumentSheetConfig.registerSheet(JournalEntryPage, "quest-pages", QuestSheet, {
  types: ["quest-pages.quest"],
  makeDefault: true
});
```
Signature is `(documentClass, packageId, sheetClass, {types, makeDefault})`. Since `packageId` is a parameter and `types` is an arbitrary array, **a module can register a sheet for a system's Actor type** — nothing restricts `types` to the caller's own subtypes. See [[modules-can-register-sheets-for-system-types]].

Caveat: the article's example uses the bare global `DocumentSheetConfig` (v11-era). On v13/v14, use the `foundry.applications.apps.` namespace as CSB does.
