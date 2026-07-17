---
tags: [wargame-research, incountry]
source: inference
confidence: unverified
---

# Open Questions — What Public Sources Do Not Answer

Public information on INCOUNTRY is **thin**. Two hobby reviews plus publisher marketing carry nearly all of it; BoardGameGeek returned 403 and the Scribd RECON PDFs exposed only metadata. What follows is the honest gap list. **None of these should be filled by inference when designing an engine.**

## Blocking gaps (ordered by architectural impact)

1. **Reaction trigger and resolution order** ([[reaction-token-overwatch]]) — what provokes a reaction, whether it resolves before or after the triggering action, whether the token is consumed, whether reactions chain. This is the game's headline mechanic and its interrupt semantics are entirely undocumented. **Highest priority.**
2. **What suppression does** ([[suppression-tokens]]) — we know only how to *remove* it, not what it causes or what inflicts it.
3. **What morale does** ([[morale]]) — existence confirmed; effect, trigger, and removal all unknown.
4. **Is command card selection hidden?** ([[command-card-initiative]], [[hidden-information-and-fog-of-war]]) — determines whether INX state is fully public. Cannot be inferred.
5. **What asset cards do** ([[asset-cards-off-table-support]]) — the likely home of off-table support, but wholly undescribed.
6. **Priority pass mismatch handling** ([[activation-order-priority-units]]) — what happens when players buy unequal numbers of priority units.
7. **What persists in campaigns** ([[campaign-rules]]) — no evidence of any persistence at all.

## Secondary gaps

- Armor save dice count ([[damage-armor-saves-and-headshots]])
- Hit-count → damage-number formula, and attack modifiers ([[combat-resolution-d10]])
- Melee rules — **not found at all**
- Measurement units and speed values ([[movement-and-measurement]])
- Terrain and general cover rules ([[lean-token-and-line-of-sight]], [[movement-and-measurement]])
- Lean token timing and cost ([[lean-token-and-line-of-sight]])
- Whether the five named forces are mechanically distinct ([[force-construction-tiers-and-teams]])
- Whether tiers apply to 2.0 or only RECON ([[editions-inx-recon-vs-incountry-2-0]])
- Scoring granularity and round limits ([[objectives-and-missions]])
- Designer/author identity ([[game-identity-incountry-inx]])

## How to close them

**Get the free digital rulebook** ([[licensing-and-rules-availability]]) — $0, email checkout. It plausibly answers all of the above. Secondary routes: the official Discord (https://discord.gg/qfHWWUxJHJ), or a YouTube playthrough (none reviewed for this note set — a video search was not exhausted and remains an untapped source).

Related: [[licensing-and-rules-availability]]
