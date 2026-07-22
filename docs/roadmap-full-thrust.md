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
10. **[qol] Visual SSD** — 🟡 PARTIAL: the sheet + hover now show "remaining/design" tracks for
    hull, thrust, FCS, screens, PDS (design+damage model). Still to do: clickable damage boxes
    and an arc/range diagram instead of number inputs.
11. **[qol] Pre-fire targeting feedback** — show which weapons bear + the range band before
    committing (arc/range math already exists); today you learn "out of arc" only after firing.
12. **[qol]** 🟡 PARTIAL: a "New Turn" GM tool clears leftover plots + ends the fire phase
    (`newTurnAction`). Still to do: a visible turn/phase tracker, a full "New Battle" reset, and
    localized chat cards.
13. **[qol] Friendlier plot entry** (click-to-set thrust/turn) alongside the raw `+4,P2` text.

## P2 — Advanced rules (need new math)

14. **[build] Fighter operations**: carrier launch/recover, endurance depletion + return-to-
    carrier (`enduranceExhausted` computed, unused), morale-broken disengage (`moraleBroken`
    stub), pilot quality (Ace/Turkey), remaining specialised types (Heavy/Interceptor/Torpedo/
    Fast/Long-range).
15. **[build] Independent (More Thrust) missiles** — 🟡 PARTIAL (2026-07-22). Pure combat +
    movement built + tested: `movement/missile-path.ts` `plotMissilePath` (18mu with one mid-point
    2-point turn) and `combat/missile.ts` `missileCanAttack` (≤6mu, not in the missile's rear arc)
    + `resolveMissileAttack` (target PDS kills on a 6 via `pdsKillsVsMissiles`; surviving missile
    detonates a Normal warhead — 2d6 total, screens ignored, armour absorbs). Still to do: the
    dedicated missile-phase launch + a Foundry token orchestrator that moves/tracks the craft and
    removes it after the 3-turn life, plus the EMP/Needle warhead variants.
16. **[build] Fighter movement + dogfights** (`dogfightKills` exists, unwired).
17. **[build] Vector movement** (optional FT2 mode) — 🟡 PARTIAL (2026-07-22). `movement/vector.ts`
    pure library: persistent `{vx,vy}` velocity, `advance`/`applyMainDrive` (burn along facing),
    `applyPush`/`rotateFacing` (manoeuvring thrusters = ½ rating rounded DOWN), `resolveTurn`
    (advance-then-fold, written order matters), `parseVectorOrder`/`checkManoeuvres` budgets,
    `nearestCourse`/`velocityMagnitude` for marker realignment (+16 tests). Still to do: a
    Vector-mode scene tool + token advance/rotate orchestrator (as cinematic `path.ts` defers to
    `ui/round-control`).
18. **[build] Multi-FCS fire-splitting** (N FCS → N targets) — one target per action now.
19. **[build] Fleet Book optional layers**: reroll/penetrating damage + armour bypass, core-
    systems +1, variable-hull design system, conditional aft fire.
20. **[build] Big/xeno weapons** — 🟡 PARTIAL (2026-07-22). `combat/spinal.ts` implements the
    spinal-mount Nova Cannon (3-turn forward sweep, 6/4/2 D6, 2"/4"/6" template) and the More
    Thrust Wave Gun (36mu expanding template, 4/3/2 D6, charge-then-fire + knock-out feedback) as
    pure math (+22 tests); damage = die score, screens ignored. Still to do: template canvas
    geometry, arming/charge bookkeeping on a Document, scene tools; K-guns + the Kra'Vak /
    Sa'Vasku / Phalon races (different design/damage systems) not yet built.

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
