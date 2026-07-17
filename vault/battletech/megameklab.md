---
tags: [wargame-research, battletech]
source: https://github.com/MegaMek/megameklab
confidence: confirmed
---

# MegaMekLab — The Unit Designer

One of the two candidate meanings of the user's garbled dictation ([[dictation-ambiguity-ballots-x]]).

Description from the MegaMek org repo listing:

> MegaMekLab is a BattleTech unit modification program. It allows creating and modifying all unit types available in MegaMek from Support Vehicles up to WarShips. It also allows printing record sheets for single or multiple units.

## What it does

- **Constructs and validates units** against BattleTech construction rules (tonnage, crit slots, heat sinks, armor allocation) — i.e. it implements the *construction* ruleset, distinct from the *play* ruleset
- **Reads/writes** `.mtf` and `.blk` files ([[megamek-mtf-unit-format]], [[megamek-blk-unit-format]]) — it is the canonical producer of that data
- **Prints record sheets** — the same job [[flechs-sheets]] does in a browser
- **Computes Battle Value** for designed units ([[battle-value]])

## Licensing

Same split as the rest of the suite: **code GPLv3, data CC-BY-NC-SA-4.0**. MegaMek's `LICENSE` explicitly names MegaMekLab:

> All source code in the MegaMek, MegaMekLab, and MekHQ repositories is licensed under GPLv3.

Note MegaMekLab moved GPLv2+ → GPLv3 at v0.50.07 alongside MegaMek.

## Relevance to the engine

MegaMekLab is a **construction/validation** tool, not a play engine. For a ruleset-neutral skirmish engine this is mostly **out of scope** — a Foundry module wants finished unit stats, not a tonnage-allocation validator. Its real value here is as *the reference for how unit data is produced* and as proof of how deep the Classic construction ruleset goes.
