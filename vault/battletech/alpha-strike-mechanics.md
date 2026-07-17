---
tags: [wargame-research, battletech]
source: https://battletech.com/wp-content/uploads/2025/07/Alpha%20Strike%20Quick%20Start%20Rules%202019-08.pdf
confidence: confirmed
---

# Alpha Strike Mechanics — From the Official Free QSR (primary source)

Read directly from Catalyst's own **free** Alpha Strike Quick Start Rules (2019 Commander's Edition Update, 38pp). No paywall involved — see [[alpha-strike-quick-start-is-free]].

Alpha Strike self-describes as *"a fast-playing game of armored combat"* using *"miniatures… model terrain… unit cards… tape measures and tabletop terrain."*

## Turn sequence — 4 phases

> **Step 1: Initiative Phase** — Each player rolls **2D6**… re-roll ties. The player with the higher result wins the Initiative.

Crucially, the **initiative winner acts LAST**:

> the Initiative winner actually executes unit movement and combat actions **after** the player(s) with the lower Initiative roll. This simulates a greater awareness of the tactical situation.

> **Step 2: Movement Phase** — The player with the lowest Initiative roll moves one of his units first… the Initiative winner then moves one of his units, and the players **continue alternating their unit movements** until all units have been moved.

> **Step 3: Combat Phase** — the player with the lowest Initiative acts first, but — **rather than alternating actions** — this player declares and resolves **all** of his units' combat actions at this time, followed by the Initiative winner.

> **Step 4: End Phase** — both players simultaneously; remove destroyed units, restart shutdown units.

## ⚠️ The critical architectural nuance

**Alpha Strike is NOT uniformly alternating-activation.**

| Phase | Order |
|---|---|
| Movement | **Alternating**, unit by unit |
| Combat | **IGOUGO** — one side resolves *all* attacks, then the other |

It is a **phase-based hybrid**: alternating movement, side-by-side combat. An engine modelling "alternating activation" as *move-and-shoot per unit* (the One Page Rules pattern) **does not fit Alpha Strike**. Movement and shooting are separate phases with *different ordering rules*.

Damage is simultaneous-ish by design:
> Damage… is resolved immediately, but the effects do not take place until the turn's End Phase. This means that a destroyed unit will normally have a chance to return fire.

That **deferred-effect model** is a real engine requirement — dead units still shoot.

## Movement — inches, free facing

> the Move field indicates the number of **inches** the unit may move… A unit may move in any direction and — at the end of its movement — **may face in any direction**.

- Modes: **Standstill / Ground Move / Jumping**
- **Minimum Movement:** always able to move **2 inches** regardless of terrain cost
- **Facing** exists and "affects combat resolution," changed only in Movement Phase — but is *free* at end of move (no facing cost)
- Stacking: may pass through friendly units, not unfriendly at same elevation; may not end in the same space
- Deployment zone = within **10 inches** of home edge

## Combat resolution — 2D6 roll-over

> The base Target Number for all attacks is the unit's **Skill Rating**… modified based on range bracket, target's movement, terrain… roll **2D6**… equals or exceeds → hit.

**Attack Modifiers Table (verbatim):**

| Range | Distance | Mod |
|---|---|---|
| Short | Up to 6" | +0 |
| Medium | >6" to 24" | +2 |
| Long | >24" to 48" | +4 |

| Attacker movement | Mod |
|---|---|
| Standstill | −1 |
| Ground Movement | +0 |
| Jumping | +2 |

| Target movement | Mod |
|---|---|
| Standstill | +0 |
| Ground Movement | **+TMM** |
| Jumping | **+TMM+1** |
| Immobile | **−4** |

| Other | Mod |
|---|---|
| Intervening/Occupied Woods | +1 |
| Partial Cover | +1 |
| Attacker Heat Level > 0 | **+Heat lvl** |
| Fire Control Critical (per hit) | +2 |

Worked example from the book: Skill 3 + 0 (short) + 3 (target jumped, TMM2+1) + 1 (partial cover) = **TN 7 on 2D6**.

Skill: *"A regular-rated MechWarrior commonly has a value of 4, while a value of 1—or even 0—indicates an elite-rated MechWarrior."*

## Damage — two counters, no hit locations

Damage is a **flat value per range bracket** (S/M/L), applied as:

1. Natural **12** → roll critical hit
2. Fill **Armor** bubbles, then **Structure** bubbles
3. Damage remaining after structure gone → **destroyed**
4. Any damage that marks structure → **roll once on Determining Critical Hits Table**

Worked example: Rifleman RFL-3N = **4 armor / 5 structure**. That's the whole unit's durability — **two integers**. Contrast [[classic-battletech-mechanics]]'s 11 armor values + 8×12 crit slots.

## Heat — collapsed to a 4-box track

> **Overheat Value (OV)** indicates the number of damage points the unit can **add to its attack, in exchange for suffering an equal amount of heat**.

- Tracked in **four boxes**; 4+ overheat → **shutdown** (the "S" in box 4)
- Heat Level > 0 gives **+Heat lvl to your own to-hit** (penalty)
- **HT#/#/# special ability** delivers heat *to the target* per range band

So Alpha Strike heat is an **optional damage-boost gamble**, not a mandatory per-weapon accounting. This is a *fundamentally* different model from [[classic-heat-scale]].

## Special abilities

Abbreviation codes on the card (e.g. `HT1/1/-`). The full glossary lives in the paid Commander's Edition; the QSR covers a subset. Machine-readable via MUL's `BFAbilities` → [[master-unit-list-api]].

## Physical attacks
Standard / Melee / Special. No range factor. **Cannot** be made in the same turn as a weapon attack. Charge/Death From Above = +1.

## Victory
Usually last-side-standing; the QSR explicitly encourages **breakthrough** and **capture-the-flag** style alternate objectives.

See [[alpha-strike-card-anatomy]], [[engine-fit-assessment]].
