# Full Thrust — rule coverage ledger

Every mechanic of *Full Thrust* (Jon Tuffley / Ground Zero Games), mapped to where it is
implemented or to an explicit, honest deferral. Edition baseline is **FT2 core** (a superset of
Full Thrust Light); where FTL and FT2 disagree we take FT2 (notably the threshold check rolls
HIGH). ✅ = implemented + unit-tested; 🟡 = primitive built, full UI/session deferred; ⏳ =
deferred. Nothing is silently missing.

> [!note] The combat/movement logic is wired into the bundle.
> `main.ts` registers a **"Full Thrust" scene control** (`ui/round-control.ts`) whose Fire and
> Plot tools reach the firing pipeline, threshold check, and movement-order logic, so none of it
> is tree-shaken (`dist/full-thrust.js` grew from ~7.5 kB, data-model+sheet only, to ~31 kB / 21
> modules). The orchestration is unit-tested with injected engine services; the **scene-control
> payload shape, the controlled/targeted-token reads, the sheet render, and the DialogV2 order
> prompt are UNVERIFIED against a live Foundry v14** — a GM playing a turn in a real world is the
> remaining check.

## Engine addition (generic, ships in `packages/battleframe/src`)
| Capability | Status | Where |
|---|---|---|
| Facing / bearing geometry (`game.battleframe.facing`) — numeric bearing, ruleset buckets arcs | ✅ | `measurement/facing.ts` (`facingOf`, `absoluteBearing`, `bearingOf`) |

## Sequence of Play
| Rule | Status | Where |
|---|---|---|
| Order plotting → movement → weapons fire | 🟡 | Phases modelled; a single guided end-to-end turn UI is deferred |
| Secret order plotting, then simultaneous reveal | ✅ | Plot tool stores the order on an owner/GM-only actor flag (token does not move) with a live local path preview; "Execute Maneuvers" (GM) reveals + runs all plotted moves at once. `ui/round-control.ts`, `ui/preview-overlay.ts`, `movement/preview.ts` |
| Plotting-secrecy safeguard | ✅ | `ui/ownership-warning.ts` warns when a ship's ownership is changed so 2+ players can observe it (an opponent could then read the plotted order) |
| Fleet import (bring-your-own-data) | ✅ | "Import Fleet" tool + `data/fleet-import.ts` `parseFleet` turn a JSON fleet into player-owned ship Actors (see FLEET-FORMAT.md). Gated by Foundry's "Create New Actors" permission |
| Fire phase: initiative (highest), winner fires one ship, strict alternation | ✅ | `round/fire-phase.ts` logic, **wired** via `round/fire-session.ts` + the "Begin Fire Phase" scene tool; the Fire tool enforces active-side/eligibility and advances alternation, phase state persisted to a Document |
| Damage applied immediately; threshold check after each attacker | ✅ | `combat/apply-damage.ts` |

## Movement (cinematic)
| Rule | Status | Where |
|---|---|---|
| Course = 12-point clockface; ship faces its heading | ✅ | `movement/orders.ts`, token rotated to course |
| Order notation `+N/-N/PN/SN`; no reverse | ✅ | `movement/orders.ts` `parseOrder` |
| Thrust budget: total ≤ thrust, turning ≤ half (rounded up) | ✅ | `movement/orders.ts` `applyOrder`, `turningCap` |
| Pivot-move-pivot-move curved path executed on canvas | ✅ | `movement/path.ts` `plotMovementPath` (verified vs both worked examples) + `ui/round-control.ts` `executeMovementPath` traces the two half-moves + pivots |
| Vector movement (optional FT2 system) | 🟡 | `movement/vector.ts` pure library: persistent `{vx,vy}` velocity, `advance` (move by vector), `applyMainDrive` (burn along facing), `applyPush`/`rotateFacing` (manoeuvring thrusters = ½ rating rounded DOWN), `resolveTurn` (advance-then-fold, written order matters), `parseVectorOrder`/`checkManoeuvres` budgets, `nearestCourse`/`velocityMagnitude` for marker realignment. Hand-verified in `tests/vector.test.ts`. The Vector-mode scene tool / token advance is DEFERRED to an orchestrator (as with cinematic `path.ts`) |
| Measurement to/from stand centre | ✅ | core `measure.between(..., "centre-to-centre")` |

