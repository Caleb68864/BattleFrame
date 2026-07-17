---
tags: [wargame-research, incountry]
source: https://www.boardgamequest.com/inx-incountry-review/
confidence: confirmed
---

# Damage — Binary Threshold Against Defence, Then an Armor Save

INCOUNTRY has **no hit points / wound tracks**. Models are alive or dead.

Resolution after damage is totalled ([[combat-resolution-d10]]):

- **If damage exceeds the target's defensive value → immediate elimination.** Reviews call this a "headshot." No save is allowed.
- **If damage does not exceed defence → the target gets an armor save**: roll d10s and score **equal to or higher than the damage number**. Success **negates the hit**.

"Damage exceeding a unit's defensive value causes immediate elimination ('headshot'). Lower damage allows armor saves by rolling d10s equal to or higher than the damage number—success negates the hit." — https://www.boardgamequest.com/inx-incountry-review/

Note the **inversion**: the attack roll is roll-under, the armor save is roll-over. Also note the save is *harder the higher the damage* — damage is the save's target number, so damage does double duty as both the kill-threshold test and the save difficulty.

The publisher confirms the lethality intent: "a single die roll can destroy models," which is why positioning dominates (https://inxcountry.com/pages/game).

## Why this matters architecturally

- **Model state is binary** (alive/dead) — but status effects ([[suppression-tokens]], [[reaction-token-overwatch]], [[morale]]) carry the state complexity instead. An engine sized for HP bars is modelling the wrong thing.
- Two different failure paths from one damage number (auto-kill vs saveable) means damage resolution is a branch, not a subtraction.

## Unknowns (not found)

- **How many d10s the armor save rolls** — the source says "d10s" (plural) but not the count or what determines it. Presumably an armor stat. **Unverified.**
- Whether a failed save kills outright or produces a lesser result.
- Whether "exceeds" is strictly greater-than or greater-than-or-equal (sources say "exceeding").
- Whether cover modifies defence, the save, or neither.

Related: [[combat-resolution-d10]], [[suppression-tokens]]
