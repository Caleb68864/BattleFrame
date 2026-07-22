---
date: 2026-07-22
status: living
audience: Full Thrust ruleset maintainers
---

# Roadmap — Full Thrust ruleset (`battleframe-full-thrust`)

Gaps and QoL work outstanding after the initial build + hardening/polish passes. Derived
from an audit of what is **wired and reachable** vs. **tested-but-dormant** vs. **not built**.
See `COVERAGE.md` for the rule-by-rule ledger and `docs/decisions.md` for history.

Legend: **[wire]** = math built & tested, needs a UI/orchestrator to become playable ·
**[build]** = needs new logic too · **[qol]** = usability · **[verify]** = built but never run
in a live Foundry.

## P0 — Playability blockers (logic exists, nothing calls it)

1. ~~**[wire] Fire-phase turn order.**~~ ✅ **DONE 2026-07-22.** "Begin Fire Phase" tool
   (`beginFirePhaseAction`) rolls initiative (die per side, re-roll ties) and persists the phase
   to a Document (active Combat, else Scene) via `round/fire-session.ts`; the Fire tool enforces
   active-side + eligibility (`canShipFire`) and advances strict alternation after each ship
   fires, auto-clearing when complete. Sides = token disposition. (Still to layer on: a visible
   phase/turn tracker, and #18 multi-FCS split.)
2. ~~**[wire] PDS / anti-fighter interception.**~~ ✅ **DONE 2026-07-22 (fighter path).** The
   target's PDS now fires first in `combat/fire-fighters.ts`: rolls `pds` dice, `pdsKillsVsFighters`
   removes fighters (casualties persist to the group), and a group shot down entirely makes no
   attack (`reason: "shot-down"`); the chat card reports the kills. **Still pending:**
   `pdsKillsVsMissiles` against missiles — waits on the missile/salvo flow (#4/#15).
3. ~~**[wire] Needle beams.**~~ ✅ **DONE 2026-07-22.** `combat/needle.ts` `fireNeedleAtSystem`
   (9mu + arc, roll, knock out a nominated surviving system on a 6, ignores screens/armour) +
   a "Needle Beam" scene tool with a system-type picker. Core unit-tested; the picker dialog is
   live-unverified.
4. ~~**[wire] Salvo missiles.**~~ ✅ **DONE 2026-07-22.** `combat/salvo.ts` `resolveSalvoAtTarget`
   (roll on-target → target PDS intercepts → survivors each roll damage; screens don't reduce,
   armour absorbs) + a "salvo" weapon kind + a "Fire Salvo" scene tool. SIMPLIFICATION: resolves
   directly against a chosen target within 24mu; the point-of-aim-counter + movement-prediction
   step is deferred (the combat resolution itself is faithful).
5. ~~**[wire] Damage control.**~~ ✅ **DONE 2026-07-22.** Enabled by the design+damage-counter
   refactor (systems track a design count + a `…Lost`/`driveHits` damage counter, remaining =
   design − damage, mirroring hull). `resolveDamageControl` restores knocked-out systems in
   priority order (fcs → drive → weapon → screen → pds); a "Damage Control" GM tool rolls each
   ship's DCPs and applies repairs + status sync.
6. ~~**[wire] Ship-design points.**~~ ✅ **DONE 2026-07-22.** `shipPointsFromSystem` maps a ship's
   live systems onto a `DesignSpec` and runs `designPoints` (reproduces the worked example, 267);
   `prepareDerivedData` populates `pointsValue`, shown on the sheet, plus a new `ftl` field. (A
   full interactive *design builder* app is still a possible future, but you now see any ship's
   Points and can build via the editable sheet + import.)

## P1 — QoL / UX

7. ~~**[qol] Editable-weapons sheet.**~~ ✅ **DONE 2026-07-22.** The ship sheet now has Add/Remove
   weapon buttons (ApplicationV2 `actions` → `addWeaponTo`/`removeWeaponAt`) and per-weapon kind
   (select), class (number), and arc (multi-select) editing. Pure array ops + `prepareWeaponRows`
   are tested; the ApplicationV2 action wiring + the `system.weapons.N.arcs` multi-select form
   binding want live-Foundry verification.
8. ~~**[qol] Hull damage on the hover panel.**~~ ✅ **DONE 2026-07-22.** The ship's
   `prepareDerivedData` computes a `hullTrack` "remaining/total" string, registered as the first
   hover field.
9. ~~**[qol] Battlefield status icons.**~~ ✅ **DONE 2026-07-22.** `src/status.ts` registers
   `crippled` (thrust 0) + `weapons-offline` (fcs 0) on `CONFIG.statusEffects`; `syncShipStatuses`
   toggles them after every damage/threshold resolution.
10. **[qol] Visual SSD** — 🟡 PARTIAL: the sheet + hover show "remaining/design" tracks for hull,
    thrust, FCS, screens, PDS, and (2026-07-22, live-verified) a **clickable hull damage track**
    (`prepareHullBoxes` + `onToggleHullBox`) with FT2 threshold-row separators replaces the bare
    number input. The **arc/range diagram** is delivered as an on-canvas fire-arc ring overlay on
    the token (`ui/arc-overlay.ts`, live-verified — 6 labelled arcs + beam rings, hover + "Fire
    Arcs" pin tool). Clickable ARMOUR boxes now match the hull track
    (`prepareArmourBoxes`/`onToggleArmourBox`). Still to do: clickable pips for the design-count
    systems (FCS/PDS/screens — deferred; their damage counter has no sheet fallback yet).
11. ~~**[qol] Pre-fire targeting feedback.**~~ ✅ **DONE 2026-07-22.** `combat/targeting.ts`
    `previewTargeting` returns a per-weapon row (bears? / in-range? / dice or to-hit) WITHOUT
    rolling, mirroring `resolveWeaponFire`'s precedence exactly so it never disagrees with the
    actual shot; a "Check Targeting" scene tool (player-visible, whispered card via
    `buildTargetingReportHtml`) shows which weapons bear + their range band before you commit.
    Pure core + HTML builder unit-tested; the scene-tool click is live-unverified.
12. **[qol]** 🟡 PARTIAL: a "New Turn" GM tool clears leftover plots + ends the fire phase
    (`newTurnAction`), and (2026-07-22, live-verified) a **visible fire-phase turn tracker** —
    `firePhaseStatusLine`/`sideLabel` post a persistent "Friendly/Hostile to fire — N ships left"
    chat card on begin + each activation, plus a "Phase Status" tool to re-post on demand. Still to
    do: fully localized chat cards. **"New Battle" reset DONE (2026-07-22)** — a GM tool (with a
    confirm) restores every ship's damage + clears plots/fire phase/in-flight missiles.
13. ~~**[qol] Friendlier plot entry.**~~ ✅ **DONE 2026-07-22.** The Plot dialog gains thrust +/-
    steppers and P2/P1/0/S1/S2 turn buttons that build the `+4,P2` order string into the still-
    editable raw input, with the live path preview updating as you click.

## P2 — Advanced rules (need new math)

14. **[build] Fighter operations** — 🟡 PARTIAL (2026-07-22). Pilot quality (Ace/Turkey/average)
    now in `combat/pilot.ts` (1D6/group; Ace +1 attack die & −1 morale, Turkey +1 morale / breaks
    on 2 fails / −1 dogfight die; ±1 initiative per Ace/Turkey), and the remaining specialised
    types Fast (18mu) + Torpedo (one-shot run + spent-mode dogfight) in `combat/fighter-types.ts`
    (Heavy/Interceptor/Long-range already done). Pilot quality is now WIRED into `fire-fighters.ts`
    (Ace +1 attack die, Ace/Turkey morale mods, Turkey 2-fail break) and `dogfight.ts` (Turkey −1
    die, Ace extra die), with an optional `pilotQuality` field on the fighter-group model + sheet.
    Carrier operations now have a pure core `combat/carrier.ts` (`bayCapacity`/`launchLimit`/
    `canLaunch`/`canRecover`/`enduranceAfterTurn`/`mustReturn`/`isLost`/`recover` — bay capacity by
    class, 2 groups/turn launch, 1/turn recover, endurance depletion + return-or-lost; +16 tests).
    Still to do: the Foundry orchestrator that launches/recovers fighter-group tokens, and a fighter
    MOVEMENT orchestrator that uses `fighterMoveForType` (#16).
15. **[build] Independent (More Thrust) missiles** — 🟡 PARTIAL (2026-07-22). Pure combat +
    movement built + tested: `movement/missile-path.ts` `plotMissilePath` (18mu with one mid-point
    2-point turn) and `combat/missile.ts` `missileCanAttack` (≤6mu, not in the missile's rear arc)
    + `resolveMissileAttack` (target PDS kills on a 6 via `pdsKillsVsMissiles`; surviving missile
    detonates a Normal warhead — 2d6 total, screens ignored, armour absorbs). The **EMP and Needle
    warhead variants** are now built too (`combat/missile.ts` `resolveMissileAttack` takes a
    `warhead` param: EMP scrambles systems via a screen-reduced effect die, Needle snipes a
    nominated system — both pure + tested). Still to do: the dedicated missile-phase launch + a
    Foundry token orchestrator that moves/tracks the craft and removes it after the 3-turn life.
    ✅ **DONE 2026-07-22 (live-verified).** The missile PHASE is built: `combat/missile-phase.ts`
    (`advanceMissile`/`missileExpired`) + `ui/missile-overlay.ts` (PIXI markers) + a "Launch
    Missile" and "Missile Phase" scene tool. Missiles are scene-flag state drawn as markers; a
    synthetic token-like object lets `resolveMissileAttack` strike a real ship. Live-verified: launch
    → advance 18mu → strike a ship in the fore arc (Normal warhead, damage + threshold + destroy) →
    removed. Remaining: an EMP/Needle warhead + mid-turn picker (Normal only for now).
16. ~~**[build] Fighter movement + dogfights.**~~ ✅ **DONE 2026-07-22 (live-verified).** Dogfights
    wired (`resolveDogfight` + Fire tool); fighter MOVEMENT via `movement/fighter-move.ts` core +
    a "Move Fighters" tool (`fighterMoveAction`) that advances the controlled group toward the
    targeted ship up to its allowance (12/18mu Fast), stopping at the 6mu strike edge. Live-verified
    (a Fast group moved exactly 18mu toward a ship).
17. **[build] Vector movement** (optional FT2 mode) — 🟡 PARTIAL (2026-07-22). `movement/vector.ts`
    pure library: persistent `{vx,vy}` velocity, `advance`/`applyMainDrive` (burn along facing),
    `applyPush`/`rotateFacing` (manoeuvring thrusters = ½ rating rounded DOWN), `resolveTurn`
    (advance-then-fold, written order matters), `parseVectorOrder`/`checkManoeuvres` budgets,
    `nearestCourse`/`velocityMagnitude` for marker realignment (+16 tests). Still to do: a
    Vector-mode scene tool + token advance/rotate orchestrator (as cinematic `path.ts` defers to
    `ui/round-control`).
18. ~~**[build] Multi-FCS fire-splitting.**~~ ✅ **DONE 2026-07-22 (live-verified).**
    `combat/fcs-allocation.ts` `allocateFcsFire` (greedy caller-priority, one weapon's dice never
    split) + `combat/fire-ship-split.ts` `fireShipSplit` orchestrator + a GM "Split Fire" scene
    tool that reads every targeted ship and fires the split in one action, posting a per-target
    card. Live-verified in Foundry (2 FCS: per-target damage + threshold, targets Set read, zero
    errors). The greedy allocation concentrates fire; an explicit per-weapon target-picker UI is a
    possible future refinement.
19. **[build] Fleet Book optional layers** — 🟡 PARTIAL (2026-07-22). `ship/fleet-book.ts` adds the
    three damage layers — reroll/penetrating damage (chaining 6s), armour bypass (direct-to-hull),
    core-systems +1. **Conditional aft fire** (`combat/aft-fire.ts` — all-round turrets fire aft
    only on a no-main-thrust turn) and the **variable-hull design system** (`ship/variable-hull.ts`
    — 10–50%-of-mass hull grades, cost = 2×boxes, 4-row layout; verified vs the notes' worked
    example) are now built too, all pure + tested (+42 tests total). Still deferred: Needle-Beam
    core immunity, Enhanced Pulse Torpedo split, Fleet Book PDS reroll, and wiring these opt-in
    layers into the live combat/design path (a world setting + branch).
20. **[build] Big/xeno weapons** — 🟡 PARTIAL (2026-07-22). `combat/spinal.ts` implements the
    spinal-mount Nova Cannon (3-turn forward sweep, 6/4/2 D6, 2"/4"/6" template) and the More
    Thrust Wave Gun (36mu expanding template, 4/3/2 D6, charge-then-fire + knock-out feedback) as
    pure math (+22 tests); damage = die score, screens ignored. Still to do: template canvas
    geometry. **Spinal scene tools DONE (2026-07-22, live-verified)** — "Nova Cannon" + "Wave Gun"
    GM tools fire (direct-target, like salvo) via `resolveSpinalWeapon`: dice by turn/range, damage
    applied + threshold, card posted (verified: Wave 16dmg + Nova 24dmg destroyed a ship). Deferred:
    the swept/expanding MeasuredTemplate, the Nova 3-turn sweep, the Wave Gun charge cycle.
    **All three xeno races are now built (pure math):** `combat/kravak.ts` (K-gun/MKP/scattergun/K-1
    PD, +18), `combat/savasku.ts` (bio power-points, stinger/lance/leech pods, biomass, regen, +25),
    `combat/phalon.ts` (plasma bolts + multi-layer shell, +27). Still to do: wiring the xeno weapons
    as fireable weapon-kinds + their ship design/damage models into the sheet/combat path.

## P3 — Live-verification debt

The pure logic is unit-tested; these UI shells need a real Foundry v14 world: scene-control
payload shape, sheet render, both DialogV2 prompts (plot + import), the **PIXI preview overlay**,
token move/rotate, the ownership-warning dialog, actor creation.

## Engine-extraction findings (move functionality module → engine)

Surfaced in `docs/plans/2026-07-22-full-thrust-engine-extraction-findings.md` (per the guide,
engine changes are design findings, not quiet patches):
1. **Adopt the engine's activation order** — the module reimplements `game.battleframe.rounds`
   (strict alternation). Two-witness bar MET (InCountry already consumes it). Best first win.
2. **Engine status-effect register helper** — InCountry + Full Thrust duplicate the
   CONFIG.statusEffects push. Two witnesses. Small, neutral.
3. **Engine outcome chat-card helper** (`escapeHtml` + `card`) — known gap in
   roadmap-foundry-integration; pair with a second ruleset's chat work.

## Recommended order

Wire **#2 (PDS)** and **#1 (fire-phase order)** first — they make already-tested code play. Then
**#7 (editable weapons)** and **#8/#9 (hull hover + status icons)** for the biggest day-one
usability wins.
