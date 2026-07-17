---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Morale Has Two Different Triggers With Asymmetric Outcomes — Only Melee Can Rout

The subtlest part of the OPR core, and the easiest to implement wrongly. There are **two** morale tests with **different triggers and different consequences**.

## Trigger A — half strength (from wounds)

> At the end of an activation in which a unit takes wounds that leave it with **half or less of its starting size or tough value** (for units with a single model), it must take a morale test. Note that **starting size is counted at the beginning of the game**.

- Pass → nothing. Fail → **Shaken**.
- **This trigger can never Rout.** Shooting alone can never destroy a unit through morale.
- *"Starting size is counted at the beginning of the game"* — so the threshold is **fixed at game start**, not recomputed as the unit shrinks. The engine must snapshot `startingSize` at deployment, not derive it from current size.

## Trigger B — losing a melee

> Units that were in melee **don't take morale tests from wounds** at the end of an activation, but must compare the number of wounds each unit caused instead. The unit with the lowest total loses, and must take a morale test.

- Pass → nothing.
- Fail **while above half strength** → **Shaken**.
- Fail **while at half or less** → **Routs** — remove the entire unit from play as destroyed.

**Rout is reachable only here.** This is the single highest-stakes branch in the game.

Note Trigger B **replaces** Trigger A for units in melee — they are mutually exclusive in that activation, not cumulative.

## Melee resolution details

> Sum the total number of wounds that each unit caused, and compare… **in melee only the loser takes a morale test, regardless of casualties.** If the units are tied for how many wounds they caused, or neither unit caused any wounds, then the melee is a tie and neither unit must take a morale test. This means that if a unit didn't strike back in melee, then it must only take a morale test if it suffered at least one wound.

> Note that units that are destroyed in melee always count as having lost, and their opponent doesn't have to take a morale test, even if it dealt less wounds, or it previously took wounds that would have otherwise caused a morale test.

Three traps:
- It is **wounds caused**, not models killed. `Tough(X)` makes these diverge sharply ([[mechanics-tough-changes-wound-allocation]]).
- **Ties → nobody tests.** Zero-zero counts as a tie.
- **Destroyed-in-melee always loses**, and *explicitly suppresses* the winner's otherwise-pending morale test. A special case that must be encoded, not derived.

`Fearless` (v3): *"When a unit where **all models** have this rule fails a morale test, roll one die. On a 4+ it counts as passed instead."* — a fail-to-pass conversion, **not** v2.16's "+1 to morale tests" ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]).

Result state: [[mechanics-shaken-costs-a-full-activation-to-clear]].

**Confidence: confirmed** — quoted from GF Core Rules v3.5.1 and Beginner's Guide v3.5.1. Note Firefight replaces per-unit morale with **army-level** morale ([[family-firefight-differs-in-damage-not-activation]]).
