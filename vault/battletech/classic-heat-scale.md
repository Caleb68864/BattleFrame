---
tags: [wargame-research, battletech]
source: https://static1.squarespace.com/static/5e5f11b6a6b48b3ae5c4ee36/t/5e69a64e3d430e6e35ad7fda/1583982189894/CAT3500D+BattleTech+A+Game+of+Armored+Combat+Rulebook.pdf
confidence: confirmed
---

# The Classic Heat Scale

**All of this is confirmed** — read from the Heat chapter (pp. 37–39) and the **'Mech Record Sheet's HEAT DATA box** of CAT3500D *BattleTech: A Game of Armored Combat*, Catalyst's free official rulebook. (This is the record-sheet source a previous agent found: the effects ladder is literally printed on every record sheet, which is why it's reproducible without touching a paid book.)

> "Heat build-up is a BattleMech's greatest limiting factor."

Part of [[classic-battletech-mechanics]]. Resolved in the **Heat Phase**, phase 5 of 6.

## The scale is 0–30 plus overflow (confirmed)

The Heat Scale tracks **0 to 30** heat points. An **"Overflow" box** records heat above 30, which still has to be dissipated in later turns. **The scale cannot drop below 0.**

## Heat generation (confirmed)

| Activity | Heat |
|---|---|
| Walking | **+1 per turn** — flat, regardless of MP spent or hexes moved |
| Running | **+2 per turn** — flat, regardless of MP spent |
| Jumping | **+1 per Jumping MP spent, minimum 3** |
| Attempting to stand | **+1 per attempt** (on top of that turn's movement-mode heat) |
| Weapons fire | per-weapon, listed on the record sheet |
| First engine critical hit | **+5 per turn** |
| Second engine critical hit | **+10 total per turn** |

Engine-hit heat is **not** applied while the 'Mech is shut down.

Note the shape: movement heat is a **flat cost per mode**, not per hex. Walking 1 hex and walking 8 hexes both cost 1 heat. Jumping is the exception — it scales per MP with a floor of 3. This makes jumping the expensive, heat-hungry movement mode.

## Heat dissipation (confirmed)

- Each **operational** heat sink dissipates **1 heat point per turn**. (Destroyed heat sinks reduce the count — 16 sinks with 3 destroyed dissipates 13.)
- **Water:** submerged heat sinks dissipate **twice** as much (a second −1 each). Depth 1 water submerges **leg-mounted** sinks only; Depth 2+, or prone in Depth 1+, submerges **all** sinks including engine-internal ones. **Capped at 6 additional points per turn.**

**Recording:** during the Heat Phase, sum heat built, subtract heat dissipated, apply the (positive or negative) delta to the current scale position.

## The effects ladder (confirmed — printed on the record sheet)

Four **independent, interleaved** tracks. Reading the record sheet's HEAT DATA box top-down:

| Heat | Effect |
|---|---|
| 30 | **Shutdown** (unavoidable) |
| 28 | Ammo Exp., avoid on **8+** |
| 26 | Shutdown, avoid on **10+** |
| 25 | **−5 Movement Points** |
| 24 | **+4** Modifier to Fire |
| 23 | Ammo Exp., avoid on **6+** |
| 22 | Shutdown, avoid on **8+** |
| 20 | **−4 Movement Points** |
| 19 | Ammo Exp., avoid on **4+** |
| 18 | Shutdown, avoid on **6+** |
| 17 | **+3** Modifier to Fire |
| 15 | **−3 Movement Points** |
| 14 | Shutdown, avoid on **4+** |
| 13 | **+2** Modifier to Fire |
| 10 | **−2 Movement Points** |
| 8 | **+1** Modifier to Fire |
| 5 | **−1 Movement Points** |

Thresholds per track:
- **Movement penalty:** 5, 10, 15, 20, 25 → −1/−2/−3/−4/−5
- **To-hit penalty:** 8, 13, 17, 24 → +1/+2/+3/+4
- **Shutdown check:** 14, 18, 22, 26, 30
- **Ammo explosion check:** 19, 23, 28

**Timing:** effects are suffered **after** the turn's heat level has been adjusted, in the Heat Phase.

## The three rules that make this hard to implement (confirmed)

1. **Effects are thresholds, not accumulators — "not cumulative."** At 5–9 heat it is −1 Walking MP. At 10 heat it becomes **−2 total, not 2 more**. An engine must compute *"the highest threshold currently reached on this track,"* not sum the passed thresholds. Same for to-hit.
2. **Effects are a pure function of current scale position, and they reverse.** "These effects... disappear when heat build-up is reduced." Heat is a **live state**, not damage. Drop below 10 (but stay ≥5) and the 'Mech is back to −1 MP. This means heat effects must be **derived on read**, never written into the unit as a persistent modifier.
3. **One roll per track per turn, against the highest threshold reached.** "If heat accumulation reaches two or more trigger levels in one turn, roll 2D6 **only once**, against the highest Avoid Target Number." You do not roll a shutdown check per threshold crossed.

## Movement penalty details (confirmed)

Reduces **Walking MP**. **Running MP must then be recalculated** as 1.5 × the *current* Walking MP, rounding up ([[classic-movement-points]]) — so heat compounds into run speed. **Jumping MP is not affected** by heat.

## To-hit penalty details (confirmed)

Adds to the Target Number for **weapon attacks only** — explicitly **not physical attacks**. See [[classic-to-hit-modifiers]].

## Shutdown (confirmed)

At 14/18/22/26/30, the 'Mech automatically attempts a safety shutdown. A **conscious** MechWarrior may override by rolling 2D6 ≥ the Avoid TN for the highest threshold reached. **At 30+, shutdown cannot be avoided.**

On shutdown:
- Immediate **Piloting Skill Roll at +3** (and any *other* PSR required while shut down **automatically fails**)
- 'Mech becomes **immobile**; equipment stops functioning **except heat sinks and life support**; it cannot attack or act
- Engine crit hits stop generating heat
- Becomes targetable by **aimed shots**

**Restart:** heat sinks keep working while down. The 'Mech must spend one full turn (Heat Phase to Heat Phase) shut down, then rolls 2D6 ≥ the current highest Avoid TN in each subsequent Heat Phase. It may move and fire the turn *after* restarting. Heat must be **below 30** for any restart. When heat drops **below 14**, the plant restarts **automatically — even if the pilot is unconscious**.

**Voluntary shutdown** happens in the End Phase, and restart from voluntary shutdown is also an End Phase action.

## Ammunition explosion (confirmed)

At **19+** with any unemptied ammo bin, roll 2D6 **once** against the highest threshold reached: 19–22 needs **4+**, 23–27 needs **6+**, 28–30 needs **8+**.

Selection of what explodes: the ammo critical slot with the **most destructive ammo per shot** — "ammo per shot" = the Damage Value of one turn's worth of shots (machine gun = 2, LRM-15 = 15, SRM-6 = 12). Ties → controller chooses. Within a matching type, the slot with the **most shots remaining** explodes; ties → random.

Damage resolves against the **internal structure**, per the Critical Hit Effects rules. **An ammo explosion affects only the 'Mech that suffered it** — no splash to adjacent units. The MechWarrior automatically takes **2 points of damage** and must make **two Consciousness Rolls**.

## Heat + damaged life support (confirmed)

If life support has taken **one or more critical hits**, the MechWarrior takes **1 wound at the end of every Heat Phase** the scale sits between **15 and 25**, or **2 wounds** at **26+**.

## Why this matters architecturally

Heat is a **per-unit resource simulation with its own turn phase** and four independent non-cumulative threshold tracks that read live off a single scalar. Nothing in a paper-sized skirmish engine looks like this — there is no "status effect" abstraction that naturally expresses *"derive four separate penalties from the highest threshold below a fluctuating integer, re-evaluated every turn, reversible."* See [[engine-fit-assessment]].
