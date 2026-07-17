---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/article/module-sub-types/
confidence: confirmed
---

# Module Subtypes Are Not Guaranteed to Work With a Given System

The official caveat, quoted: "While the core Foundry VTT API provides this mechanism for Modules to provide their own sub-types, there is no guarantee that existing Systems...will accommodate any given Module's additional sub-types."

Foundry's recommendation for Actor/Item subtypes specifically: **support only a single system**, and declare that in the module's `relationships` field. The docs note Journal Pages have far fewer compatibility concerns than Actors/Items — Actors/Items are where systems make assumptions.

**Why this caveat exists, and why it is weaker than it sounds for a purpose-built system:** the warning is aimed at modules bolting types onto *third-party* systems (dnd5e, pf2e) that were never designed to see them. Those systems hardcode `type === "character"` checks, iterate their own known types, assume `system.attributes.hp` exists, etc.

A system that is *designed* to host module-contributed types — publishing a registration API, iterating types generically, never switching on a closed type list — inverts the caveat. The "no guarantee" is a statement about uncooperative systems, not a core limitation. Core does its part regardless.

This is the crux of the Battleframe bet: [[modules-can-contribute-document-subtypes]] is a core guarantee; system accommodation is a design choice Battleframe controls.

Related: [[module-subtypes-vanish-when-the-module-is-disabled]].
