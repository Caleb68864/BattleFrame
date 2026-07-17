---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.SystemManifestData.html , https://foundryvtt.com/api/v14/interfaces/foundry.packages.types.ModuleManifestData.html
confidence: confirmed
---

# System-Only Manifest Fields

**The authoritative reference is the typedoc interfaces, not an article.** `/article/manifest/` does not exist (404). Read `foundry.packages.types.SystemManifestData` vs `ModuleManifestData`.

**The system/module split is much narrower than folklore suggests.** Only these are system-only — exactly what `BaseSystem.defineSchema()` adds over `BasePackage`:

| Field | Verbatim description |
|---|---|
| `background` | "A web URL or local file path which provides a default background banner for worlds which are created using this system" |
| `grid` | "The default grid settings to use for Scenes in this system." Sub-props `diagonals`, `distance`, `type`, `units` — see [[system-json-grid-is-a-default-not-a-lock]] |
| `initiative` | "A default initiative formula used for this system." |
| `primaryTokenAttribute` | "An Actor data attribute path to use for Token primary resource bars" |
| `secondaryTokenAttribute` | "An Actor data attribute path to use for Token secondary resource bars" |
| `type` | `"system"` literal |
| `strictDataCleaning` | Instance prop on `BaseSystem`, not strictly a manifest field — "Does the system template request strict type checking of data compared to template.json inferred types." |

**Module-only:** `coreTranslation`, `library` ("A library module provides no user-facing functionality"), `quickstart`.

**SHARED — commonly mis-assumed to be system-only:**
`documentTypes`, `socket`, `packFolders`, `protected`, `exclusive`, `relationships`, `compatibility`, `media`, `flags`, `license`, `url`, `manifest`, `download`, `esmodules`, `scripts`, `styles`, `packs`, `persistentStorage`, `authors`, `bugs`, `changelog`, `description`, `id`, `title`, `version`, `languages`, `readme`.

**`documentTypes` is on BOTH interfaces.** The module docs describe it identically: "Additional document subtypes provided by this module." This shared-ness is precisely what makes [[modules-can-contribute-document-subtypes|the Battleframe architecture]] possible. `socket` is likewise shared, not system-only.

Required to publish: `id`, `title`, `description`, `version`. (The system-development article says "Three fields are explicitly required" then lists four — an error in Foundry's own docs.)

**Design flag for Battleframe:** `primaryTokenAttribute` / `secondaryTokenAttribute` are **static string paths** into `system`, set once in the manifest. For a ruleset-neutral system where rulesets track different resources (wounds vs. hull vs. morale), one static path is a poor fit. Whether these can be overridden per-ruleset at runtime is **not found** — worth checking.
