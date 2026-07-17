---
tags: [wargame-research, candidate-ruleset]
source: https://www.ospreypublishing.com/us/frostgrave-second-edition-9781472834683/
confidence: confirmed
---

# Frostgrave (2nd Edition)

Wizard-warband fantasy skirmish. Commercial, all-rights-reserved. Notable for a **phase-by-rank** activation model, not alternating activation.

## Identity

- **Author:** Joseph A. McCullough
- **Publisher:** Osprey Games (Bloomsbury)
- **URL:** https://www.ospreypublishing.com/us/frostgrave-second-edition-9781472834683/

## Licensing — commercial, all rights reserved

**Confirmed. Cannot ship content.**

The core rulebook is a paid product. Osprey's [permissions policy](https://www.ospreypublishing.com/us/connect/contact-us/permissions/) states:

> "All Osprey books are protected by copyright and so, unless otherwise stated, you are not permitted to copy or reproduce material from publications without our express permission."

Osprey's [Frostgrave/Stargrave gaming resources page](https://www.ospreypublishing.com/uk/discover/gaming-resources/frostgrave-stargrave/) offers **free supplementary PDFs only** — quick reference, spell reference, wizard sheets, ambush cards, errata. Not the rules text. Footer: "© Osprey Publishing 2026, Part of Bloomsbury Publishing Plc." No CC/OGL/ORC statement anywhere.

> [!note] Expired promo, not a license
> A March 2020 COVID-era promo code (FGV2020) reportedly made the full PDF temporarily free. **Unverified as ever having been a standing grant, and certainly not current.** A time-limited giveaway is not a license — it does not confer redistribution rights. Do not cite it as evidence of openness.

**Verdict:** design-against only; no content shipping. Fits the "user owns the rulebook" model this project is explicitly trying to escape.

## Activation model — fixed phases by unit rank

**Confirmed** (Osprey [Quick Reference PDF](https://www.ospreypublishing.com/media/ep5c2oi2/frostgrave_qrs-1.pdf)).

Each turn runs four fixed phases: **Wizard → Apprentice → Soldier → Creature**.

- Turn opens with an **initiative roll**; highest becomes primary player.
- **Wizard phase:** primary player activates their wizard *plus 0–3 soldiers within 3"/LOS of the wizard*, in any order. Then the secondary player does the same.
- **Apprentice phase:** same structure, for apprentices and their nearby soldiers.
- **Soldier phase:** all not-yet-activated soldiers activate.
- **Creature phase:** all uncontrolled creatures activate.
- Each figure gets **2 actions**.

Architecturally this is a **leader-proximity drag** model — the wizard pulls nearby soldiers into an earlier phase. Compare [[turnip28]]'s commander cascade. Both break a flat activation queue.

## Complexity

Medium. Spell lists are the main weight; warbands are ~7–10 figures so bookkeeping stays light.

## Suitability

**Poor early target on licensing; valuable as a mechanical reference.** The rank-phase + proximity-drag model is a good stress test for an engine's turn scheduler.

## Related

- [[activation-model-comparison]]
- [[licensing-freedom-ranking]]
- [[osprey-games-blanket-copyright-policy]]
