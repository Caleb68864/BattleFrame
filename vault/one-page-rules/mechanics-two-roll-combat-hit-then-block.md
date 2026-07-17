---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Combat Is Two Rolls, Not Three — Hit, Then Block

OPR resolves all combat — shooting **and** melee — with the same four-step sequence and only **two dice rolls**. Melee *"works like shooting"* verbatim.

1. **Determine Attacks** — *"Sum the Attack value from the weapons of all models that can shoot at the target."*
2. **Roll to Hit** — *"take as many Quality tests as attacks. Each successful roll counts as a hit."*
3. **Roll to Block** — *"the defending player must roll one die, trying to score the target's Defense value. Each success counts as a blocked hit, and **all failed rolls cause one wound each**."*
4. **Remove Casualties** — *"For each wound… remove one model as a casualty."*

## The two things implementers get wrong

**There is no to-wound roll.** This is a **2-roll** system (hit → block), not Warhammer's 3-roll (hit → wound → save). There is no strength-vs-toughness comparison anywhere. Do not import that assumption.

**The polarity is inverted.** Defense is a save **the defender rolls**, and **failing it causes the wound**. Contrast systems where the attacker rolls everything. This matters for UI (whose client prompts the roll?) and for automation (the defender is an active participant in every attack).

Weapon profiles: `Name (Range, Attacks, Special)` — *"Weapons with a range value are for shooting, and without are for melee."* A single field distinguishes weapon class; in the API this surfaces as `"range": 0` for melee ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]).

## Simultaneity

The community Rules FAQ confirms batching:

> All attacking weapons from a unit are resolved simultaneously. ie. All weapons shoot (Roll to hit) -> All hits get blocked (Roll to block) -> Wounds get assigned.

Targets *"must be declared before rolling, and all weapons are fired simultaneously."* So the engine resolves **pools of dice per step**, not attack-by-attack — a materially different loop shape from sequential-attack systems, and the natural fit for Foundry's dice-pool rolling.

**Targeting (v3-specific):** *"Models in range and line of sight may fire all ranged weapons, and may fire at **up to two different targets** with different weapon types."* Weapons split into groups; all weapons in a group must fire at the same target; **max two targets total**. (v2.16 allowed unlimited targets by weapon type — see [[mechanics-rules-versions-v2-vs-v3-differ-materially]].)

Only models individually in range **and** line of sight contribute attacks, though a unit is a valid target if *"at least one model in the unit has line of sight to an enemy model, and has a weapon that is within range."* Models *"may always ignore friendly models from their own unit when determining line of sight."*

Related: [[mechanics-quality-and-defense-are-the-only-two-stats]], [[mechanics-ap-is-a-penalty-to-the-defenders-block-roll]], [[mechanics-melee-strike-back-is-optional-and-free]].

**Confidence: confirmed** — quoted from GF Core Rules v3.5.1, cross-checked against the Beginner's Guide v3.5.1 and the Rules FAQ.
