---
tags: [foundry-vtt, system-development]
source: https://raw.githubusercontent.com/foundryvtt/dnd5e/master/dnd5e.mjs , https://gitlab.com/api/v4/projects/31995966/repository/files/src%2Fmodule%2Fmigrations%2FmigrationUtils.ts/raw?ref=develop
confidence: confirmed
---

# Version Tracking for Migrations Has No Standard

The three flagship systems each do it differently. There is no core convention.

**dnd5e — semver string in a world setting, thresholds in `system.json` flags:**
```js
const cv = game.settings.get("dnd5e", "systemMigrationVersion") || game.world.flags.dnd5e?.version;
const totalDocuments = game.actors.size + game.scenes.size + game.items.size;
if ( !cv && totalDocuments === 0 ) return game.settings.set("dnd5e", "systemMigrationVersion", game.system.version);
if ( cv && !foundry.utils.isNewerVersion(game.system.flags.needsMigrationVersion, cv) ) return;
migrations.migrateWorld();
```
Thresholds live in **`system.json` `flags`** — dnd5e-invented, not core fields:
```json
"flags": { "needsMigrationVersion": "5.3.0", "compatibleMigrationVersion": "0.8" }
```

**pf2e — monotonic float schema number, decoupled from system version:**
```ts
static LATEST_SCHEMA_VERSION = 0.935;
static MINIMUM_SAFE_VERSION = 0.7;
```
Two settings: `worldSchemaVersion` (Number, drives migration) + `worldSystemVersion` (String semver, display only). Decoupling schema version from release version is the cleaner idea here.

**CSB — per-document flags, no world version at all:**
```js
foundry.utils.isNewerVersion(versionNumber, actor.getFlag(game.system.id, 'version'))
// ...after migrating:
await document.setFlag(game.system.id, 'version', versionNumber);
```

**The per-document approach is the most robust and the most relevant to Battleframe.** A world-level version silently skips documents imported from an old compendium or restored from backup. Battleframe's documents arrive from ruleset module compendia at arbitrary versions — a world flag cannot express that.

Core does offer a per-document field: **`_stats.systemVersion`** — "The version of the system the Document was created or last modified in." dnd5e gates on this. Note the neighbouring `_stats.coreVersion` is *"the core version whose schema the Document data is in. It is NOT the version the Document was created or last modified in."*

pf2e also has `MigrationRunner.ensureSchemaVersion(document, migrations)` for migrating *incoming* docs at import/drag-drop time — directly applicable to compendium-sourced content.

**Caveat:** the pf2e code above is from a v12-pinned master (`"maximum": "12"`, version 6.12.4) while its latest release is 8.3.0. The *pattern* is version-independent; treat the exact code as **partial** for v14 currency.

Related: [[migrations-are-roll-your-own]].
