---
tags: [wargame-research, battletech]
source: https://github.com/MegaMek/megamek
confidence: confirmed
---

# MegaMek — The Open-Source Classic BattleTech Implementation

MegaMek's own description:

> MegaMek is a networked Java clone of BattleTech, a turn-based sci-fi boardgame for 2+ players. Fight using giant robots, tanks, and/or infantry on a hex-based map.

It implements **Classic BattleTech / Total Warfare** ([[classic-battletech-mechanics]]) — hexes, individual weapon fire, heat, hit locations, criticals. **Not** primarily Alpha Strike.

## The three-program suite (all under the MegaMek org)

| Program | Role |
|---|---|
| **MegaMek** | The tactical battle engine — networked, hex-based combat |
| **MegaMekLab** | Unit designer/editor — see [[megameklab]] |
| **MekHQ** | Campaign manager — "personnel, finances, and logistics" for a mercenary unit |

Also in the org: `mm-data` (the dataset — [[megamek-mtf-unit-format]]), `MekWars` (campaign/chat server), `megamekR` (R package for MegaMek universe data), `bv-analysis` (statistical BV analysis — [[battle-value]]), and `mm-caspar-trainer` / ACAR ("Abstract Combat Auto Resolve") — i.e. **AI/auto-resolve** work.

## On the user's characterisation

The user said MegaMek is *"meant for solo campaign play, but there is some online play, and it's wildly hard to get set up and install."*

**Partially accurate — worth correcting:**
- **"Networked" is the project's own first descriptor.** MegaMek is architecturally a client/server multiplayer game; online play is core, not a side feature. The org even ships `megamek-docker-image` for dedicated servers, and MekWars exists to matchmake.
- **The solo-campaign impression likely comes from MekHQ**, which is genuinely campaign/solo-flavoured, and from MegaMek's bot/auto-resolve (ACAR) letting you play alone.
- **"Hard to install"** — plausible: it's a Java desktop app distributed as releases you unzip and run, requiring a compatible JRE. Not verified against install docs; marking this specific claim **unverified**.

## Longevity as legal evidence

MegaMek has operated publicly since ~2002 and has **not** been shut down, despite being an unlicensed full reimplementation. That is meaningful *practical* evidence about enforcement posture — but it is **not** a licence, and tolerance is not permission. See [[licensing-verdict-battletech]].

Related: [[megamek-code-license-gpl3]], [[megamek-data-license-cc-by-nc-sa]]
