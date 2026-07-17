---
tags: [foundry-vtt, system-development]
source: inference
confidence: unverified
---

# The Experiment That Would Settle the Critical Question

The public sources answer the critical question **yes** ([[modules-can-contribute-document-subtypes]]), and that answer is confirmed from official docs. But the docs describe modules adding types to *third-party* systems, and the [[module-subtypes-are-not-guaranteed-to-work-with-a-given-system|"no guarantee" caveat]] is about system cooperation, which is untested for a *purpose-built cooperative* system.

**What is NOT settled from public sources:**
- Whether a module-provided Actor subtype behaves identically to a system-provided one in every core UI surface (create-Actor dialog, sidebar type filter, token config, compendium import).
- Whether a module subtype's Actor can be a token actor / prototype token without issue.
- Whether `ObjectField` round-trips arbitrary payloads unsanitized ([[objectfield-as-a-freeform-system-data-escape-hatch]]).
- Whether load order guarantees the system's `init` runs before the ruleset module's `init` (critical if the module must call a system-published API).

## The experiment (half a day, settles all of it)

1. Build a **minimal system** `bf-test`: `system.json` with `documentTypes: {"Actor": {"generic": {}}}`, one `TypeDataModel`, one ApplicationV2 sheet.
2. Build a **minimal module** `bf-ruleset-test`: `module.json` with
   ```json
   "documentTypes": { "Actor": { "squad": {} } },
   "relationships": { "systems": [{"id": "bf-test", "type": "system"}] }
   ```
   and an `init` hook doing `CONFIG.Actor.dataModels["bf-ruleset-test.squad"] = SquadModel;`
3. **Observe:**
   - Does "Create Actor" offer the `squad` type? Is its label right?
   - Does the document persist across reload? (This tests server-side manifest validation — the crux.)
   - Drop it on canvas — does the token work?
   - Disable the module — confirm the [[module-subtypes-vanish-when-the-module-is-disabled|disappearance]] behaviour and the warning.
   - Log `Hooks.once('init')` order: system vs module.
   - Log `actor.system.modelProvider` — does it return the module? ([[hastypedata-and-modelprovider-subtype-utilities]])
4. **Second module** declaring its own `squad` to confirm [[document-subtypes-are-namespaced-by-package-id|namespacing]] prevents collision.

**Why bother when the docs say yes:** the docs confirm the mechanism exists. They do not confirm the *ergonomics* are acceptable for a system whose entire content comes from modules — the difference between "one module adds a quest page type" and "every unit in the game is module-provided" is a difference in kind. This experiment is far cheaper than discovering it in month three.

Run this before committing to [[battleframe-architecture-implications|the recommended architecture]].
