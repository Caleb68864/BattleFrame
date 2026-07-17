---
tags: [wargame-research, candidate-ruleset]
source: inference
confidence: partial
---

# The open-license desert in miniatures wargaming

The headline finding of the survey, and it cuts against the premise: **openly licensed miniatures wargames barely exist.**

## The count

Roughly 20 games investigated. Texts with a **confirmed, quotable, redistributable open licence from the rights holder**:

1. [[riot-dice-srd]] — CC BY 4.0 (a dice subsystem, for a game that can't be implemented in a VTT anyway)
2. [[danger-close]] — CC BY-SA 4.0 (basic rules tier only)
3. [[mausritter-srd]] — CC BY 4.0 (**not a wargame** — an RPG, included as an exemplar)

That's **two-and-a-half**, and one isn't a wargame. Everything else is all-rights-reserved, whether free to download or not.

## Why the RPG comparison misleads

The intuition that "free rules → shippable content" is imported from **tabletop RPGs**, where the OGL and now the ORC License created a genuine open-content commons — D&D SRDs, Mörk Borg, Mausritter, thousands of derivatives. That commons is real, and it's why VTT modules for RPGs can ship content.

**Wargaming never had that.** Confirmed: **no miniatures wargame using the ORC License was found at all**, despite 1,500+ RPG publishers signing on. No OGL-derived mass-combat product ("Battlesystem"-style) was identified either. The open-licensing wave that reshaped RPG publishing **did not cross into wargames.**

*Partial/inference:* this is my analysis of a consistent pattern across ~20 investigations, not a cited claim. It's a strong pattern but a negative one — absence of evidence gathered by search. A wargame with a quiet CC licence and no SEO presence could exist.

## The plausible reason (speculation — flagged as such)

Wargames sell **miniatures**. The rules are a **funnel** for a physical product line. Giving rules away free is common precisely *because* they drive model sales — but **licensing them openly** would let competitors publish compatible model lines. Free-as-in-beer serves the business model; open licensing threatens it. That neatly explains why the free-but-closed combination ([[trench-crusade]], [[this-is-not-a-test]], [[turnip28]]) is the *dominant* pattern in the hobby.

This is **unverified reasoning**, not a sourced claim. But it predicts the observed distribution well, and it suggests the desert is structural rather than accidental — which matters, because it means it won't fix itself.

## What follows for the architecture

The project's founding insight — *free rules let a module ship the rules content* — is **mostly wrong as stated**, and this should be surfaced early rather than discovered mid-build.

Three viable postures:

1. **Ship the engine, not the data.** The module implements mechanics; users enter their own stats. Legally safe nearly everywhere. Forfeits the convenience win, but it is what almost every candidate permits.
2. **Target the tiny open set.** [[danger-close]] is the only implementable, already-open wargame found. Thin, and unvetted.
3. **Ask.** The most promising path. [[space-weirdos]], [[song-of-blades-and-heroes]], [[turnip28]], [[forbidden-psalm]] are all solo-author-owned with no corporate rights holder. [[mausritter-srd]] and [[riot-dice-srd]] prove designers *do* say yes when asked for a mechanics-only SRD grant — and give you a concrete precedent to point at.

Route 3 is where the leverage is. **The bottleneck is permission, not discovery** — and permission is obtainable, one email at a time. Note also that [[mork-borg-third-party-license]]-style bespoke licences form a **third category** the free-vs-open binary misses, and they are unusually favourable to *software* specifically, since they grant mechanics while reserving prose.

## Related

- [[free-as-in-beer-vs-openly-licensed]]
- [[licensing-freedom-ranking]]
- [[mork-borg-third-party-license]]
- [[riot-dice-srd]]
- [[danger-close]]
