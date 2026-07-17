---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# The Entire Action Economy Is One Action From a Table of Four

OPR's action economy is radically small. GF Core Rules v3.5.1: *"The player picks one unit that hasn't activated yet, and it **must** take one action"* —

| Action | Move | Notes |
|---|---|---|
| **Hold** | 0" | Can shoot |
| **Advance** | 6" | Can shoot after move |
| **Rush** | 12" | Can't shoot |
| **Charge** | 12" | Moves into melee |

**Exactly one action. Mandatory** (note *"must"* — there is no "do nothing" option; Hold *is* the do-nothing action, and it still shoots). No action points, no move-and-shoot budget, no multi-action sequencing. The whole economy is a **single enum pick**.

For BattleFrame this is close to the simplest possible action model — a four-valued enum with a movement allowance and a shooting permission bit.

Details (Beginner's Guide v3.5.1, **confirmed**):
- Advance/Rush/Charge are collectively **"Move Actions"**.
- **Hold**: models may not move but *"may freely turn to face any direction"* — vestigial, since GF has no facing ([[mechanics-measurement-is-free-and-there-are-no-facing-rules]]). It matters in Regiments ([[family-regiments-adds-facing-and-formations]]).
- **Charge**: *"may ignore the 1" distance restriction"*; requires at least one model within charge distance; *"Charge moves don't have to be in a straight line"*; if the charge becomes impossible mid-move (models killed, etc.), *"the unit may complete its move in any direction and ends its activation"*.

Modifiers act on the **table**, not on a speed stat: `Fast` = *"+2" when using Advance, and +4" when using Rush/Charge"*; `Slow` = *"-2"… -4""*. So the modifier system needs to know **which action** was taken — the action type is a first-class input to movement resolution, not just a flag.

Action restrictions are expressed as rules: `Immobile` and `Artillery` = *"May only use Hold actions."* `Aircraft` = *"May only use Advance actions."* So the engine needs a **legal-action filter** hook per unit.

## Universality

This exact table — 0/6/12/12 with the same permissions — is **identical** across Grimdark Future, GF: Firefight, Age of Fantasy, AoF: Skirmish, and AoF: Regiments. Even the skirmish games don't change it. Only the Quest games (which add Rest/Skill actions and a stress-for-extra-action economy — [[family-quest-games-use-hero-then-ai-activation]]) and Warfleets (Hold/Move/Cruise/Ram — [[family-warfleets-is-a-separate-engine]]) differ.

**Confirmed** for GF/GFF v3.5.1 PDFs; **partial** for AoF/AoFS/AoFR (wiki v3.4.1 only).
