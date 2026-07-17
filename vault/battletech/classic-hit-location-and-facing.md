---
tags: [wargame-research, battletech]
source: https://static1.squarespace.com/static/5e5f11b6a6b48b3ae5c4ee36/t/5e69a64e3d430e6e35ad7fda/1583982189894/CAT3500D+BattleTech+A+Game+of+Armored+Combat+Rulebook.pdf
confidence: confirmed
---

# Hit Location & Facing — The Architecturally Critical Mechanic

Read from the Combat chapter (Facing p. 9, Firing Arcs pp. 14–15, Hit Location pp. 22–23) of CAT3500D *A Game of Armored Combat*, Catalyst's free official rulebook. Part of [[classic-battletech-mechanics]]; the spatial context is [[hex-vs-inches-is-the-fault-line]].

> "Hit location is determined by the **attack direction** and the **target's facing**."

That single sentence is why Classic BattleTech cannot ride on an inches-based, facing-free engine. Geometry feeds directly into damage resolution.

## The 6-hexside facing model (confirmed)

> "Every hex on the map has six edges, called **hexsides**. Every 'Mech must face one of those six hexsides: this is known as its **facing**. A 'Mech faces the way its **feet** are pointing."

- **Facing is one of exactly 6 discrete values** — not a continuous angle.
- **Changing facing costs 1 MP per hexside.** A 180° turn = 3 hexsides = 3 MP ([[classic-movement-points]]).
- Movement is facing-constrained: a 'Mech may move **forward into the hex it faces**, or **backward into the hex directly to its rear**. Any other hex requires paying MP to turn first.
- Physical-model edge case: a 'Mech not clearly facing one hexside at the end of the Movement Phase "must be realigned to one of the two closest hexsides **by the opposing player**." (A tabletop nudge rule — a digital engine gets this free.)

## There are TWO independent hexside systems (confirmed)

This is the subtlety most likely to be implemented wrong. Facing drives **two separate things**, and they deliberately **decouple**:

| | **Attack Direction** (defensive) | **Firing Arcs** (offensive) |
|---|---|---|
| Answers | "Which hit location column is rolled against me?" | "Which of my weapons can reach that target?" |
| Driven by | **Feet facing only** | **Torso facing** (feet + torso twist) |
| Torso twist? | **Ignored entirely** | **Yes — this is what twist is for** |
| Values | Front / Rear / Left / Right | Forward / Left Side / Right Side / Rear |

The rules state the decoupling twice, explicitly:
- "Use the direction of a standing 'Mech's feet to determine its facing, **disregarding any torso twists** it has made that turn."
- "Torso-twisting has **no effect on how a 'Mech will receive damage** (i.e. it only affects the 'Mech's own firing arcs)."

**Torso twist:** rotate the torso **one hexside** left or right while feet stay put. Declared as part of weapon attack declaration, lasts the rest of the turn, affects Weapon *and* Physical Attack Phase arcs, and **auto-returns to forward in the End Phase**. Prone 'Mechs may not twist. Leg-mounted weapons and kicks are **always aligned with the feet**, never the twist.

**Arm flipping** is a third arc modifier: 'Mechs lacking hand *and* lower-arm actuators in **both** arms (and with no torso/arm split weapons) may **flip arms** to fire arm weapons into the **rear** arc. Both arms must flip. **A 'Mech cannot torso twist and flip arms in the same turn.** Also auto-reverts in the End Phase.

So a unit carries **two facings** (feet, torso) plus an **arm-flip flag**, of which only the feet facing is visible to incoming fire.

## Determining attack direction: geometric, per attacker-target pair (confirmed)

> "Lay a **straightedge from the center of the attacker's hex to the center of the target's hex**. Compare the **hexside crossed** by the straightedge to the Attack Direction Diagram to find the side of the 'Mech hit by the attack."

Key properties:
- It is a **pairwise geometric derivation** — target facing + relative bearing → one of {Front, Rear, Left, Right}. It is **not** stored state; it's recomputed per attacker.
- It is resolved **once per attacker per turn** and applies to *all* that attacker's attacks on that target that turn ("all his attacks against that target this turn will use the Left Side column").
- **Tie-breaking favours the defender:** if the straightedge crosses **at the intersection of two hexsides**, "the **target chooses** which side is hit — **before** the attacking player makes the hit location roll." (The Attack Direction Diagram marks these ambiguous positions as white hexes.) This is a real decision point requiring player input mid-resolution.
- **Prone targets:** use the hexside the **top center of the 'Mech** points at as its facing; damage is then treated as if it were standing with that facing.

