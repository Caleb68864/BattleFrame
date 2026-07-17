---
tags: [foundry-vtt, system-development]
source: index
confidence: confirmed
---

# Foundry VTT System Development — Index

Research on the **system** side of Foundry (v13/v14) and the system/module boundary, for the ruleset-neutral Battleframe system. Module-side notes live in the personal vault under `Software/Foundry VTT/` and are not duplicated here.

## The critical question

**Can a module contribute Actor/Item data models and sheets to a system at runtime? → YES.** Official since v11, with one constraint: type *names* are static, the *code* is dynamic.

- [[modules-can-contribute-document-subtypes]] — the answer, and the official article backing it.
- [[document-subtypes-must-be-declared-statically-in-the-manifest]] — the one hard constraint: names ship in the manifest, server-enforced.
- [[registering-a-typedatamodel-at-init]] — `CONFIG.Actor.dataModels` is a plain mutable object; a module writes into it without the system's permission.
- [[document-subtypes-are-namespaced-by-package-id]] — `opr.squad` vs `greathelm.squad` can never collide.
- [[modules-can-register-sheets-for-system-types]] — confirmed from Tidy5e's source, with a surprise about the `scope` argument.
- [[module-subtypes-are-not-guaranteed-to-work-with-a-given-system]] — the official caveat, and why it doesn't bind a purpose-built system.
- [[module-subtypes-vanish-when-the-module-is-disabled]] — the real operational cost.
- [[hastypedata-and-modelprovider-subtype-utilities]] — how to ask "which ruleset owns this actor?"
- [[the-experiment-that-would-settle-the-critical-question]] — the half-day spike that closes the remaining ergonomic unknowns.

## Precedent

- [[custom-system-builder-is-the-key-precedent]] — the most sophisticated pluggable system, and it deliberately does **not** use dynamic subtypes.
- [[csb-ships-rulesets-as-compendium-data-not-code]] — how a game becomes a module in CSB: a compendium pack, zero JS.
- [[swade-card-based-initiative-precedent]] — non-numeric turn order working in production, via projection onto a number.
- [[lancer-activation-based-combat-precedent]] — combat with no initiative at all; the closest match to wargame activation.

## Data models

- [[typedatamodel-defineschema-and-data-preparation]] — `defineSchema` is static, and why that matters for a neutral system.
- [[template-json-vs-datamodels]] — `template.json` entered formal deprecation in v14. Don't write one.
- [[generic-type-with-a-ruleset-blob-workaround]] — the fallback, with its costs priced honestly.
- [[objectfield-as-a-freeform-system-data-escape-hatch]] — **unverified inference**; the mechanism the blob approach would need.

## Combat

- [[turn-order-model-is-replaceable-but-storage-is-not]] — the headline: model yes, storage no.
- [[combat-overridable-methods-reference]] — verbatim signatures for every override point.
- [[config-combat-initiative-has-no-default-formula]] — core ships no formula; `Combat` supports subtypes too.
- [[combat-tracker-is-replaceable-via-config-ui-combat]] — the exact config key for owning the tracker UI.

## Grid and measurement

- [[system-json-grid-is-a-default-not-a-lock]] — grid varies per Scene; the manifest only sets a default.
- [[grid-types-and-diagonal-rules-constants]] — all four hex orientations and seven diagonal rules ship in core.
- [[gridless-is-a-first-class-grid-class]] — Euclidean measurement in inches works; base-to-base doesn't.
- [[custom-distance-measurement-has-no-clean-override-seam]] — the `cost` callback is the only seam; the core issue is open.

## Manifests, sheets, versions

- [[system-only-manifest-fields]] — only 7 fields are truly system-only; `documentTypes` is shared.
- [[applicationv2-sheet-structure]] — `PARTS`, `DEFAULT_OPTIONS`, `_prepareContext`, and dnd5e's reusable mixin.
- [[v13-v14-sheet-registration-namespaces]] — the globals moved; old tutorials are wrong.
- [[foundry-v14-is-current-as-of-july-2026]] — 14.365, stable since April. Target v14.
- [[v14-breaking-changes-that-matter]] — **MeasuredTemplate Documents were deleted.** Read this one.

## Migrations

- [[migrations-are-roll-your-own]] — no world-migration framework, no hooks. Build it yourself.
- [[datamodel-migratedata-is-an-automatic-in-memory-shim]] — the layer core *does* provide, and why it never saves.
- [[version-tracking-for-migrations-has-no-standard]] — dnd5e, pf2e, and CSB each do it differently.

## Settings, API, licensing

- [[settings-and-api-namespace-conventions]] — no official API mechanism; dnd5e's pattern solves load order.
- [[foundry-branding-rules-constrain-naming]] — you may not put "Foundry Virtual Tabletop" in a title.
- [[foundry-license-permits-selling-and-self-distribution]] — listing is optional; selling needs no agreement; SRD gets no safe harbor.
- [[foundry-ai-content-policy-deadline]] — a 14 Sept 2026 deadline, and a broad "UI labels" clause.

## Synthesis

- [[battleframe-architecture-implications]] — **inference, not fact.** The recommendation, and why the canvas is the real risk rather than the plugin architecture.
