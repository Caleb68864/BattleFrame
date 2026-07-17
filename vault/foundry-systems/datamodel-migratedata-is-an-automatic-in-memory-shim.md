---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/api/classes/foundry.abstract.DataModel.html , https://foundryvtt.com/article/migration/
confidence: confirmed
---

# DataModel.migrateData Is an Automatic In-Memory Shim

Confirmed present on `foundry.abstract.DataModel` in **both v13 and v14**:

```ts
static migrateData(source: object, options?: Readonly<DataModelCleaningOptions>): object
static migrateDataSafe(source: object, options?: Readonly<DataModelCleaningOptions>): object
static shimData(data: object, options?: { embedded?: boolean }): object
static cleanData(data?: object, options?: DataModelCleaningOptions, _state?: Partial<DataModelUpdateState>): object
```

- `migrateData` — "Migrate candidate source data for this DataModel which may require initial cleaning or transformations."
- `shimData` — "Take data which conforms to the current data schema and add backwards-compatible accessors to it in order to support older code which uses this data."

`foundry.abstract.TypeDataModel` **inherits both without overriding** (its own methods are only `onEmbed`, `prepareBaseData`, `prepareDerivedData`), so a system's `TypeDataModel` subclass can override `migrateData` directly.

**Core applies these automatically.** From the API Migration Guides (issue #6825):
> "These methods are **automatically used as part of Document modification workflows** so that old-schema data is accepted and automatically migrated..."

Timing, per the system-data-models article: "when the source data is first retrieved from disk, as well as run on any update deltas before they are applied to the Document."

**The critical caveat: in-memory only. Core never persists the result.** That is exactly why every real system *also* ships a hand-rolled world migration ([[migrations-are-roll-your-own]]). `migrateData` makes old data *readable*; it does not make it *fixed*.

Real override — dnd5e `data/activity/save-data.mjs` (dnd5e has ~42 such overrides):
```js
static migrateData(source) {
  if ( foundry.utils.getType(source.save?.ability) === "string" ) {
    if ( source.save.ability ) source.save.ability = [source.save.ability];
    else source.save.ability = [];
  }
}
```

Bonus core helper: **`Document#migrateSystemData(): object`** (instance) — "For Documents which include game system data, migrate the system data object to conform to its latest data model."

**For Battleframe:** this is a genuinely useful seam — a ruleset module's `TypeDataModel` can own its own `migrateData` and version its schema independently of the system. That is a real argument for [[modules-can-contribute-document-subtypes|the subtype architecture]]: rulesets get core's migration shim for free.
