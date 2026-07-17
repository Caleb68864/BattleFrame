---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# The Defender May Strike Back in Melee — Optionally, and Without Spending Its Activation

The one place OPR breaks its own "one unit, one activation" model. GF Core Rules v3.5.1:

> Charging models must move into base contact with targets, or as close as possible, and then defenders must do the same by moving up to 3". Models within **2" horizontally and 4" vertically** of enemies **must** strike with all melee weapons, which works like shooting. Then defenders **may choose to strike back, but don't have to**. Once both units are done, the losing unit must take a morale test… If one of the units is destroyed, the other may move by up to 3", else chargers must move back and separate by 1" (if possible).

The decisive clause, from the Beginner's Guide v3.5.1:

> Note that **striking back does not count as its activation, and activated units may strike back**.

## Why this matters architecturally

**Strike-back is fully decoupled from the activation flag.** A unit can:
- strike back **before** it has activated, then still activate normally later that round;
- strike back **after** it has already activated;
- strike back **multiple times** in a round if charged repeatedly.

So the engine **cannot** model "has this unit acted?" as a single boolean gating all unit behaviour. It needs `hasActivated` (once per round, gates action selection) as a **separate** flag from melee participation (unbounded, reactive). Conflating them is the obvious bug and it will silently deny legal strike-backs.

Note also the asymmetry in compulsion: the **charger must** strike ("must strike with all melee weapons"); the **defender may**. Declining is a real tactical choice — because of [[mechanics-fatigue-punishes-striking-first]] and because melee results are compared by wounds caused ([[mechanics-morale-has-two-distinct-triggers]]), striking back can *lose* you the melee you would otherwise have tied.

## Charge geometry details

- **No line of sight needed to charge**: *"If at least one model in the unit is within charge distance of one model from the target unit, and has a clear path to reach it, then that enemy is a valid target (no line of sight is needed)."*
- **Defender pile-in is mandatory**: *"all models from the target unit that are not in base contact with a charging model must move by up to 3"… or as close as possible, maintaining unit coherency."*
- Strike range is **2" horizontal / 4" vertical** — an anisotropic range check (v2.16 was a flat 2"; see [[mechanics-rules-versions-v2-vs-v3-differ-materially]]).
- Post-melee: winner-takes-3" if one side is destroyed, otherwise **chargers bounce back 1"**.

**Confidence: confirmed** — quoted from GF Core Rules v3.5.1 and Beginner's Guide v3.5.1, which agree.
