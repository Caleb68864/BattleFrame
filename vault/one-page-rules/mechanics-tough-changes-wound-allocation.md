---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Tough(X) Overrides the Defender's Free Choice of Casualties

The base casualty rule gives the defender free choice: *"The defending player may remove models from the target in any order, keeping unit coherency in mind."*

**`Tough(X)` takes that choice away.** GF Core Rules v3.5.1:

> **Tough(X):** This model must take X wounds before being killed. If a model with tough joins a unit without it, then it is removed last when the unit takes wounds. You must continue to put wounds on the tough model with **most wounds** in the unit until it is killed, before starting to put them on the next tough model (**heroes must be assigned wounds last, even if already wounded**).

This is a **forced allocation algorithm**, not a player choice, and it is easy to get wrong:

1. Non-Tough models are removed **before** Tough models.
2. Among Tough models, wounds go to the one with **the most wounds already** — i.e. **finish the wounded one first**. This is counterintuitive; it prevents spreading damage.
3. **Heroes are allocated last**, *"even if already wounded"* — this **overrides rule 2**. A wounded hero still waits.

So allocation is a **priority sort** — `[non-Tough] → [Tough, descending by wounds taken] → [Heroes]` — with the hero clause as an explicit exception to the ordering. Wound allocation cannot be modelled as "defender picks"; it needs a deterministic resolver.

## Tough is also the single-model "size"

Trigger A of [[mechanics-morale-has-two-distinct-triggers]] is *"half or less of its **starting size or tough value** (for units with a single model)"*. So `Tough(X)` doubles as the health pool **and** the morale threshold for single-model units. `Tough(15)` means morale at 8+ wounds taken.

Dangerous terrain also keys off it: models roll *"one die (**or as many as their tough value**)"*.

## Interacting rules

- **`Deadly(X)`**: *"Assign each wound to one model, and multiply it by X. **Hits from Deadly must be resolved first**, and these wounds **don't carry over** to other models if the original target is killed."* — an explicit ordering constraint *and* an anti-spillover rule. Deadly must be resolved as a separate, earlier pass.
- **`Regeneration`**: *"When a unit where **all models** have this rule takes wounds, roll one die for each. On a 5+ it is ignored."* Note **all models** — a v3 tightening (v2.16 applied per-model).
- **Melee results count wounds, not kills** ([[mechanics-morale-has-two-distinct-triggers]]) — so Tough models make "wounds caused" and "models killed" diverge sharply, and the wound counter must be tracked independently of casualties.

Note Firefight **redefines Tough entirely** — *"only rolls to check wound effects once it has taken X wounds or more, and is only Knocked Out on rolls of 5+X or more"* ([[family-firefight-differs-in-damage-not-activation]]). Same rule name, different semantics: a caution for any shared rule registry ([[assessment-one-engine-can-host-most-of-the-family]]).

**Confidence: confirmed** — quoted from GF Core Rules v3.5.1.
