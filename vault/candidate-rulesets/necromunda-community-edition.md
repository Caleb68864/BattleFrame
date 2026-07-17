---
tags: [wargame-research, candidate-ruleset]
source: https://yaktribe.games/community/vault/necromunda-community-edition-rulebook.1/
confidence: partial
---

# Necromunda: Community Edition (NCE)

Fan-maintained update to GW's Necromunda. **Legally unshippable** ([[games-workshop-ip-is-radioactive]]) — but its activation model is the closest thing in this survey to the engine's presumed default.

## Identity

- **Author:** Fan project; originally written/edited by Anthony Case of Specialist Games, updating GW's "Living Rulebook"
- **Host:** Yaktribe — https://yaktribe.games/community/vault/necromunda-community-edition-rulebook.1/
- **What it is:** "a fan update to the official Necromunda rules" — a **patch on GW rules, not a replacement engine**

## Licensing — GW IP, no licence found

**Confirmed unshippable via GW policy; partial on NCE's own terms.**

The NCE page was fetched and contains **no explicit copyright statement, no licence, no Creative Commons grant, and no redistribution permission**. The PDFs are noted as unprotected/editable for personal group use.

> [!warning] Absence of a licence is not a grant
> The lack of any licence statement is itself the finding, and it points the wrong way. Silence means **default copyright**, and here the underlying rights aren't even the fan authors' to give — NCE is derivative of GW's Necromunda. It inherits GW's all-rights-reserved status.

GW's guidelines explicitly prohibit "computer games or apps based on our characters and settings" — see [[games-workshop-ip-is-radioactive]]. **We could not ship NCE rules or fighter data.** Not under any reading.

## Activation model — alternating individual activation with group activation

**Confirmed** ([killershrike battle sequence](https://www.killershrike.com/Necromunda/Campaigns/BracketBusters/BattleSequence.aspx), [GW FAQ PDF](https://assets.warhammer-community.com/eng_22-12_necromunda_faqs-dxlobndhrz-rnas4scu2o.pdf), [Age of Miniatures guide](https://ageofminiatures.com/necromunda-beginners-guide/)).

Classic **"I-go-you-go" alternating individual-fighter activation**:

- Players alternate activating **one Ready fighter at a time** (removing its Ready marker) until none remain, in **Priority order**.
- **Group Activation:** certain fighters (leaders/champions) can nominate several Ready fighters and activate them in any order — one activation consuming multiple models.
- Each activation grants **two actions**. "Basic" actions (shoot, fight) once each; "Simple" actions (move, reload) up to twice.

> [!tip] The reference implementation of the default
> This is almost exactly the "roll for priority, then alternate activations" baseline the engine presumably assumes — **plus** the group-activation wrinkle, which is the same leader-pulls-followers idea seen in [[frostgrave]] (proximity drag) and [[turnip28]] (commander cascade).
>
> Three independent games converging on "a leader can drag subordinates into their activation" is a **strong signal**: this isn't an exotic edge case, it's a *recurring pattern* that the activation abstraction should support natively rather than treat as a per-game hack. Probably the single most actionable architectural finding in this survey. See [[activation-model-comparison]].

## Complexity

Medium-heavy. Necromunda carries substantial detail — injuries, ammo, terrain levels, campaign progression.

## Suitability

**Zero as a shipping target.** Retained for the group-activation pattern and as the baseline against which to measure mechanical distance.

## Related

- [[games-workshop-ip-is-radioactive]]
- [[activation-model-comparison]]
- [[mordheim-community-rules]]
