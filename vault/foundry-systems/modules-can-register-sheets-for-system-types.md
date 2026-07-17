---
tags: [foundry-vtt, system-development]
source: https://raw.githubusercontent.com/kgar/foundry-vtt-tidy-5e-sheets/main/src/main.svelte.ts , https://foundryvtt.com/article/module-sub-types/
confidence: confirmed
---

# Modules Can Register Sheets for System Types

**Confirmed from real working source.** Tidy5e Sheets — a *module* — registers its sheets for the *dnd5e system's* Actor types. Verbatim from `src/main.svelte.ts` on `main`:

```js
Hooks.once('init', () => {
  const documentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  // ...
  documentSheetConfig.registerSheet(
    Actor,
    CONSTANTS.DND5E_SYSTEM_ID,
    Tidy5eCharacterSheet,
    {
      types: [CONSTANTS.SHEET_TYPE_CHARACTER],   // 'character'
      label: 'TIDY5E.Tidy5eCharacterSheetClassic',
    },
  );
```

It does the same for `npc`, `vehicle`, `group`, `encounter`, `container`, and a set of item types.

**Two findings worth separating:**

1. **A module can register a sheet for a type it does not own.** `types: ['character']` is a system-owned type; the module registers against it freely. Nothing gates this.
2. **Tidy5e passes the *system's* id (`dnd5e`) as `packageId`, not its own module id.** This contradicts a natural reading of the [[modules-can-contribute-document-subtypes|module sub-types article]], which passes the module's own id (`"quest-pages"`) when registering for its own subtype. So `packageId` appears to name **the package whose types are being registered against**, not the registering package. Worth noting when designing Battleframe's sheet API — a ruleset module registering for a Battleframe type would likely pass `battleframe`.

Signature: `registerSheet(documentClass, packageId, sheetClass, {types, makeDefault, label})`.

Namespace is `foundry.applications.apps.DocumentSheetConfig` on v13/v14 — see [[v13-v14-sheet-registration-namespaces]]. The official article's bare `DocumentSheetConfig` global is v11-era.

Localization for a module-provided type: `"TYPES.JournalEntryPage.quest-pages.quest": "Quest"`.
