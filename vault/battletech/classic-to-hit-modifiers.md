---
tags: [wargame-research, battletech]
source: https://static1.squarespace.com/static/5e5f11b6a6b48b3ae5c4ee36/t/5e69a64e3d430e6e35ad7fda/1583982189894/CAT3500D+BattleTech+A+Game+of+Armored+Combat+Rulebook.pdf
confidence: confirmed
---

# To-Hit Modifiers — GATOR

Read from the Combat chapter (Target Number Modifiers pp. 16–18, Attack Modifiers Table pp. 19–20) of CAT3500D *A Game of Armored Combat*, Catalyst's free official rulebook. Part of [[classic-battletech-mechanics]].

## The core roll (confirmed)

Roll **2D6**, meet or exceed the **modified Target Number**.

- **Base Target Number = the attacker's Gunnery Skill Rating.** That's it — the skill *is* the base TN.
- **"All modifiers are cumulative."**
- **TN > 12 → automatic miss.** "Rolling a 12 does **not** result in an automatic hit." If a declared attack will auto-miss, the player may decline to roll — but **may not retarget** that turn.
- **TN ≤ 2 → automatic hit.**

Note the inversion versus most modern games: **lower Gunnery is better** (a Gunnery 3 pilot is better than Gunnery 4), and modifiers **add** to the number you must beat.

## GATOR — the official mnemonic (confirmed)

The rulebook structures the entire modifier system around this, and lists modifiers in this order in the table itself:

| | Stands for |
|---|---|
| **G** | **Gunnery** Skill Rating (the base TN) |
| **A** | **Attacker** movement modifier — *the **color** of your movement die* |
| **T** | **Target** movement modifier — *the **number** on the target's movement die* |
| **O** | **Other** modifiers — "typically only woods, partial cover, and heat" |
| **R** | **Range** modifiers |

The die color/number shorthand ties directly to [[classic-movement-points]]: the Movement Phase physically emits the A and T terms as a token on the board.

## A — Attacker movement modifier (confirmed)

Based on the **movement mode**, "**not** the actual MP expended or distance moved."

| Attacker state | Modifier |
|---|---|
| Stationary | **0** |
| Walked | **+1** |
| Ran | **+2** |
| Jumped | **+3** |
| **Prone** | **+2** |

## T — Target movement modifier (TMM) (confirmed)

Based on **the number of hexes traversed** by the target this turn, "**not** the number of Movement Points it spent."

| Hexes moved | TMM |
|---|---|
| 0–2 | **0** |
| 3–4 | **+1** |
| 5–6 | **+2** |
| 7–9 | **+3** |
| 10–17 | **+4** |
| 18–24 | **+5** |
| 25+ | **+6** |
| **Jumped** | **+1 additional** (on top of the hexes-moved value) |

| Target state | Modifier |
|---|---|
| **Prone** | **−2** from an adjacent hex; **+1** from all others |
| **Immobile** | **−4** |

**Note the MP/hexes split is deliberate and asymmetric:** the attacker's modifier keys off *mode*, the target's keys off *hexes*. The rulebook's worked example makes this concrete — a Wolverine spends **8 MP running** but only travels **5 hexes**, so it takes **+2 as attacker** (ran) and grants **+2 as target** (5 hexes). Terrain and facing changes eat MP without buying evasion.

**Reversal rule:** if the target moved both backward and forward, base TMM only on hexes moved **from the hex where it last reversed**. Moving back 3 then forward 2 → TMM based on **2 hexes** (= 0), not 5.

**Immobile is narrow:** "Do not apply this modifier unless a target is **specifically stated** to be immobile, **even if it has 0 MP**." A heat-crippled 'Mech at 0 MP is not immobile; a **shut-down** one is. See [[classic-movement-points]].

## R — Range modifier (confirmed)

Every weapon has **short / medium / long** brackets (plus an optional minimum range), listed on the record sheet.

| Bracket | Modifier |
|---|---|
| Short | **0** |
| Medium | **+2** |
| Long | **+4** |
| Beyond long | **cannot hit** |

**Counting range:** "Count the hexes between attacker and target, taking the **shortest path** — start with the hex **adjacent to the attacker**, and **include the target's hex**."

**Levels are ignored for range.** "A target one hex away but **99 levels higher** than the attacker is still one hex away." Range is pure 2D hex distance — elevation never contributes.

### Minimum range (confirmed)

Weapons like PPCs and LRMs are penalized for close targets. The formula, quoted:

> **[Min. Range] − [Target Range] + 1**

Worked example from the book: a PPC (min range 3) firing at a target **3 hexes** away → **+1**; at **2 hexes** → **+2**; at **1 hex** → **+3**.

## O — Other modifiers (confirmed)

