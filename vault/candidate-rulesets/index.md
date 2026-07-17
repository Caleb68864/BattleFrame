---
tags: [wargame-research, candidate-ruleset]
source: inference
confidence: partial
---

# Candidate rulesets — index

Survey of free and/or open-licensed miniatures skirmish wargames as implementation targets for a ruleset-neutral Foundry VTT engine.

> [!danger] Read before acting on any licence claim
> These notes drive **legal decisions about shippable content**. Every note is marked `confirmed` / `partial` / `unverified`, and several key sites (trenchcrusade.com, Patreon, WargameVault, Games Workshop) **block automated fetching** — so some claims rest on search-indexed excerpts rather than direct reads. Caveats are stated in each note.
>
> **No content should ship on the strength of these notes alone.** Every candidate needs a human to read the licence directly before use.

## Start here

- [[the-open-license-desert-in-miniatures-wargaming]] — **the headline finding: the project's founding premise is mostly wrong.** Openly licensed wargames barely exist; only ~3 were found across ~20 games.
- [[licensing-freedom-ranking]] — candidates ranked by what we may legally ship, plus a ranking by *tractability of a permission ask* (the real path forward).
- [[activation-model-comparison]] — candidates ranked by mechanical distance from "roll initiative, alternate activations."

## Concepts

- [[free-as-in-beer-vs-openly-licensed]] — the distinction that decides everything, and the six signals that look like an open licence but aren't.
- [[fan-content-policies-are-not-open-licenses]] — permission to make fan works is revocable, non-commercial, and usually bars reproducing rules text.
- [[osprey-games-blanket-copyright-policy]] — one policy that disqualifies four candidates at once.
- [[games-workshop-ip-is-radioactive]] — GW **explicitly bans apps**. Not a grey area.
- [[mork-borg-third-party-license]] — the third category the free-vs-open binary misses: *"mechanics and game rules may be reused freely."* Unusually good for software.
- [[solo-and-ai-driven-activation-as-an-engine-requirement]] — solo games make the engine the *opponent*, not just the referee.

## Tier 1 — openly licensed (shippable content)

- [[danger-close]] — **CC BY-SA 4.0 basic rules. The only implementable, already-open wargame found.** Mechanics entirely unknown; read it first.
- [[riot-dice-srd]] — **CC BY 4.0, commercial use OK.** Real open licence, on a dexterity game a VTT can't represent. Open licence, wrong game.
- [[mausritter-srd]] — **CC BY 4.0.** Not a wargame; included as the exemplar of the SRD-carve-out pattern worth copying.

## Tier 2 — mechanics reusable via bespoke licence

- [[forbidden-psalm]] — **best-balanced early target.** Mörk Borg TPL, rules-light, near-default activation. Rahman's own additions need an ask.

## Tier 3 — free-as-in-beer, all rights reserved

- [[trench-crusade]] — free forever, licence bars using the rules in other projects. The archetypal trap.
- [[turnip28]] — free PDF, **no licence found at all**; the archive.org "CC BY-NC" tag is a random uploader's, not the author's. Commander-cascade activation.
- [[this-is-not-a-test]] — free demo + scenarios, no grant. Markets "No I-Go-U-Go."
- [[mordheim-community-rules]] — ubiquitous fan PDFs, zero permission. Classic phase-based IGOUGO.
- [[necromunda-community-edition]] — fan patch on GW IP, no licence. The reference implementation of the default activation model.

## Tier 4 — paid and closed

- [[song-of-blades-and-heroes]] — the famous roll-1-to-3-dice turnover engine. $8. Best mechanical prospect for an ask.
- [[space-weirdos]] — $5 itch.io, solo author, **licensing already raised in the comments. Easiest ask in the survey.**
- [[frostgrave]] — Osprey. Phase-by-rank with wizard proximity drag.
- [[rampant-system]] — Osprey. **Fail a roll and your whole turn ends** — the engine-hostile stress test.
- [[gaslands-refuelled]] — Osprey. Gear-based activation; higher gear = more activations per round.
- [[rangers-of-shadow-deep]] — Modiphius. Deterministic enemy AI a VTT could fully automate.
- [[five-parsecs-from-home]] — **Modiphius-owned since 2023; the permission route is closed.**
- [[five-leagues-from-the-borderlands]] — per-model initiative partition; the round isn't a queue.
- [[zona-alfa]] — Osprey. Not free, not open, nothing distinctive. Lowest priority.
- [[open-combat]] — "Open" means open-ended character building, not licensing. Activation model **unverified**.
- [[space-gits]] — paid game; only its dice engine is open ([[riot-dice-srd]]).
- [[nordic-weasel-games]] — **the "free titles" lead did not pan out.** Negative result recorded; storefronts block bots, so a human should spot-check.

## Excluded by scope

- [[one-page-rules-see-other-agent]] — covered by a separate agent. Its absence from the comparison tables means "not researched," **not** "not suitable."

## The short version

Roughly 20 games investigated. **Two-and-a-half open licences, one of them not a wargame, one of them unimplementable.** Free rules are overwhelmingly free-as-in-beer, and the reason looks structural: wargame rules are a funnel for selling miniatures, so publishers give them away *and* keep them closed.

The realistic paths are **(a) ship an engine and let users supply data**, or **(b) ask solo designers for mechanics-only SRD grants** — an ask with real precedent ([[mausritter-srd]], [[riot-dice-srd]]) and several receptive targets ([[space-weirdos]], [[turnip28]], [[forbidden-psalm]], [[song-of-blades-and-heroes]]). **The bottleneck is permission, not discovery.**

Architecturally, two convergent patterns are worth designing in from the start: **leader-drags-subordinates group activation** (4 independent games) and **greed-ends-your-turn non-deterministic turn length** (3 independent games). And a genuinely ruleset-neutral engine must handle **phase-based IGOUGO** — an enormous family that has no per-model activation at all.
