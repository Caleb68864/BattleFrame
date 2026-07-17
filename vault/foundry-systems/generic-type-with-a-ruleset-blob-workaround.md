---
tags: [foundry-vtt, system-development]
source: inference (grounded in CSB source, https://gitlab.com/custom-system-builder/custom-system-builder)
confidence: partial
---

# Generic Type With a Ruleset Blob: The Workaround

The fallback if [[modules-can-contribute-document-subtypes|module-contributed subtypes]] are rejected — and the path [[custom-system-builder-is-the-key-precedent|CSB actually took]].

**Shape:** the system declares a small fixed set of generic types (`unit`, `model`, `weapon`, `_ruleset`). Each carries a loosely-typed `system` payload that the active ruleset interprets. Rulesets ship as data (compendium documents) and/or code that reads the blob.

**Costs, honestly:**

| Cost | Detail |
|---|---|
| No schema validation | An `ObjectField` blob is opaque to core. No field types, no server-side sanitization of `htmlFields`/`filePathFields` for ruleset-specific fields. See [[objectfield-as-a-freeform-system-data-escape-hatch]]. |
| No per-type sheets from core | One `unit` type means one default sheet registration; the sheet must dispatch on ruleset internally rather than core picking by type. |
| Type labels are wrong | `TYPES.Actor.unit` is one string. The UI's "create Actor" dialog shows your generic types, not "OPR Squad" / "GREATHELM Warband". |
| Search/filter degraded | Core sidebar filtering by type can't distinguish rulesets. |
| You rebuild validation | Whatever core's DataModel would have given you, you write by hand. |

**Benefits (real, not trivial):**
- Documents stay valid when a ruleset module is absent — no [[module-subtypes-vanish-when-the-module-is-disabled|disappearing documents]].
- Rulesets need no manifest, no package, no code — pure data. Lowest possible authoring bar.
- Works for *user-created* rulesets at runtime, which subtypes structurally cannot.

**Assessment (inference — marked partial):** the third benefit is CSB's entire reason for choosing this, and **Battleframe does not need it**. Battleframe's rulesets are authored packages. Paying CSB's costs to buy a capability the project doesn't want would be a poor trade. See [[battleframe-architecture-implications]].

A hybrid is available: subtypes for authored rulesets *plus* a generic type as a graceful-degradation target for the converter that [[module-subtypes-vanish-when-the-module-is-disabled|the docs recommend shipping]].
