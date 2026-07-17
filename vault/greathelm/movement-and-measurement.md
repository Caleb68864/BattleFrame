---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Movement and Measurement — Real Inches

**Not zones, not base-widths.** Absolute inches, measured with a ruler.

QSR p1 components list: "A device for measuring distance in inches". Kickstarter is explicit:

> Movement in Greathelm is pretty standard if you're familiar with most table top miniatures games. **All measurements are in inches.**

— https://www.kickstarter.com/projects/1674560143/greathelm

## Distances (QSR v0.4)

| Action / effect | Distance |
|---|---|
| Sprint (face 6) | up to **5"** |
| Encircle (face 5) | up to **3"** |
| Shift (face 3) | up to **1"** |
| Bash push ([[bash-action]]) | up to **3"** |
| Dodge ([[clash-defenses]]) | **1"** immediate |

All are "up to" — partial moves allowed.

## Restrictions

QSR p1, verbatim:

> Knights can freely move out of base contact with enemies without penalty.
> Knights cannot move through spaces smaller than their base width, or through terrain.
> Bashed knights may be moved in any direction.

Kickstarter adds: "In Greathelm, models cannot move through other models, whether friend or foe."

So: **no move-through** (models or terrain), and **no zone-of-control** — see [[base-contact-and-engagement]]. The "spaces smaller than their base width" clause means gaps between models/terrain are a real physical constraint — an engine needs actual collision, not just range checks.

## Scale matters

The play area is 8.5"×11" ([[play-area-and-setup]]). A 5" Sprint crosses **most of the short axis in one action**. Everything is in knife-fight range from turn one; there is no approach phase. This is why 1" Shift is meaningful and why terrain gaps matter.

## Discrepancy — Sprint 5" vs Run 6"

Goonhammer says "models are able to be activated to Run to move 6"". QSR v0.4 says 5". See [[version-discrepancies-qsr-vs-kickstarter]] — **use 5"**.

## Full-game extension

Goonhammer: "Light armour will instead ... [have] +1" to all moves" — so equipment modifies distances in the full game. Not in QSR.

Related: [[dice-face-to-action-mapping]] · [[play-area-and-setup]]
