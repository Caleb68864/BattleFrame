---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: unverified
---

# Campaign Play — CONFIRMED TO EXIST, MECHANICS NOT FOUND

Campaign play exists. **Nothing about how it works was found.** This note records the gap.

## What is confirmed — existence only

QSR p5 back cover, verbatim:

> Includes casual play, **progression campaigns**, and solo rules.

itch.io: "There is solo rules in the book, and a solo campaign too."

That is the entirety of the public evidence. The word "**progression**" is the only hint at shape.

## NOT FOUND — do not invent

- **What persists between games** — injuries? experience? equipment? knight identity? Unknown.
- **Advancement / levelling** — none found.
- **Renown / reputation** — none found.
- **Permanent death** vs recovery — none found. Note the QSR has *two* removal routes ([[damage-and-removal]]: killed by damage, vs fleeing a [[courage-test]]) which would be a natural hook for a campaign to treat differently, but **no source says it does**. Do not assume this.
- **Campaign length / structure** — none found.
- **Solo campaign mechanics** — none found.
- **Warband roster persistence** — none found; see [[warband-construction]].

## Interaction with Scenes — unknown

[[scenes]] describes scenarios chaining scenes. Whether a "campaign" is a sequence of scenarios, or whether scene-chaining *is* the campaign, is **not found**. These may be the same mechanism or two distinct layers. Do not conflate them.

## Architectural guidance

Campaign persistence touches the data model at its root (does a Knight have identity across sessions?). **Do not design this layer.** The one thing worth noting: because knights currently have no identity or stat line ([[knights-have-no-stat-line]]), a progression campaign *must* add one — which means the full game very likely has a per-knight record the QSR doesn't show. `confidence: unverified` — inference, flagged as such.

Related: [[scenes]] · [[warband-construction]] · [[open-questions]]
