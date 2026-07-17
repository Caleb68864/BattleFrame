---
tags: [wargame-research, one-page-rules]
source: https://onepagefan.wiki/index.php/Age_of_Fantasy_Core_Rules
confidence: partial
---

# Grimdark Future and Age of Fantasy Are the Same Ruleset With Different Points Values

Direct answer to "are GF and Age of Fantasy essentially the same engine reskinned?" — **Yes, and more literally than 'essentially' suggests.** The rules text is **word-for-word identical**.

Comparing the two core rules documents (at wiki v3.4.1), the text is identical across:

General Principles · Playing the Game · Activation · Movement (incl. 9" coherency) · Shooting · Melee · Fatigue · Morale · Melee Results · all three terrain types · **the entire special rules glossary**.

## The complete list of differences

The **only** differences in the whole document:

1. **Recommended points**: GF **1000/2000** vs AoF **750/1500**.
2. **Force org thresholds scaled to match**: 1 hero per 500pts (GF) vs per 375pts (AoF); 1 unit per 200pts vs per 150pts.
3. **Three sci-fi-flavoured rules GF has and AoF lacks**: `Aircraft`, `Lock-On`, `Transport(X)`.

That's it. Not "similar" — **the same document with three rules removed and two numbers changed.**

Tellingly, **`Caster(X)` (magic) is identical in both** — sci-fi Grimdark Future has spellcasting with the same spell-token economy as fantasy. OPR didn't even reskin the magic.

## The pattern repeats down the grid

The same 1:1 relationship holds for the other pairs in the 4×2 grid ([[family-eight-current-rulesets-in-two-version-families]]):
- **Firefight ↔ AoF: Skirmish** — same ruleset, points 200/300 vs 150/250.
- **Star Quest ↔ AoF: Quest** — *"textually identical apart from sci-fi vs fantasy naming."*

## The design conclusion

**The setting is a data layer, not a rules layer.**

For BattleFrame this is a strong, cheap win: implementing Grimdark Future delivers **Age of Fantasy nearly for free** — a points table, a force-org divisor, and a three-rule delta. Two of the eight rulesets fall out of one implementation, and the Firefight/Skirmish pair behaves the same way.

It also **validates the ruleset-neutral thesis on easy mode**: if the engine can't host GF and AoF from shared code, the abstraction is wrong. It's a good smoke test, but a weak one — passing it proves little, since these aren't really two rulesets. The real test is [[family-firefight-differs-in-damage-not-activation]] and [[family-regiments-adds-facing-and-formations]]. See [[assessment-one-engine-can-host-most-of-the-family]].

**Confidence: partial** — the identity is **confirmed** by direct textual comparison, but at **wiki v3.4.1**, not the current v3.5.1 PDFs (the AoF v3.5.1 PDF was not opened). The wiki lags and its glossary predates the v3.5 renames ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]). Nothing suggests the relationship changed in 3.5, but the exact current delta is **unverified**.
