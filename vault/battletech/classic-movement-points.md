---
tags: [wargame-research, battletech]
source: https://static1.squarespace.com/static/5e5f11b6a6b48b3ae5c4ee36/t/5e69a64e3d430e6e35ad7fda/1583982189894/CAT3500D+BattleTech+A+Game+of+Armored+Combat+Rulebook.pdf
confidence: confirmed
---

# Movement Points — Budgets, Modes, Terrain Costs

Read from the Movement chapter (pp. 8–12) and the Movement Costs Table (p. 10) of CAT3500D *A Game of Armored Combat*, Catalyst's free official rulebook. Part of [[classic-battletech-mechanics]]; spatial context in [[hex-vs-inches-is-the-fault-line]].

**Movement is a budget spent hex-by-hex, not a distance measured.** This is the whole difference from Alpha Strike's `6"`.

## Scale (confirmed)

- One turn = **10 seconds** of real time
- One hex = **30 meters across** (~100 feet)
- A standard mapsheet = **18 × 22 inches** *(the scenarios chapter says 17" × 22" — the book is internally inconsistent here; the intro's 18 × 22 is on p. 3)*

## Movement modes (confirmed)

Every 'Mech is assigned **exactly one** movement mode per Movement Phase. The core tension, stated by the rules directly: more MP → harder to hit, but **more heat and worse own accuracy**.

| Mode | MP budget | To-hit as **attacker** | To-hit as **target** | Heat |
|---|---|---|---|---|
| **Standing Still** | none — may not spend *any* MP, not even to turn | **0** | **0** | **0** |
| **Walking** | up to **Walking MP** | **+1** | by hexes moved | **1** (total, not per hex) |
| **Running** | up to **Running MP** | **+2** | by hexes moved | **2** (total, not per hex) |
| **Jumping** | up to **Jumping MP** | **+3** | **+1**, *plus* hexes-moved modifier | **1 per hex jumped, min 3** |

**Running MP = Walking MP × 1.5, rounding up.** (Confirmed.) This is a **derived** value — if damage or heat reduces Walking MP, "the player must **recalculate** its Running MP rating." It is never stored independently.

This is exactly why [[megamek-mtf-unit-format]] stores only `walk mp:3` and `jump mp:0` — run MP isn't in the file because it's computable.

### Mode restrictions (confirmed)
- **Running:** cannot run **backward**. Cannot **enter** a Depth 1+ water hex while running (may change facing in one, or move *from* water to land).
- **Walking:** may move **backward**. May move forward, backward, or both in one phase. **Backward-moving 'Mechs may not change levels.** Walking is the **only** mode (besides standing still) available to a **one-legged** 'Mech.
- **Jumping:** only 'Mechs with Jumping MP that are **standing at the start of the turn**. Jumping **ignores facing** — "it can jump in any direction for the same MP cost, regardless of its initial facing, and when it lands it **chooses any facing** desired." A 'Mech loses **1 Jumping MP per jump jet destroyed**.

### Piloting Skill Rolls triggered by mode (confirmed)
- **Running** with a **gyro crit** or **hip crit** → PSR after movement to avoid falling.
- **Jumping** with a **lost leg, gyro crit, hip crit, or any leg actuator crit** → PSR **on landing** to avoid falling.

## Terrain and the Movement Costs Table (confirmed)

**Base rule: all hexes cost at least 1 MP to enter.** Terrain **adds** on top. The rulebook's own worked example: "entering a **Heavy Woods** hex costs **3 MP**: the base 1 MP for entering any hex (the distance traveled), and **2 MP more** for the Heavy Woods."

**Terrain cost when entering any new hex** (additive to the base 1):

| Terrain | Added MP | PSR? |
|---|---|---|
| Clear | +0 | — |
| Paved / Bridge | +0 | — |
| Road | +0 * | — |
| Rough | +1 | — |
| Light woods | +1 | — |
| Heavy woods | +2 | — |
| Water, Depth 1 | +1 ** | **−1** |
| Water, Depth 2+ | +3 ** | +0 (**+1 if Depth 3+**) |
| Rubble | +1 | +0 |

\* If travelling **along** the road; otherwise pay the cost of the underlying terrain.
\*\* MP cost to move along the **bottom** of the water hex. Level change MP is **not** included.

**Level change (up or down), charged separately and stacking with terrain:**

| Level change | Added MP |
|---|---|
| 1 level | **+1** |
| 2 levels | **+2** |

**Non-movement MP expenditures:**

| Action | MP |
|---|---|
| **Facing change** | **1 per hexside** |
| **Dropping to the ground** | **1** |
| **Standing up** | **2 per attempt** |

The PSR column is a **modifier to the Piloting Skill Roll**, not a yes/no — Depth 1 water is **−1** (easier), Depth 3+ water is **+1** (harder). "Difficult Terrain: Entering a hex containing certain terrain types **requires a Piloting Skill Roll** to see if the 'Mech falls."

## MP is spent on more than distance (confirmed)

This is the key structural point. A 'Mech's MP budget is consumed by, at minimum:

1. **Base hex entry** (1/hex)
2. **Terrain surcharge** (+0 to +3)
3. **Level change** (+1 or +2)
4. **Facing changes** (1/hexside — a 180° turn costs **3 MP**)
5. **Posture changes** (drop 1, stand 2/attempt)

So "Walking MP 3" is **not** "moves 3 hexes." It's a budget that a single heavy-woods hex plus one turn eats entirely. **Pathfinding must be a weighted graph search over (hex, facing) pairs** — not a radius. The facing component doubles the state space of the search: the same hex reached facing two different directions is two different nodes with two different costs.

## Minimum Movement (confirmed)

An escape valve for MP-starved 'Mechs: a 'Mech may move into the hex **directly in front of it** even without the MP normally required, if **all** of:
- it has **at least 1 MP** to spend
- it is not prohibited from entering the hex
- **that movement is the only MP it expends that turn** (it cannot change facing in the same turn)

It **must use running movement** to do this, and may thereby enter hexes running normally forbids (e.g. Depth 1+ water). A **prone** 'Mech with only 1 MP may use this rule for a single **stand-up attempt**.

## Standing still ≠ immobile (confirmed)

A deliberate distinction with real rules weight:

- **Immobile** (buildings, hexes, 'Mechs that are **shut down**, abandoned, missing all four limbs, or with an **unconscious** MechWarrior): attacks get a **−4 Target Number modifier** and may be **aimed shots**.
- **Not immobile** — explicitly: mobile 'Mechs *choosing* to stand still, **prone** 'Mechs, 'Mechs missing **two legs**, 'Mechs reduced to **0 MP** by actuator damage and/or heat, and 'Mechs with a **destroyed gyro**.

"Unless a situation specifically states the target is immobile, it is not." So a 'Mech at 0 MP from heat is *not* immobile and does *not* grant the −4 — heat degrades you ([[classic-heat-scale]]) but doesn't make you a sitting duck; **shutdown does**.

## Standing still as a tempo play (confirmed)

Assigning "stand still" to an immobile 'Mech **still consumes a movement selection**. The rules call this out as intentional tactics: "this is a good way to **put off assigning actions to your more useful mobile 'Mechs until later** in the initiative order." Under alternating activation ([[classic-battletech-mechanics]]), spending a selection on a useless unit buys information for your good ones.

## Movement dice (confirmed, optional-but-assumed)

Physical bookkeeping: white die = walked, black = ran, red = jumped, with the die's **number showing the Target Number modifier** the move generated ("6" traditionally = didn't move). "**The move cannot be changed once a movement die is placed.**" Removed after weapons fire.

Architecturally this confirms the movement modifier is a **turn-scoped, publicly-visible value** produced by the Movement Phase and consumed by the Weapon Attack Phase — a real piece of inter-phase state an engine must carry. See [[classic-to-hit-modifiers]].
