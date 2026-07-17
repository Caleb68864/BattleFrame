---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/691f7f0b5fe8045f8298039e_GF%20-%20Campaign%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Campaigns Persist XP, Traits, Injuries, Upgrades and Permadeath — Points Are the Currency

**GF Campaign Rules v3.5.1** exist as a separate free PDF (as do Firefight, AoF, and AoF: Skirmish versions). Loop: **Mission Setup → Play Mission → Check for Casualties → Earn Experience → Upgrade Armies → Recruit Units.**

What persists between games:

- **Points-as-currency.** Start 1000pts. Winner: 2 VP + **150pts**; losers: **300pts**. *Losing pays more* — an explicit catch-up mechanism. Upgrades can be sold: *"sell any of their upgrades at half of their original price."*
- **XP.** +1 survived, +1 killed a unit, +2 killed a hero unit, +3 killed a hero and its unit. **5 XP = level up**; unit becomes **+25pts** (heroes +55pts). Cap **30 XP / 6 levels**. Traits: Agile, Headstrong, Specialist, Resilient, Elite, Fast Learner.
- **Permadeath.** Casualty roll: **1 = Dead, remove from army sheet**; 2-5 Recovered; 6 Natural Talent (+1 XP). An optional **"No Permadeath"** variant substitutes losing match XP and sitting out D3 matches.
- **Hero injuries and talents.** On a 1 a hero takes an **Injury** (Chest Wound, Blinded Eye, Arm Injury, Traumatized, Smashed Leg) and becomes **5pts cheaper**; on a 6 a **Talent**, 5pts dearer. Heroes gain **skill sets** (Captain/Support/Fighter/Shooter/Pathfinder/Healer), each with 3 traits.
- **Roster.** Named army, named units, an army sheet with XP tracks (1/5/10/15/20/25/30xp). Max 3 heroes. Units may be disbanded, losing all XP and upgrades.
- Plus: **Underdog Bonus** (1pt per 50pts deficit), 4 campaign types (Game/Point/Time-Limited, Endless), 36 random events.

## The API already carries campaign state

`/api/tts` exposes `"campaignMode": bool`, `"narrativeMode": bool`, and **per-unit `"xp"`, `"traits"`, `"notes"`** ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]). So campaign progression **round-trips through Army Forge** — BattleFrame would not need to own persistence, only to read it. That is a significant scope reduction, though **whether the API supports *writing* XP back was not tested — unverified.**

## Quest campaigns are a different model

**Star Quest Campaign Builder v2.0.1** tracks *individual heroes*, not a roster:
- **Explicitly portable**: *"progression is the same across campaigns, so you can carry over heroes between campaigns."*
- **Gold (c)**: *"Hazard Pay – Get 5c times the chosen difficulty level"*; a **Shop** between chapters; items and gold transferable between heroes.
- **15 levels** on a fixed XP table (L2 at 2 XP … L15 at 122 XP), each granting stat picks. XP scales with difficulty (1-4).
- **Injuries persist**: killed heroes revive but roll Chest Wound / Blinded Eye / Smashed Leg / Broken Arm / Spinal Injury / Crushed Spirit *"for the next mission"*. *"heroes restore 3 wounds and 3 power (but don't restore status conditions or injuries)."*
- Structure: D3+2 chapters × D3 missions; total-party-KO restarts the chapter.

So: **battle games persist a points-valued roster; Quest games persist individual levelled heroes with gold and gear** ([[family-quest-games-use-hero-then-ai-activation]]).

**Confidence: confirmed** for GF Campaign Rules v3.5.1 and GFSQ Campaign Builder v2.0.1 (both PDFs read in full). **Unverified:** AoF/AoFS campaign PDFs (not opened; presumed parallel given [[family-gf-and-aof-are-the-same-engine-reskinned]]). **Not found:** any campaign rules for **AoF: Regiments** or **Warfleets** — absent from the official resources listing, which is absence of evidence rather than a stated deprecation.
