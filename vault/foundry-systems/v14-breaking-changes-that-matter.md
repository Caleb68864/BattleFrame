---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/releases/
confidence: confirmed
---

# v14 Breaking Changes That Matter

For a system started now on [[foundry-v14-is-current-as-of-july-2026|v14]].

## MeasuredTemplate Documents are GONE

The big one, and it lands squarely on wargames. From the release notes:

> "the first time that we have ever eliminated one of the fundamental types of data that Foundry VTT uses (called a 'Document')."

**Scene Regions replace them.** Any blast marker, template weapon, flamer cone, or AoE mechanic in a skirmish ruleset must be designed on **Regions**, not MeasuredTemplates. Every pre-v14 tutorial and system source showing `MeasuredTemplate` is now misleading.

This deserves its own spike alongside [[gridless-is-a-first-class-grid-class|true-inch measurement]] — together they are the canvas-side risk for Battleframe, and they are a bigger unknown than the plugin architecture.

## Other v14 breaks

- **`template.json` deprecation period began** — see [[template-json-vs-datamodels]].
- `ApplicationV2#bringToTop` removed → use `#bringToFront`.
- `AudioContainer` removed → `foundry.audio.Sound`.
- `colorPicker` Handlebars helper removed → `<color-picker>` element.
- **~40 global class shortcuts removed** in favour of namespaced paths. Expect `foundry.*` everywhere — this is why old tutorials' bare `Actors.registerSheet` / `DocumentSheetConfig` calls no longer match ([[v13-v14-sheet-registration-namespaces]]).
- Legacy field names removed: `ActiveEffect#label`, `ChatMessage#user`, scene fog props.
- Document **write-batching** + DataModel handling refactor (performance).

## Where to find breaking changes

**Not found:** there is no v13 or v14 migration guide. `/article/migration/` stops at V12. Per-version breaking changes live in the **release notes** and GitHub issues, not in articles. Budget for reading release notes directly.