⚠️ **Not confirmed:** the exact hexside-to-zone geometry (how many hexes fall in the Front zone vs the Left zone, and which are the ambiguous white hexes) is conveyed **only as a diagram** in the rulebook and did not survive text extraction. The four zones and the target-chooses tie rule are confirmed; **the precise per-hex partition is not — do not reconstruct it from memory.**

## The Hit Location Table has only THREE columns (confirmed)

Four attack directions, but the table's columns are:

**`Left Side` | `Front/Rear` | `Right Side`**

**Front and Rear share a single column.** This is the non-obvious bit. The rear attack does not get its own location distribution — it gets the *same* distribution as a frontal attack. What changes is **which armor value the damage eats**.

Structure of the table (described, not transcribed — it's ~11 rows × 3 columns of 2D6 results):
- Rolled with **2D6** → one of 8 locations: Head, Center Torso, Left/Right Torso, Left/Right Arm, Left/Right Leg.
- The distribution is **bell-curved by 2D6**, so the center of the curve (7) is the most likely location, and the extremes are rare.
- **A roll of 2 is the critical-hit result** — it "may inflict a critical hit... even if the armor remains intact in that location," and triggers a roll on the Determining Critical Hits Table.
- **A roll of 12 is the Head** in all three columns — head hits are equally rare from every direction.
- The Left Side and Right Side columns are **mirror images** of each other.
- Side columns bias hits toward the **near side's** limbs and torso; the Front/Rear column spreads across center and both sides.

### Front vs Rear is resolved at the armor layer, not the table layer (confirmed)

- Only the **three torso locations** have rear armor. "The arms, legs and head **do not have rear armor locations**."
- Damage "is applied to the **front armor unless the attack came from the rear**, in which case it is applied to the rear."
- Damage **transfer** respects it too: "Damage dealt to the **rear hit zone** that transfers inward transfers to the appropriate **rear torso facing**. For example, damage from the rear that hits a missing left leg is transferred to the **left rear torso**."

This is exactly the `CT armor:47` / `RTC armor:14` split visible in [[megamek-mtf-unit-format]] — the data format and the rule line up perfectly.

## Physical attacks use different location tables (confirmed)

Physical attacks don't reuse the weapon Hit Location Table. There are dedicated tables, and they're **1D6**, not 2D6:

- **Punch Location Table** — 1D6, columns `Left Side / Front/Rear / Right Side`, hitting only upper-body locations (torsos, arms, head).
- **Kick Location Table** — 1D6, columns `Left Side / Front/Rear / Right Side`, hitting **only legs**.

Same three-column, attack-direction-driven structure — so the attack-direction derivation is shared machinery across weapon and physical attacks. A **hatchet** rolls on the regular Hit Location Table by default but may declare Punch or Kick tables instead.

## Modifiers that reach into hit location (confirmed)

- **Partial cover:** if the hit location roll indicates a **leg**, the attack strikes the **cover instead** — the location roll is re-interpreted, not re-rolled. ([[classic-to-hit-modifiers]])
- **Aimed shots:** may target a specific location, but only against shut-down 'Mechs (or unconscious pilots) — declared at attack declaration.

## Rolls must be sequential, not batched (confirmed)

> "It is vital that every hit location roll be made **one at a time**. If a 'Mech hits with multiple weapons in a single attack, it is tempting to just roll a bunch of dice and so try to resolve all hit locations at once. **This is wrong**, as the order in which attacks hit is very important."

Because damage transfer and destruction cascade, resolution order is load-bearing. **The attacker chooses the order**, and may change it turn to turn. An engine cannot vectorize hit resolution — it's a strict sequential fold where each hit mutates the state the next hit reads.

## Why this is *the* architectural fault line

To resolve one weapon hit, Classic BattleTech needs:

1. Attacker hex center → target hex center **bearing**
2. Target's **feet facing** (explicitly *not* its torso facing)
3. → **attack direction** ∈ {Front, Rear, Left, Right}
4. → **hit location column** ∈ {Left Side, Front/Rear, Right Side}
5. → 2D6 → **location**
6. → **armor facing** (front vs rear) — the only place Front and Rear diverge
7. → sequential damage/transfer/crit resolution against *that* location's *that* facing

Steps 1–4 and 6 **do not exist in any form** in an inches-based, facing-free skirmish engine. There is no seam to hang them on: it isn't a modifier on a to-hit roll, it's a **structural input to damage resolution**. See [[engine-fit-assessment]].
