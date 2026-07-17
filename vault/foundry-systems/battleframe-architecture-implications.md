---
tags: [foundry-vtt, system-development]
source: inference (synthesis of confirmed findings in this folder)
confidence: partial
---

# Battleframe Architecture Implications

**This note is synthesis and judgement, not a fetched fact.** The findings it rests on are confirmed; the recommendation is inference.

## The core architecture is viable

The premise — ruleset modules registering with a neutral system — is **supported by core Foundry**, not a hack:

- [[modules-can-contribute-document-subtypes]] — official since v11.
- [[registering-a-typedatamodel-at-init]] — `CONFIG.Actor.dataModels` is a plain mutable object; a module writes into it at `init` without system permission.
- [[modules-can-register-sheets-for-system-types]] — confirmed in production (Tidy5e).
- [[document-subtypes-are-namespaced-by-package-id]] — `opr.squad` and `greathelm.warband` can never collide.
- [[system-only-manifest-fields]] — `documentTypes` is on **both** manifest interfaces. This is not a system privilege being borrowed; it is a shared field.
- [[datamodel-migratedata-is-an-automatic-in-memory-shim]] — a bonus: each ruleset's `TypeDataModel` owns its own `migrateData`, so rulesets version their schemas independently and get core's shim free.
- [[settings-and-api-namespace-conventions]] — dnd5e's top-level-assignment pattern means a `battleframe.registerRuleset(...)` API works regardless of package load order.

## The one hard constraint

[[document-subtypes-must-be-declared-statically-in-the-manifest]] — type *names* ship in `module.json`. Not runtime-invented.

**This constraint does not bind Battleframe.** Ruleset modules are authored packages with their own manifests. Each declares its own types at author time. That is exactly the supported case.

## Why Battleframe should not simply copy CSB

[[custom-system-builder-is-the-key-precedent|CSB]] chose [[generic-type-with-a-ruleset-blob-workaround|the generic-blob path]] and it is tempting to read that as the verdict. It isn't. **CSB's requirement is strictly harder**: users invent systems at runtime, which subtypes structurally cannot serve. Battleframe does not need that. Paying CSB's costs (no schema validation, wrong type labels, hand-rolled everything — see [[csb-ships-rulesets-as-compendium-data-not-code]] for the ceiling it imposes) to buy a capability the project doesn't want is a bad trade.

## Recommended shape (inference)

- Rulesets as **modules declaring their own subtypes**, with `relationships.systems` pinning them to Battleframe.
- Battleframe publishes a **registration API** and never switches on a closed type list — this inverts [[module-subtypes-are-not-guaranteed-to-work-with-a-given-system|the "no guarantee" caveat]], which is about *uncooperative* systems.
- Combat: follow [[lancer-activation-based-combat-precedent|Lancer]] — ignore `initiative`, sort on ruleset data, `turn: null`, own the tracker ([[combat-tracker-is-replaceable-via-config-ui-combat]]).
- Grid: default `{"type": 0, "distance": 1, "units": "in"}`, accept it's [[system-json-grid-is-a-default-not-a-lock|advisory only]].
- Target **v14** ([[foundry-v14-is-current-as-of-july-2026]]), ApplicationV2-only, no `template.json`, no `maximum` in `compatibility`.
- Ship a converter to a generic type for [[module-subtypes-vanish-when-the-module-is-disabled|the module-disabled case]].
- Migration versioning: per-document flags, not a world setting ([[version-tracking-for-migrations-has-no-standard]]) — Battleframe's documents arrive from ruleset compendia at arbitrary versions.

## Open risks — and a reframing

**The plugin architecture is not the risky part. The canvas is.** Two findings landed harder than the critical question:

1. **[[v14-breaking-changes-that-matter|MeasuredTemplate Documents were deleted in v14]].** Blast markers, template weapons, flamer cones — every AoE mechanic in a skirmish ruleset — must be rebuilt on **Scene Regions**. All pre-v14 precedent is misleading here.
2. **[[gridless-is-a-first-class-grid-class|True edge-to-edge inch measurement]] has no clean seam.** Foundry measures center-to-center; miniature rules measure base-to-base. [[custom-distance-measurement-has-no-clean-override-seam|The override seam is thin]] and the relevant core issue is open and unanswered.

Both are core to what a miniature wargame *is*, and neither has a precedent system to copy. **Spike these before the plugin work** — the plugin question is settled, these are not.

3. [[the-experiment-that-would-settle-the-critical-question]] is cheap and settles the ergonomics of module-supplied types. Run it, but it is expected to pass.
