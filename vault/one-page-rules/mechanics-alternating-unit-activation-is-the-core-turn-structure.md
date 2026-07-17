---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# OPR Uses Strict Alternating Unit Activation With No Per-Round Initiative Roll

The defining structural feature of the OPR engine. Quoted verbatim from GF Core Rules **v3.5.1**:

> Each round, players alternate in activating one unit each, starting with the player that won the deployment roll-off. Each new round, the player that finished activating first on the last round gets to go first.

The Beginner's Guide v3.5.1 makes the nesting explicit:

> **Rounds:** Each round is made up of multiple turns. **Turns:** Each turn is made up of a single activation. **Activations:** Each activation is made up of an action.

So the hierarchy is **Round → Turn → Activation → Action**. A "turn" in OPR is **one unit doing one thing** — not a player-turn. This is a vocabulary trap when mapping onto Foundry's combat tracker, which assumes turn ≈ combatant and round ≈ full cycle. OPR happens to fit that shape well: **one Foundry "turn" = one unit activation.**

Mechanically:
- One roll-off, at deployment, for the whole game. **No per-round initiative roll.**
- Players alternate **unit by unit** until all units have activated; then the round ends.
- Each unit activates **exactly once** per round, and takes **exactly one action** ([[mechanics-four-actions-hold-advance-rush-charge]]).
- Round 2+ first player is **not re-rolled** — see [[mechanics-first-player-next-round-is-whoever-finished-activating-first]].

## Universality across the family

This exact wording is **identical** in Grimdark Future, GF: Firefight, Age of Fantasy, AoF: Skirmish, and AoF: Regiments — five of the eight rulesets. Firefight and Skirmish are **not** per-model activation games, a common assumption about skirmish rules; they activate units exactly as GF does. Only the Quest games ([[family-quest-games-use-hero-then-ai-activation]]) and Warfleets ([[family-warfleets-is-a-separate-engine]]) deviate.

This makes activation the **most portable** part of the engine — see [[assessment-one-engine-can-host-most-of-the-family]].

**Confidence: confirmed** for GF and GFF (v3.5.1 PDFs text-extracted). **Partial** for AoF/AoFS/AoFR — verified at wiki v3.4.1 only; no changelog suggests a change, but the current PDFs were not opened.

The critical open question is [[mechanics-alternating-activation-with-uneven-unit-counts-is-unspecified]].
