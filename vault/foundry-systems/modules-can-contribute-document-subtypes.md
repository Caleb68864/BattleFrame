---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/module-sub-types/
confidence: confirmed
---

# Modules Can Contribute Document Subtypes

**Yes.** Since Foundry v11, a module can contribute Actor/Item (and any document with a `system` field) subtypes. This is a first-class, documented core feature — not a hack.

From the official article: "As of version 11, modules can extend document sub-types similarly to how systems do. Any document with a `system` field can receive additional sub-types, which become available to users with the module activated."

Two required halves:

1. **Static declaration** in `module.json` under `documentTypes` — see [[document-subtypes-must-be-declared-statically-in-the-manifest]].
2. **Runtime registration** of the DataModel class at `init` — see [[registering-a-typedatamodel-at-init]].

The system does **not** need to cooperate for the document to exist and persist. The server validates against the manifest, not against the system.

But "works" and "is useful" are different questions — see [[module-subtypes-are-not-guaranteed-to-work-with-a-given-system]] and [[module-subtypes-vanish-when-the-module-is-disabled]].

Related: [[document-subtypes-are-namespaced-by-package-id]], [[hastypedata-and-modelprovider-subtype-utilities]].
