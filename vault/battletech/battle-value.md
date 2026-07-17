---
tags: [wargame-research, battletech]
source: https://www.sarna.net/wiki/Battle_Value
confidence: partial
---

# Battle Value (BV) — Classic BattleTech's Points System

One of the two candidate meanings of the user's garbled *"the ballots x kind of things"* → see [[dictation-ambiguity-ballots-x]].

## What it is (confirmed)

> Battle Value (BV for short) is a point-based system for the classic BattleTech board game to measure the battlefield value of a given unit and to balance opposing forces.

It is BattleTech's equivalent of points/power level — the force-construction currency.

## Versions (confirmed)

| Version | Year | Notes |
|---|---|---|
| **BV1** | 1997 | Refined through *BattleTech Master Rules* |
| **BV2** | 2007 | Substantial revision in *TechManual*; **current** |
| BV2 tweak | 2021 | "significantly reduced the magnitude of positive and negative Skill Rating modifiers" |
| BV3 | — | Repeatedly discussed since 2012, **never materialised** |

## How it's computed

**Partial — I did not find the full formula in a free source.** The authoritative computation lives in *TechManual* (a paid product I did not access).

What is confirmed: BV2 is a **defensive + offensive** composite that factors in armor/structure, movement, weapons, heat efficiency, and is then modified by **pilot skill** (Gunnery/Piloting). It also accounts for C3 network prevalence and force size. Sarna's caveat:

> only a rough guideline — doesn't account for terrain or dice randomness

The MegaMek org maintains a `bv-analysis` repo ("Statistical analysis of BV by weight for constructing generic BV"), which implies the real formula is complex enough to warrant empirical study. MegaMekLab computes BV for designed units ([[megameklab]]).

## Is it needed for force construction?

**Yes for Classic, effectively.** BV is how balanced Classic forces are built and how tournaments are run. Any Classic BattleTech engine wants BV.

**But note:** BV is a *pre-game* balancing number. It is **not needed to resolve a battle**. An engine can host play while treating BV as an opaque per-unit integer it reads from data and never computes — which conveniently sidesteps needing the copyrighted formula.

## Availability

BV is exposed **per-unit as a plain integer** by the MUL API (`"BattleValue":1858`) — [[master-unit-list-api]] — and appears in existing vault notes' variant frontmatter (`battle_value`).

## Alpha Strike uses a different system

Alpha Strike does **not** use BV; it uses **Point Value (PV)** → [[alpha-strike-point-value]].
