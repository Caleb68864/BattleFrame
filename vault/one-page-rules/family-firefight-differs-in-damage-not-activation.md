---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5def962105fb4d96027_GFF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Firefight Is NOT a Per-Model Skirmish Game — It Changes Damage and Morale, Not Activation

**Correcting the obvious assumption.** "Skirmish game" normally implies per-model activation. **Firefight does not do this.** It uses the *identical* alternating **unit** activation as Grimdark Future, verbatim, and the *identical* Hold/Advance/Rush/Charge table ([[mechanics-alternating-unit-activation-is-the-core-turn-structure]], [[mechanics-four-actions-hold-advance-rush-charge]]).

Scale: 10-15 models, 40-60 min, 4'x4' with 20+ terrain, **200/300pts** (vs GF's 60-90 models, 6'x4', 1000/2000pts).

## What actually differs — the damage model

GF: *"For each wound, the defender must remove one model."* A wound kills.

**Firefight adds Wound Effects** — wounds become markers, and models roll to see what happens:

> **Groups & Wounds:** … each wound kills one model, until only one last model remains. Only the last model then accumulates wounds.

Wound markers accumulate on that last model; it rolls **D6 + markers**: **1-5 = Shaken, 6+ = Knocked Out**.

**`Tough(X)` is redefined**, same name, different semantics:
- GF: *"must take X wounds before being killed"*
- GFF: *"only rolls to check wound effects once it has taken X wounds or more, and is only Knocked Out on rolls of 5+X or more"*

## And morale moves from unit to army

- **GF**: per-unit test at half strength or on losing melee ([[mechanics-morale-has-two-distinct-triggers]]).
- **GFF**: **army-level**, checked at end of round, when the army is at **half its starting *units***. Already-Shaken units rout.

## Why this is the interesting case for BattleFrame

This is the **real test** of the ruleset-neutral thesis — far more informative than [[family-gf-and-aof-are-the-same-engine-reskinned]], which is a reskin, not a variant.

Firefight holds **activation, actions, stats, movement, terrain and the special-rules glossary** constant while swapping **damage resolution** and **morale scope**. That is precisely the shape an engine should support: a stable core with **pluggable damage and morale modules**.

Two concrete architectural demands:
1. **Damage resolution must be a strategy, not a hard-coded "wound → remove model."**
2. **`Tough` proves rule *names* are not globally unique across rulesets.** A shared rule registry keyed on name alone will silently apply GF's Tough in a Firefight game — a nasty, quiet bug. The registry must be **scoped per ruleset**, with the ruleset id resolved at import ([[api-game-system-ids-are-inconsistent-int-vs-slug]]).

**Confidence: confirmed** — GFF Core Rules v3.5.1 PDF text-extracted and compared directly against GF v3.5.1. Related: [[assessment-one-engine-can-host-most-of-the-family]].
