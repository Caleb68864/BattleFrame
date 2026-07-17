---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# AP(X) Is a Penalty to the Defender's Block Roll, Not a Modifier to the Attacker

GF Core Rules v3.5.1, verbatim:

> **AP(X):** Targets get -X to Defense rolls when blocking hits from this weapon.

AP acts entirely on **step 3** of [[mechanics-two-roll-combat-hit-then-block]] — the defender's block. It never touches the to-hit roll. There is no armour-penetration-vs-armour-value comparison, no wound table: AP is a **flat numeric penalty to a d6 save**.

## Interactions worth encoding carefully

- **The global clamp still applies.** *"Regardless of modifiers, rolls of 6 always succeed, and rolls of 1 always fail."* So even `AP(4)` against `Defense 5+` leaves a **1-in-6 save** — AP can never zero out a save. A naive `target = defense + ap` with no clamp is wrong, and wrong in the direction that silently deletes models. See [[mechanics-quality-and-defense-are-the-only-two-stats]].
- **Cover now collides with AP.** In v3.x cover is *"+1 to Defense rolls"* — the **same axis as AP**, so they simply sum. In v2.16 cover was *"-1 to hit"*, a **different axis** that AP never interacted with. This is a real behavioural change between versions ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]) and a trap if you learned the game on v2.
- **`Rending` is additive in v3**: 6s to hit get **AP(+4)** (v2.16: 6s *"count as AP(4)"* — replacement, not addition). Different maths.

## Modelling note

Because AP, cover, and Rending all resolve onto **one number** (the defender's block target), the engine wants a **single modifier pipeline** for the block roll: collect `+cover`, `-AP`, `-Rending bonus`, sum, then apply the 1/6 clamp **last**. Clamping is a post-processing step over the summed total, never per-modifier.

The API delivers AP pre-parsed as `{"name":"AP","rating":1,"label":"AP(1)"}` on the weapon's `specialRules` ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]) — so `rating` feeds the pipeline directly with no text parsing.

**Confidence: confirmed** — quoted from GF Core Rules v3.5.1. AP(X) is identical across GF, GFF, AoF, AoFS, AoFR; Warfleets instead uses weapon **Strength** as the block penalty ([[family-warfleets-is-a-separate-engine]]).
