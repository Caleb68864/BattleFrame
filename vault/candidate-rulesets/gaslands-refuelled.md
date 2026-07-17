---
tags: [wargame-research, candidate-ruleset]
source: https://www.ospreypublishing.com/us/gaslands-refuelled-9781472838834/
confidence: confirmed
---

# Gaslands: Refuelled

Post-apocalyptic vehicular combat. Commercial and closed, with a non-commercial fan-content policy. **Gear-based activation** is a genuinely unusual scheduler.

## Identity

- **Author:** Mike Hutchinson (also of [[space-gits]])
- **Publisher:** Osprey Games
- **URL:** https://www.ospreypublishing.com/us/gaslands-refuelled-9781472838834/

## Licensing — commercial rulebook + non-commercial fan policy

**Confirmed. Cannot ship content.**

The rulebook is a standard commercial Osprey product; no CC/OGL/ORC for the core text despite targeted searching. The original 2017 Gaslands was **also** Osprey-published from the start — I found **no evidence** of an earlier self-published or CC-licensed edition. Any such claim is **unverified and likely false**.

Hutchinson's own site publishes free templates and errata plus a [Fan Content Policy](https://planetsmashergames.com/fan-content-policy/):

> "Your content cannot be reasonably mistaken for an 'official' product."

> "You cannot monetise your content" — "As soon as you monetise your fan content (by selling it, adding a tip jar, patreon subscription, ad-funding, etc.) it ceases to be fan content."

It also forbids reprinting extensive rulebook text and suggests disclaimer boilerplate: "This is unofficial fan content... not approved or endorsed by Planet Smasher Games."

> [!important] A fan-content policy is not an open license
> This is **permission to create fan works**, not a redistribution grant. It explicitly forbids commercial use and does not permit reproducing the rules text. This is legally distinct from CC/OGL/ORC, which *do* permit redistribution and (usually) commercial derivatives. See [[fan-content-policies-are-not-open-licenses]].

A free Foundry module arguably fits "non-commercial fan content" — but it may not reproduce the rules text or stat data, which is most of what a module would need. Human legal review required before relying on this.

## Activation model — gear phases, higher gear = more activations

**Confirmed** (Osprey [official Quick Reference Sheet](https://www.ospreypublishing.com/media/ynedioak/gaslands-refuelled-quick-reference-sheet-v3.pdf)).

Each round runs **Gear Phases 1 through 6**. In each gear phase, every vehicle **currently in that gear or higher** activates. A vehicle in Gear 3 therefore activates in Gear Phases 1, 2, *and* 3 — so going faster literally grants you more activations per round.

- Within a phase, activation order runs player-by-player from pole position, in turn order.
- A player with multiple eligible vehicles chooses which to activate; a player with none passes.

> [!tip] Architecturally
> Activation **count per round is a per-token, dynamically-changing property** driven by a game-state value (current gear). Not "each unit acts once." An engine assuming one-activation-per-unit-per-round cannot host this. Excellent diversity value.

## Complexity

Light. Fast, chaotic, dice-pool attacks and simple stat blocks; the gear system is the most novel element. Beer-and-pretzels weight.

## Suitability

**Not an early target** (closed license, and vehicle movement templates are a big non-rules engineering lift in a VTT). **High mechanical-diversity value** for architecture validation.

## Related

- [[activation-model-comparison]]
- [[fan-content-policies-are-not-open-licenses]]
- [[space-gits]]
- [[licensing-freedom-ranking]]
