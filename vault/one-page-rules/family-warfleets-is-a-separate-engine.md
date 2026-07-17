---
tags: [wargame-research, one-page-rules]
source: https://onepagefan.wiki/index.php/Grimdark_Future_Warfleets_Core_Rules
confidence: partial
---

# Warfleets Is a Different Engine Wearing the OPR Name

**GF: Warfleets** is the outlier of the eight ([[family-eight-current-rulesets-in-two-version-families]]). It shares the OPR brand and a handful of rule names, and **almost nothing else**. If BattleFrame hosts the OPR family, this is the one that will not come along for free.

## What it drops

- **No Quality. No Defense.** Replaced entirely by **Evasion / Toughness** ([[mechanics-quality-and-defense-are-the-only-two-stats]] does not apply).
- **No Quality test at all** — the central primitive of every other OPR game is absent.
- **Different dice model**: rolls *"as many dice as the weapon's attacks"*, rather than one Quality test per attack ([[mechanics-two-roll-combat-hit-then-block]]).
- **No AP.** Weapon **Strength** is the penalty to the block roll instead ([[mechanics-ap-is-a-penalty-to-the-defenders-block-roll]]).
- **Different special rules list**: Anti-Ship, Broadside, Overheating, Rogue, Fragile — not the shared glossary.

## What it replaces them with

- **Phased alternating activation**, not free alternation:
  > The game is played in rounds of 4 phases, in which all models of that type must be activated, before starting the next phase. Players alternate in activating one model each…

  Phases run **Squadrons → Light Ships → Medium Ships → Heavy Ships**. So alternation is *nested inside* a fixed phase order — a different turn structure from [[mechanics-alternating-unit-activation-is-the-core-turn-structure]].
- **Different actions**: **Hold / Move / Cruise / Ram**, with pivot allowances (180°/90°/45°) — facing matters, unlike GF ([[mechanics-measurement-is-free-and-there-are-no-facing-rules]]).
- **Damage to upgrade slots**, not models: *"Upgrades are disabled after taking 2 damage."*
- **Numeric morale**: *"Roll a D6, add the number of non-disabled upgrades… 6+ … passed. If failed, then the ship surrenders."*

## The recommendation

**Descope Warfleets.** Only the "6 always succeeds" convention and a few rule names survive from the shared core — it would need a **separate resolution engine**, and it is the least-played game in the family. It is a poor use of early effort and a bad forcing function for the abstraction: designing the engine to accommodate Warfleets risks over-generalising against a game nobody's asking for.

Treat the family as **GF/AoF/Firefight/Skirmish (one engine) + Regiments (geometry layer) + Quest (hero/AI layer)**, and leave Warfleets out. See [[assessment-one-engine-can-host-most-of-the-family]].

**Confidence: partial** — the mechanics above are **quoted**, but from the **community wiki**, not the official **v2.2.0** PDF (not opened). The wiki's own Warfleets page is labelled "3.4.1" while the official game is **v2.2.0**, and its damage numbers **conflict** with the older FTL page (2 vs 3 damage to disable). **Treat exact Warfleets numbers as unreliable.** The qualitative conclusion — that it's a separate engine — is robust across both sources.
