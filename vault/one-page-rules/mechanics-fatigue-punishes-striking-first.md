---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Fatigue Drops Melee to 6s-Only After a Unit's First Melee Each Round

GF Core Rules v3.5.1:

> **Fatigue:** After attacking in melee for the first time during a round, either by **charging or by striking back**, units only hit on **unmodified rolls of 6** in melee **until the end of that round**.

A small rule with large tactical weight: it makes **charging costly** and **being charged repeatedly** survivable-ish.

## Mechanics

- Triggers on a unit's **first melee attack** in a round — from *either* charging *or* striking back ([[mechanics-melee-strike-back-is-optional-and-free]]).
- Effect: melee hits **only on unmodified 6s**, regardless of Quality.
- Duration: **until the end of that round**. Clears at round boundary.
- **Shooting is unaffected.** Melee only.

## Why it makes strike-back a real decision

Striking back **fatigues you**. If you strike back at a charger and are then charged again by a second unit that round, you fight the second melee at 6s-only. Declining to strike back keeps you fresh — at the cost of certainly losing the melee-result comparison, since you'd deal zero wounds ([[mechanics-morale-has-two-distinct-triggers]]). The rules spell out this exact trade: *"if a unit didn't strike back in melee, then it must only take a morale test if it suffered at least one wound"* — so declining is safe **if you took no wounds**.

This is the engine's most interesting decision point, and it argues for **prompting the defender** rather than auto-resolving strike-back.

## Implementation notes

- `isFatigued` is **per-unit, per-round**, set on first melee attack, cleared at end of round. It is *not* tied to activation.
- *"unmodified rolls of 6"* — the check bypasses the normal modifier pipeline entirely. It is not "-X to hit"; it is a **replacement of the target number** with a raw-6 requirement. Combined with the global *"rolls of 6 always succeed"* clamp ([[mechanics-quality-and-defense-are-the-only-two-stats]]), fatigued units always retain a 1-in-6 chance.
- Shaken units strike back *"counting as fatigued"* ([[mechanics-shaken-costs-a-full-activation-to-clear]]) — so `isFatigued` must be settable from a *state*, not only from having attacked.

## Version warning

v2.16 read *"until the end of the round **after** they charge or strike back"* — i.e. fatigue lasted into the **following** round. v3 shortened it to the current round only. This materially changes melee tempo; see [[mechanics-rules-versions-v2-vs-v3-differ-materially]].

**Confidence: confirmed** — quoted from GF Core Rules v3.5.1; identical wording appears across GF, GFF, AoF, AoFS, AoFR.
