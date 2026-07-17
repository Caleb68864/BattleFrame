---
tags: [foundry-vtt, system-development]
source: https://raw.githubusercontent.com/foundry-vtt-community/wiki.js/main/development/api/applicationv2.md , https://raw.githubusercontent.com/foundryvtt/dnd5e/master/module/applications/api/application-v2-mixin.mjs
confidence: confirmed
---

# ApplicationV2 Sheet Structure

The class stack for a v13/v14 actor sheet:

`foundry.applications.sheets.ActorSheetV2` → `foundry.applications.api.DocumentSheetV2` → `foundry.applications.api.ApplicationV2`, mixed with `foundry.applications.api.HandlebarsApplicationMixin`.

Key mechanics:

- **`static DEFAULT_OPTIONS`** — auto-merges up the inheritance chain. No `mergeObject` call needed (unlike V1). Limit the chain with `static BASE_APPLICATION`.
- **`static PARTS`** — each part returns exactly one top-level element; parts are concatenated in property order and wrapped in `options.tag` — `div` for ApplicationV2, **`form` for DocumentSheetV2**.
- **`_prepareContext(options)`** — async, returns context. Templates see *only* what you return. Async enrichment must happen here.
- **`_configureRenderOptions(options)`** — call `super` first, then filter `options.parts`.
- **`_onRender(context, options)`** — non-action listeners. Use `actions` in `DEFAULT_OPTIONS` for clicks.

**Gotcha the community wiki calls out:** `{{system.x}}` reads the *context*, while `name="system.x"` writes the *document path*. They merely tend to coincide — they are not the same thing.

## dnd5e is the v14 reference implementation

`system.json`: `compatibility: {minimum: "13.347", verified: "14"}`.

Its house mixin (`module/applications/api/application-v2-mixin.mjs`) is worth copying wholesale:
```js
const { HandlebarsApplicationMixin } = foundry.applications.api;
export default function ApplicationV2Mixin(Base, { handlebars=true }={}) {
  const _BaseApplication5e = handlebars ? HandlebarsApplicationMixin(Base) : Base;
```
Used as:
```js
export default class BaseActorSheet extends PrimarySheetMixin(
  ApplicationV2Mixin(foundry.applications.sheets.ActorSheetV2)
) {
```

**Research note:** foundryvtt.wiki renders client-side — fetching the live site returns an empty shell. Fetch raw markdown from `raw.githubusercontent.com/foundry-vtt-community/wiki.js/main/...` instead.

Registration: [[v13-v14-sheet-registration-namespaces]], [[modules-can-register-sheets-for-system-types]].
