---
tags: [wargame-research, battletech]
source: https://web.archive.org/web/20250413081940/https://bg.battletech.com/wp-content/uploads/2019/12/Alpha%20Strike%20Quick%20Start%20Rules%208-29-19c.pdf
confidence: confirmed
---

# Engine Fit Assessment — Does BattleTech Belong in This Engine?

**The question:** does BattleTech fit a Foundry engine designed for **paper-sized, inches-based, alternating-activation skirmish games**?

**The short answer:** Alpha Strike is a **near-fit with one real refactor**. Classic is a **different game architecture wearing the same IP**. They should not be treated as two profiles of one system.

Sources: *Alpha Strike Quick Start Rules* (Commander's Edition Update, 2019 — free official Catalyst PDF, via Wayback since battletech.com now 500s on it) and *A Game of Armored Combat* (CAT3500D — free official Catalyst PDF). Both **confirmed by reading**. Builds on [[hex-vs-inches-is-the-fault-line]] — the spatial argument lives there and isn't repeated.

---

## The finding that reframes the question

The engine's assumed loop is **unit activation**: *unit activates → moves → shoots → resolved → next unit*.

**Neither BattleTech is that game.** Both are **phase-structured** ([[classic-phase-activation-vs-unit-activation]]):

| | Alpha Strike (confirmed) | Classic (confirmed) |
|---|---|---|
| Phases | **4**: Initiative, Movement, Combat, End | **6**: Initiative, Movement, Weapon Attack, Physical Attack, Heat, End |
| Initiative | 2D6/side, re-roll ties, **winner acts last** | 2D6/side, re-roll ties, **winner acts last** |
| Movement | **Alternating** per unit, loser first | **Alternating** per unit, loser first |
| Combat | **Not alternating** — loser resolves *all* his units, then winner | **Alternating declaration**, then **alternating resolution** |
| Damage timing | Applied immediately, **effects deferred to End Phase** | Resolved in-phase, **sequentially, one hit at a time** |

So the "alternating activation" box the engine ticks is only ever **half-true**, even for Alpha Strike. Movement alternates per-unit; combat does not. **All units move before any unit shoots — in both games.**

This is not a detail. It's why initiative *means* something here: the rules say the winner "executes unit movement and combat actions **after** the player(s) with the lower Initiative roll. This **simulates a greater awareness of the tactical situation**." Fusing move+shoot into one activation deletes that.

---

## Alpha Strike: fits well, with one structural change

### What drops in free (confirmed)
- **Inches.** "This value is the maximum number of **inches** the unit may move." Tape measure, any direction, "may face in any direction" at end of move. Flexible-measure indirect paths explicitly allowed. Exactly the engine's native model.
- **One damage number.** No hit location table at all. Damage Value per range bracket **S (+0) / M (+2) / L (+4)**, applied to **armor bubbles**, then **structure bubbles**; all structure gone = destroyed.
- **Flat to-hit.** Base = **Skill Rating**; attacker Standstill **−1** / Ground **+0** / Jumping **+2**; target **TMM** (a single precomputed stat on the card), Jumping **TMM+1**, Immobile **−4**; range Short (up to 6") **+0** / Medium **+2** / Long **+4**; Woods **+1**, Partial Cover **+1**. All cumulative. This is an ordinary modifier stack.
- **Trivial heat.** Overheat Value: voluntarily add damage in exchange for equal heat. A **4-box scale (1, 2, 3, S)** — shut down at 4. That's a small integer with one threshold, not [[classic-heat-scale]].
- **Minimum movement.** Always 2 inches regardless of terrain.
- **TMM is a stat, not a computation.** The card carries it. No path tracking.

### Where it strains
1. **The Combat Phase isn't per-unit.** "Rather than alternating actions—this player **declares and resolves all of his units' combat actions** at this time, followed by the Initiative winner." A per-unit activation loop can't express this.
2. **Deferred damage effects.** "Damage from these attacks is resolved **immediately, but the effects do not take place until the turn's End Phase**. This means that **a destroyed unit will normally have a chance to return fire**." An engine that removes a casualty on resolution gets this wrong, and it's a rule players will notice instantly.
3. **Facing exists — front/rear.** "'Mech units are considered to be facing the same way as the **feet of the miniature**," and facing "**affects combat resolution**" and "can only be voluntarily changed during the Movement Phase." Attack direction is geometric: straightedge base-center to base-center; **if it enters through the rear hexside of the target's base, it's a rear attack** — which is **+1 damage**. (Note: AS *bases* have hexsides. The hex never fully leaves.) Ties → **target chooses**.
4. **Deployment zone is measured** ("within 10 inches of the home edge") and units may not share a space regardless of elevation.

**Verdict: Alpha Strike is the early target.** Four of five subsystems are simpler than a typical skirmish game. The cost of entry is **a phase-loop with a declaration/effect barrier** and **a binary facing flag with a rear-arc test**. Both are worth building anyway — they're the honest shape of the genre, not BattleTech exotica.

---

## Classic: a different architecture

Classic needs **every** subsystem the engine doesn't have, and needs them **load-bearing in damage resolution** rather than as modifiers:

| Subsystem | What Classic demands | Engine has |
|---|---|---|
| **Space** | Hex grid, 30m/hex, discrete | Inches, continuous |
| **Facing** | **6 hexsides**, feet + torso tracked **separately**, plus arm-flip flag ([[classic-hit-location-and-facing]]) | None / binary at best |
| **Movement** | MP budget over a **weighted (hex, facing) graph** — terrain +0..+3, level change +1/+2, **facing 1 MP/hexside**, stand 2, drop 1 ([[classic-movement-points]]) | "Move up to N inches" |
| **Hit resolution** | Bearing → attack direction → **column of a hit location table** → 2D6 → location → **front vs rear armor facing** | One damage number |
| **Damage model** | **8 locations**, per-location armor + rear armor, internal structure, **12 crit slots per location**, damage transfer graph | Two bubble tracks |
| **Heat** | 0–30 + overflow, **four independent non-cumulative threshold tracks**, its own phase ([[classic-heat-scale]]) | 4 boxes |
| **To-hit inputs** | Path-dependent TMM, hex-by-hex intervening terrain w/ **+2 = LOS blocked**, elevation for cover but **not** for range ([[classic-to-hit-modifiers]]) | Distance + flat mods |
| **Turn loop** | **6 phases**, declaration lock, sequential per-hit resolution | Unit activation |

### The three that are genuinely hard

1. **Hit location is not a modifier — it's a pipeline into damage.** Seven chained steps from hex geometry to a specific armor facing on a specific location. There is no seam in an inches-based engine to attach this to, because the engine's damage model has no *locations*.

2. **TMM is path-dependent, so paths must be recorded.** The modifier keys off **hexes traversed**, not MP spent, and the reversal rule ("base the TMM on hexes moved from the hex in which the 'Mech last reversed") proves start/end position is insufficient. The engine must store the actual route walked — a thing inches-based engines throw away.

3. **Defender decisions mid-resolution.** Classic repeatedly resolves geometric ties by **asking the non-active player**: attack direction crossing a hexside intersection, LOS passing exactly between two hexes, partial cover ambiguity — all "the target chooses," *before* the attacker rolls. **Attack resolution cannot be a pure function.** It must be able to suspend and prompt. (Alpha Strike inherits a small version of this in its rear-arc tie rule.)

### What's *not* as bad as it looks
- **GATOR itself is trivial** — a flat additive stack. The difficulty is its inputs, not its arithmetic.
- **Foundry supports hex grids natively**, so rendering is solved ([[hex-vs-inches-is-the-fault-line]]).
- **The data exists and is machine-readable.** [[megamek-mtf-unit-format]] already encodes per-location armor, rear armor, crit slots, heat sinks. You are not transcribing anything by hand.
- **MegaMek is a working reference implementation** of every rule here — an oracle for behavior, not just data.

**Verdict: Classic is the late stress test.** It is a *good* stress test precisely because it breaks the engine's assumptions in **orthogonal directions** (space, facing, damage granularity, resource simulation, control flow) rather than piling onto one. An engine that can host Classic can host almost anything. But it is not a "supported system" you reach by adding features — it's a hex/facing/location subsystem the engine currently has no concept of.

---

## Recommendation

1. **Alpha Strike early.** Take it as the forcing function for the **phase loop + deferred-effects barrier + minimal facing**. These are the corrections that make the engine *more* honest about the skirmish genre generally — most of these games are more phase-structured than a naive activation loop admits. AS pays for itself.
2. **Classic late, and only deliberately.** Not "Alpha Strike with a hex setting." Budget it as a **spatial/damage subsystem**, and use it to answer *"is our core extensible or merely configurable?"*
3. **Do not model them as one system with a toggle.** The [[hex-vs-inches-is-the-fault-line]] argument is decisive: they don't share a spatial model, a damage model, a heat model, or a turn structure. The **only** thing they share is the unit roster — and even that is two datasets joined by `mul id` ([[megamek-mtf-unit-format]]).

## Honest uncertainties

- **Scope of the free rulesets.** Both PDFs are *introductory* subsets. *Total Warfare* and *Alpha Strike: Commander's Edition* add rules (non-'Mech unit types, advanced terrain, artillery, aerospace) that could raise the ceiling — **not lowered here, but not surveyed**. Nothing read suggests the *core* structures above change.
- **Effort estimates: none given.** No basis to size the work in hours without seeing the engine's actual internals. This note assesses **shape of fit**, not cost.
- **The engine itself was not inspected.** Every claim about "the engine" is taken from the brief's framing (paper-sized, inches-based, alternating-activation). If the engine already has a phase loop or a facing concept, the Alpha Strike verdict gets better and the Classic verdict moves only slightly.
