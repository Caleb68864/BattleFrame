---
tags: [wargame-research, candidate-ruleset]
source: https://www.ospreypublishing.com/us/xenos-rampant-9781472852366/
confidence: partial
---

# Xenos Rampant / Lion Rampant (the "Rampant" system)

Osprey's family of light skirmish games. Commercial and closed — but the **activation-or-lose-your-turn** mechanic is the single most engine-hostile model found in this survey.

## Identity

- **Author:** Daniel Mersey (Xenos Rampant with Richard Cowen & Michael Doscher; Lion Rampant 2e with Mark Stacey, David Needham)
- **Publisher:** Osprey Games
- **URLs:**
  - Xenos Rampant — https://www.ospreypublishing.com/us/xenos-rampant-9781472852366/
  - Lion Rampant 2e — https://www.ospreypublishing.com/us/lion-rampant-second-edition-9781472852618/

## Licensing — commercial, all rights reserved

**Confirmed. Cannot ship content.** Both are standard commercial Osprey retail products. No free full rulebook for either. Osprey's [gaming resources](https://www.ospreypublishing.com/uk/discover/gaming-resources/osprey-wargames-series/) provides only free **army/detachment roster sheets, quick reference sheets, and FAQ/errata** — not rules text. The [[osprey-games-blanket-copyright-policy]] applies. No CC/OGL/ORC found.

## Activation model — roll to activate, fail and your turn ENDS

**Partial — see caveat.** Alternating unit activation, but gated by a roll:

- To act, a unit rolls **2D6 and must meet or exceed the stat for the intended action**.
- **On failure, that player's entire activation phase ends immediately** and the opponent takes over.
- This creates the system's signature risk/reward tension: every additional activation you attempt is a gamble that could end your whole turn.
- Casualties trigger a Courage test (2D6 vs Courage, −1 per casualty removed). Result >0 after the test → forced Retreat, unit becomes "Battered"; ≤0 → Rout.
- Failed **Rally** tests do *not* end the phase — only failed **activation** rolls do.

> [!warning] Edition caveat
> The mechanics above are sourced from **1st-edition Lion Rampant** material ([Lion Rampant QRS](https://www.scribd.com/document/700490381/Lion-Rampant-QRS), [marksgamingblog review](https://marksgamingblog.blogspot.com/2015/06/review-of-lion-rampant.html)). Osprey and reviewers state Xenos Rampant and Lion Rampant 2e share the same "activate-or-lose-turn" core, but **no primary-source quote from either the Xenos Rampant or the 2nd-edition rulebook was obtained** to confirm the mechanic is unchanged in revision. Treat the exact 2e/Xenos wording as **unverified**.

> [!tip] Why this is the interesting one
> A player's turn has **non-deterministic length that terminates on a failed roll**. An engine that models "a turn is a list of activations you work through" cannot represent this — the turn boundary is discovered mid-turn, by a die roll. If the architecture can host Rampant, it can probably host anything. See [[activation-model-comparison]].

## Complexity

Light-medium. Deliberately streamlined for fast play with modest unit counts (per Goonhammer reviews — general characterization, not quoted).

## Suitability

**Not shippable. Retain as the architectural stress test** — the extreme case against which to validate the turn scheduler abstraction.

## Related

- [[activation-model-comparison]]
- [[osprey-games-blanket-copyright-policy]]
- [[licensing-freedom-ranking]]
