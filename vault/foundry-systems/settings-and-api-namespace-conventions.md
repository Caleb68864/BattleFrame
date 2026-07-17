---
tags: [foundry-vtt, system-development]
source: https://raw.githubusercontent.com/foundryvtt/dnd5e/master/dnd5e.mjs , https://foundryvtt.com/api/classes/foundry.packages.System.html
confidence: confirmed
---

# Settings and API Namespace Conventions

## Settings — confirmed

Systems register settings under `game.system.id` as the namespace:
```js
game.settings.register(game.system.id, 'initFormula', { /* ... */ });
game.settings.get(game.system.id, 'loggingLevel');
```
Using `game.system.id` rather than a hardcoded string survives forks/renames. This is CSB's pattern throughout. dnd5e's migration setting is `scope: "world", config: false, type: String, default: ""`.

## Public API — there is NO official mechanism

**Confirmed by absence:**
- No `api` field in `SystemManifestData` **or** `ModuleManifestData`.
- `foundry.packages.System` has **no `api` property**. Its props: `_source`, `availability`, `exclusive`, `hasStorage`, `locked`, `owned`, `parent`, `strictDataCleaning`, `tags`.
- `game.system.api` — **not found**, no such documented property.
- The module-development article never mentions `api` or `game.modules.get(id).api`.

**The entire public-API story is convention.** `game.modules.get(id).api` is the widely-used module-side convention and is equally unofficial.

## What dnd5e actually does — the pattern to copy

Verbatim from `dnd5e.mjs`:
```js
globalThis.dnd5e = {
  applications, canvas, config: DND5E, dataModels, dice, documents,
  enrichers, Filter, migrations, registry, ui: {}, utils
};

Hooks.once("init", function() {
  globalThis.dnd5e = game.dnd5e = Object.assign(game.system, globalThis.dnd5e);
```

**The load-order trick is the point.** The namespace is built at **module top level** — so it exists before *anyone's* `init` runs, regardless of package load order. Then at `init` it is merged onto `game.system`, binding `globalThis.dnd5e`, `game.dnd5e`, and `game.system` to the same object.

**This solves Battleframe's registration problem.** A ruleset module calling `battleframe.registerRuleset(...)` from its own `init` works no matter which package loads first, because the namespace was assigned at top-level evaluation, not in a hook. That removes the load-order uncertainty flagged in [[the-experiment-that-would-settle-the-critical-question]] — though a hook-based alternative (`Hooks.callAll('battleframe.registerRuleset', registry)`) remains viable and is more idiomatic for one-to-many.

Bonus: dnd5e suppresses known core deprecation warnings via `CONFIG.compatibility.excludePatterns.push(/regex/, ...)` — useful during a migration window.
