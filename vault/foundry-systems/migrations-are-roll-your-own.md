---
tags: [foundry-vtt, system-development]
source: https://gitlab.com/api/v4/projects/31995966/repository/files/src%2Fmodule%2Fmigrations%2FmigrationUtils.ts/raw?ref=develop
confidence: confirmed
---

# World Migrations Are Roll-Your-Own

**There is no core *world* migration framework.** Confirmed: no `migrateWorld` in `foundry.utils`, and **no hook containing "migrat"** anywhere in `hookEvents` (v14.365).

**Do not conflate this with the schema shim layer, which core DOES provide automatically** — see [[datamodel-migratedata-is-an-automatic-in-memory-shim]]. The two layers:

| Layer | Core-provided? | Behavior |
|---|---|---|
| Schema shim (`DataModel.migrateData` / `shimData`) | **Yes, automatic** | Transforms source in memory on read/update. **Never writes to DB.** |
| World migration (walk docs, `.update()`) | **No** | Roll-your-own entirely |

The rest of this note is the second layer. Confirmed by reading [[custom-system-builder-is-the-key-precedent|CSB]]'s v14 migration code — entirely hand-built on `foundry.utils.isNewerVersion`.

CSB's structure (`src/module/migrations/`):
```
migrationHandler.ts     — orchestrator
migrationUtils.ts       — shared helpers
migration_4_5_0.ts      — one file per version
migration_4_6_4.ts
migration_5_0_0.ts
```

The orchestrator is a flat sequential list, run on every load:
```js
export default async function processMigrations() {
    await detectSwitchVersion();
    await migration_4_5_0.processMigration();
    await migration_4_6_4.processMigration();
    await migration_5_0_0.processMigration();
}
```

**The notable design choice: version is tracked PER DOCUMENT via flags, not world-wide.**
```js
export function getActorsToMigrate(versionNumber: string): CustomActor[] {
    return game.actors.filter((actor) =>
        foundry.utils.isNewerVersion(versionNumber, actor.getFlag(game.system.id, 'version') as string)
    );
}
// ...after migrating:
await document.setFlag(game.system.id, 'version', versionNumber);
```

This is more robust than a single world-level `systemMigrationVersion` setting: documents imported from an old compendium, or restored from backup, get migrated on sight rather than being silently skipped because the world was already marked current. **Directly relevant to Battleframe**, where documents arrive from ruleset module compendia at arbitrary versions.

Other confirmed details:
- Migrations are GM-gated (`if (!game.user.isGM) return;`).
- Progress surfaces via `ui.notifications.info(msg, { progress: true })` — a real progress notification API.
- CSB prompts the user with a backup warning dialog before migrating, and offers a decline path.

**Trigger timing:** both dnd5e and pf2e run world migration from `Hooks.once("ready")` — correct, since it needs `game.actors` / `game.packs` / `game.settings` populated. (`migrateData` overrides by contrast must exist by `init` — they are class definitions.) Lifecycle: `init` → `i18nInit` → `setup` → … → `ready`.

**pf2e's multi-GM guard is better than CSB's or dnd5e's:** `if (game.user !== game.users.activeGM) return;` — `game.user.isGM` runs once per *connected* GM, so a world with two GMs online migrates twice.

Version-tracking approaches differ by system — see [[version-tracking-for-migrations-has-no-standard]].

`DataModel.migrateData` / `shimData` are **confirmed to exist** in both v13 and v14 — see [[datamodel-migratedata-is-an-automatic-in-memory-shim]].
