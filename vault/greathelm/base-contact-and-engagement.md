---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Base Contact — The Only Engagement Concept

GREATHELM has **no zone of control, no engagement range, no free strikes**. There is exactly one spatial relation that matters: *bases are touching*.

QSR p1, verbatim:

> **base contact and attacking**
> Knights must be in base contact with enemies to perform an attack or bash action.
> You may perform a light or heavy melee attack with any weapon a knight is equipped with.

And:

> Knights can **freely move out of base contact with enemies without penalty**.

Goonhammer corroborates: "Being base to base with enemies doesn't hamper or slow movement in any way either, you can simply walk away from combat."

## What base contact gates

| Rule | Requires base contact |
|---|---|
| Bash / Light Melee / Heavy Melee ([[dice-face-to-action-mapping]]) | Yes — with an enemy |
| [[outnumbering]] bonus | Yes — ally touching a combatant |
| [[courage-test]] trigger | Yes — damaged knight touching an enemy |

## Design consequence

Because disengaging is free, combat is **voluntary every round**. A damaged knight can Shift (1") out of contact to dodge the courage test entirely. There is no sticky-combat rule forcing commitment.

This makes the single boolean `inBaseContact(a, b)` the most heavily-queried predicate in the whole ruleset — it gates attacks, modifiers, and morale. For an engine, base-contact adjacency should be a first-class cached relation, not recomputed ad hoc. `confidence: unverified` — engineering opinion, not a rule.

Related: [[movement-and-measurement]] · [[outnumbering]] · [[courage-phase]]