## Fire Arcs
| Rule | Status | Where |
|---|---|---|
| 6 × 60° arcs (F, FS, AS, A, AP, FP), weapon must bear | ✅ | `combat/arcs.ts` over the engine bearing |
| Pre-fire targeting preview (which weapons bear + range band, no roll) | ✅ | `combat/targeting.ts` `previewTargeting` (mirrors `resolveWeaponFire` precedence) + a player-visible "Check Targeting" tool whispering `buildTargetingReportHtml` |

## Weapons
| Rule | Status | Where |
|---|---|---|
| Beam batteries: class dice by 12mu band, pool damage | ✅ | `combat/beam.ts`, `combat/fire.ts` |
| Pulse torpedoes: to-hit by band (2+…6), damage die, ignore screens | ✅ | `combat/weapons.ts`, `combat/fire.ts` |
| Submunition packs: dice by band, ignore screens, one-shot | ✅ | `combat/weapons.ts`, `combat/fire.ts` |
| Needle beams: 9mu, knock a nominated system on a 6, ignore screens/armour | ✅ | `combat/needle.ts` `fireNeedleAtSystem` + "Needle Beam" scene tool with a system-type picker |
| Salvo missiles: salvo of 6, PDS interception, per-missile damage | ✅ | `combat/salvo.ts` `resolveSalvoAtTarget` + "salvo" weapon kind + "Fire Salvo" tool (direct-target; point-of-aim counter deferred) |
| Independent (More Thrust) missiles: one-shot craft, own phase, 18mu + mid-point 2-pt turn, 3-turn life, strike ≤6mu & not in rear arc, PDS kills on a 6, Normal warhead 2d6 (ignores screens) | 🟡 | `combat/missile.ts` `missileCanAttack`/`resolveMissileAttack` + `movement/missile-path.ts` `plotMissilePath` (pure + tested). Missile-phase launch/track/remove-after-3-turns UI (a Foundry token orchestrator) deferred; EMP/Needle warheads not yet modelled |
| Spinal-mount Nova Cannon: 3-turn forward sweep (6/4/2 D6, 2"/4"/6" template), damage = die score, screens ignored | 🟡 | `combat/spinal.ts` `novaCannonDamage`/`novaCannonDiceForTurn`/`novaCannonTemplateInches`/`novaCannonSweep` (pure math + tests); template geometry, arming bookkeeping, and a scene tool deferred |
| Wave Gun: 36mu expanding template (4/3/2 D6, 2"/3"/4"), charge-then-fire, knock-out feedback, damage = die score, screens/armour ignored | 🟡 | `combat/spinal.ts` `waveGunDamage`/`waveGunDiceAtRange`/`waveGunTemplateInches`/`waveGunIsCharged`/`waveGunChargeAfterTurn`/`waveGunChargeAfterFiring`/`waveGunFeedbackDamage` (pure math + tests); template geometry, charge state on a Document, and a scene tool deferred |
| K-guns / xeno (Kra'Vak / Sa'Vasku / Phalon) weapons | ⏳ | Not yet built |

## Defences
| Rule | Status | Where |
|---|---|---|
| Screens (level 1–3) downgrade each beam die | ✅ | `combat/beam.ts` `beamDamageForFace` |
| Armour absorbs point-for-point before hull | ✅ | `ship/damage.ts` `applyDamageWithArmour` |
| Fire control: lost all FCS = cannot fire | ✅ | `combat/fire-ship.ts` refuses fire (`refused: "no-fcs"`) when `fcs < 1` |
| Fire control: 1 FCS = 1 target / multi-FCS fire-splitting | 🟡 | `combat/fcs-allocation.ts` `allocateFcsFire`/`validateAllocation` split weapons across ≤ N targets (N = working FCS), reusing `previewTargeting` for bears/range (pure + tested); the scene-tool wiring is deferred |
| Point defence (PDAF/ADAF) vs fighters and missiles | 🟡 | `combat/fighters.ts` (math); PDS interception step in the fire UI deferred |

## Damage
| Rule | Status | Where |
|---|---|---|
| Hull boxes in rows; fill order; destroyed when all gone | ✅ | `ship/hull.ts` |
| Threshold check on row completion (FT2 rolls high 6/5-6/4-6) | ✅ | `ship/threshold.ts`, `ship/systems.ts` |
| Multi-threshold in one attack: worst reached, worsened per extra | ✅ | `ship/threshold.ts` `thresholdKillOn` |
| Drives special (half then dead) | ✅ | `ship/systems.ts` + `driveCrippled` field: first hit halves thrust, second kills |
| Damage control (More Thrust end-of-turn repair) | ✅ | `combat/damage-control.ts` `resolveDamageControl` (priority repair) + a "Damage Control" GM tool. Enabled by the design+damage model (systems keep their design count + a lost/driveHits counter) |
| Fleet Book 1 — reroll / penetrating damage (a 6 scores + rerolls, chaining) | 🟡 | `ship/fleet-book.ts` `poolPenetratingDamage` (opt-in; reroll die scores on the unscreened table, no cap; screens hit only the initial dice) — pure + tested, not on the default combat path |
| Fleet Book 1 — armour bypass (penetrating hits go direct to hull) | 🟡 | `ship/fleet-book.ts` `applyDamageBypassingArmour` / `applyPenetratingDamageWithArmour` (normal spends armour then overflows, penetrating goes direct) — pure + tested |
| Fleet Book 1 — Core Systems +1 (buried systems one step tougher at threshold) | 🟡 | `ship/fleet-book.ts` `coreThresholdKillOn` / `knockedOutIndicesWithCore` (1st threshold → core immune on a d6); `CORE_SYSTEM_THRESHOLD_BONUS` — pure + tested |

## Fighters
| Rule | Status | Where |
|---|---|---|
| Fighter group (1–6), type, endurance, morale | ✅ | `data/fighter-group.ts` + sheet |
| Attack a ship in fore arc within 6mu; die per fighter; screens apply | ✅ | `combat/fire-fighters.ts` |
| Morale roll (depleted group), endurance spend, Attack-type +1/die | ✅ | wired into `combat/fire-fighters.ts` (aborts on failed morale, spends endurance on a fired attack) |
| Morale broken (3 consecutive fails → disengage) + out-of-fuel exhaustion | ✅ | `combat/fire-fighters.ts` tracks `moraleFails`; a broken or endurance-0 group refuses to attack |
| PDS thins the group before it strikes | ✅ | `combat/fire-fighters.ts` rolls the target's PDS first (`pdsKillsVsFighters`); casualties persist; a fully-killed group makes no attack |
| Dogfights (fighter vs fighter) | ✅ | `combat/dogfight.ts` `resolveDogfight` (6mu fore arc, simultaneous, defender returns fire if it bears); the Fire tool dispatches it when both are fighter groups |
| PDS vs missiles | ✅ | `combat/fighters.ts` `pdsKillsVsMissiles` (a 6 kills), consumed by `combat/salvo.ts` (salvo) and `combat/missile.ts` (independent missiles) |
| Specialised types: Heavy (screen), Interceptor (+1/die dogfight), Long-range (endurance 5) | ✅ | `combat/fighters.ts` `dogfightKillsAgainst`/`enduranceForType`, applied in `combat/dogfight.ts` |
| Specialised types: Fast (18mu) / Torpedo (one-shot run, spent-mode dogfight) | 🟡 | `combat/fighter-types.ts` `fighterMoveForType`/`torpedoHitCount`/`torpedoRunDamage`/`attackFighterDogfightKills` (pure + tested); the token movement + spent-marking orchestrator is deferred |
| Pilot quality: Ace / Turkey / average (attack, morale, dogfight, initiative) | 🟡 | `combat/pilot.ts` (1D6/group: 6=Ace, 1=Turkey; Ace +1 attack die & −1 morale, Turkey +1 morale, breaks on 2 fails, −1 dogfight die; ±1 initiative/group) — pure + tested; surfacing in the fighter fire/dogfight UI deferred |
| Carrier launch/recover | ⏳ | Not yet built |

## Ship Design
| Rule | Status | Where |
|---|---|---|
| FT2 Mass/Points: hull, drives, FCS, batteries, systems | ✅ | `ship/design.ts` (verified vs worked example → 267 pts); `shipPointsFromSystem` derives a ship's Points from its live systems, shown on the sheet |
| Fleet Book variable-hull design system | ⏳ | Not modelled (not balance-compatible with FT2) |

## Status effects (Foundry-native)
| Rule | Status | Where |
|---|---|---|
| Destroyed → native `defeated` (skull, syncs, drops from turn order) | ✅ | `data/ship-state.ts` |
| Crippled (drives dead) + weapons-offline (no FCS) → status icons | ✅ | `src/status.ts` registers them; `syncShipStatuses` toggles after damage/threshold |
| Hull remaining shown on token hover | ✅ | ship `prepareDerivedData` `hullTrack` + hover field |