### Terrain
| Terrain | Modifier |
|---|---|
| **Light woods** — target occupies | **+1** |
| **Light woods** — *per intervening hex* | **+1 each** |
| **Heavy woods** — target occupies | **+2** |
| **Heavy woods** — *per intervening hex* | **+2 each** |
| **Water** | **none** (but Depth 1 grants partial cover → +1) |

**Terrain modifiers double as the LOS rule:** "terrain modifiers **in excess of +2 always result in LOS being blocked**." So blocking isn't a separate raycast — it's an accumulation threshold on the same value. Two heavy woods hexes between you and the target (+4) isn't a hard shot; it's **no shot**.

**Death From Above ignores terrain modifiers** entirely.

### Partial cover (+1)
Target must be **standing adjacent to a hex one level higher** than its own, and that hex must lie **along the LOS**. Hill or building — **not a bridge**.

- **Negated by firing downhill:** if the attacker's LOS level is higher than the target's, partial cover doesn't apply (unless the cover is water).
- **Depth 1 water grants partial cover** even against higher attackers and physical attacks — but **not** if the attack couldn't hit legs anyway (e.g. a Punch Location Table attack).
- **Woods do not provide partial cover.**
- **Prone 'Mechs cannot receive partial cover.**
- Beyond the +1: **if the hit location roll indicates a leg, the attack is ignored** — it hits the cover. See [[classic-hit-location-and-facing]].

### Heat
Per the Heat Scale — **+1/+2/+3/+4** at 8/13/17/24 heat. **Never applies to physical attacks.** See [[classic-heat-scale]].

### 'Mech damage (the "D" that GATOR hides inside "O")
| Damage | Modifier |
|---|---|
| **Sensor hit** | **+2** |
| **Shoulder hit** | **+4** for weapons in that arm (disregard other damaged actuators in that arm) |
| **Upper or lower arm actuator** (each) | **+1** for weapons in that arm |

'Mechs whose record sheet **never had** lower arm actuators take no actuator damage modifier for weapon attacks — though the absence still affects physical attacks.

### Multiple targets
A 'Mech may attack as many targets as it has weapons. At declaration, one is named the **primary target**.

- **If any declared target is in the forward arc, one of those must be the primary.** Only if attacking *exclusively* into side/rear arcs may the attacker freely choose the primary.
- Secondary targets: **+1** in the **forward** arc, **+2** in the **side or rear** arcs.
- **"These modifiers are not cumulative."**
- Applies **regardless of where the weapons are mounted**.
- Only **one primary target per turn**, even with multiple firing arcs from torso twisting.
- **Does not apply to physical attacks.**

## The defender-chooses tie-break recurs (confirmed)

As with attack direction, ambiguous geometry favours the target. From the book's worked example: "because LOS passes **exactly between** hexes I and II, **the target chooses**" — and the defending Thunderbolt picks the hex that **blocks LOS in both directions**. Partial cover has the same rule when LOS passes exactly between two candidate cover hexes.

**This is a recurring architectural requirement:** several geometric ties are resolved by a **defender decision made mid-resolution**, before the attacker rolls. An engine cannot resolve BattleTech geometry as a pure function — it needs to pause and prompt the non-active player.

## Worked example (confirmed — from the rulebook)

Wolverine firing a medium laser at a Griffin:

| Term | Value | Why |
|---|---|---|
| **G**unnery | 4 | pilot skill |
| **A**ttacker movement | +2 | ran |
| **T**arget movement | +1 | jumped 2 hexes (0 for hexes, +1 for jumping) |
| **O**ther — partial cover | +1 | |
| **O**ther — terrain | +1 | one intervening light woods hex |
| **R**ange | +2 | 4 hexes = medium |
| **Modified TN** | **11** | needs 11+ on 2D6 (~8%) |

The reciprocal Griffin PPC shot totals **10**. Two 'Mechs at close range, both needing double digits — **this is normal**. BattleTech's modifier stack routinely pushes TNs to the edge of the 2D6 curve, which is why the game's tactical texture is about *reducing* modifiers (stand still, close range, clear LOS) rather than seeking bonuses.

## Architectural shape

GATOR is a **flat additive pipeline** — genuinely easy to model, and the friendliest part of Classic for a conventional engine. The problems are its **inputs**, not its arithmetic:

- **A** and **T** require inter-phase state (mode + hexes moved, surviving Movement → Weapon Attack Phase)
- **T** needs *hexes traversed*, which is **not** derivable from start/end position (the reversal rule proves it) — the engine must record the actual path
- **O** needs **hex-by-hex intervening terrain enumeration** along a traced LOS, with a +2 accumulation cutoff
- **O** needs **level/elevation comparison** for partial cover — while **R** must *ignore* elevation entirely
- Multiple-targets needs **firing arcs**, hence torso facing ([[classic-hit-location-and-facing]])

An inches-based engine has none of these inputs. See [[engine-fit-assessment]].
