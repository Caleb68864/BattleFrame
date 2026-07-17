---
tags: [wargame-research, one-page-rules]
source: https://onepagefan.wiki/index.php/Age_of_Fantasy_Regiments_Core_Rules
confidence: partial
---

# AoF: Regiments Keeps the Core but Bolts On Rank-and-Flank Geometry

**Age of Fantasy: Regiments** is the rank-and-flank variant — the Warhammer-Fantasy-shaped member of the family. Scale: 6'x4' with **10+** terrain (vs 15+), **750/1500pts**.

It keeps the shared core **intact**: the same alternating unit activation, the same Hold/Advance/Rush/Charge table, Quality/Defense, hit→block, the shared glossary ([[mechanics-alternating-unit-activation-is-the-core-turn-structure]], [[mechanics-quality-and-defense-are-the-only-two-stats]]).

What it **adds** is entirely **geometry**:

- **Mandatory formations**: *"5 models per row with 5/10 models, and 3 models per row with 3/6 models"* — unit shape is prescribed, not free-form.
- **Facing and arcs**, with **pivot limits**.
- **Front-arc-only shooting.**
- **Only "the two front rows" strike** in melee.
- **Flanking morale penalties**: **-1 / -2** for flank / rear charges.
- **Full rows count** toward melee results.

## Why this is the hardest variant to host

Regiments **directly contradicts** the assumption baked into every other OPR game: [[mechanics-measurement-is-free-and-there-are-no-facing-rules]]. GF explicitly says *"models may move and turn in any direction regardless of their facing"* and treats a unit as a loose coherency blob. Regiments makes units **rigid, oriented rectangles**.

For BattleFrame this means the engine's **spatial model cannot assume facing-agnostic loose units**. It needs:
- A **formation** concept (rows/files) as an alternative to coherency chains.
- **Facing** as first-class token state, with arc computation.
- **Row-based participation** in melee (which models can strike is determined by position in formation, not by a 2"/4" range check).

That's a substantial layer — harder than [[family-firefight-differs-in-damage-not-activation]] (which swaps a resolution module) because it changes the **geometry substrate** the whole engine sits on. It is, however, the single most valuable stress test of a ruleset-neutral spatial abstraction: if the engine can host both GF's blobs and Regiments' rectangles, the spatial model is genuinely general.

## Recommendation

**Defer Regiments, but design the spatial layer knowing it exists.** Don't build it early; don't hard-code facing-agnostic assumptions so deep that adding it later means a rewrite. See [[assessment-one-engine-can-host-most-of-the-family]].

**Note:** Regiments appears to have **no campaign rules** — absent from the official resources listing, which lists only Core Rules, Beginner's Guide and Tournament Guidelines for it ([[mechanics-campaign-persistence-xp-injuries-and-permadeath]]). Absence of evidence, not a stated deprecation.

**Confidence: partial** — mechanics are **quoted** but from the **community wiki at v3.4.1**, not the official v3.5.1 Regiments PDF (not opened). Structure is reliable; exact numbers may have drifted ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]).
