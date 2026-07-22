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
4. **[wire] Salvo missiles.** `salvoIntercepted/salvoDamage/salvoSurvivors` done; no launch
   flow (point-of-aim counter, move, resolve with PDS).
5. **[wire] Damage control.** `damageControlRepairs` done; no end-of-turn repair phase.
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
10. **[qol] Visual SSD** — clickable damage boxes + an arc/range diagram instead of number inputs.
11. **[qol] Pre-fire targeting feedback** — show which weapons bear + the range band before
    committing (arc/range math already exists); today you learn "out of arc" only after firing.
12. **[qol] Turn/phase tracker, "new battle" reset, clear-all-plots, localized chat cards.**
13. **[qol] Friendlier plot entry** (click-to-set thrust/turn) alongside the raw `+4,P2` text.

## P2 — Advanced rules (need new math)

14. **[build] Fighter operations**: carrier launch/recover, endurance depletion + return-to-
    carrier (`enduranceExhausted` computed, unused), morale-broken disengage (`moraleBroken`
    stub), pilot quality (Ace/Turkey), remaining specialised types (Heavy/Interceptor/Torpedo/
    Fast/Long-range).
15. **[build] Independent (More Thrust) missiles** as moving craft (own phase, 18mu, 3-turn life).
16. **[build] Fighter movement + dogfights** (`dogfightKills` exists, unwired).
17. **[build] Vector movement** (optional FT2 mode) — cinematic only today.
18. **[build] Multi-FCS fire-splitting** (N FCS → N targets) — one target per action now.
19. **[build] Fleet Book optional layers**: reroll/penetrating damage + armour bypass, core-
    systems +1, variable-hull design system, conditional aft fire.
20. **[build] Big/xeno weapons**: Nova cannon, wave gun, K-guns; the Kra'Vak / Sa'Vasku / Phalon
    races (different design/damage systems).

## P3 — Live-verification debt

The pure logic is unit-tested; these UI shells need a real Foundry v14 world: scene-control
payload shape, sheet render, both DialogV2 prompts (plot + import), the **PIXI preview overlay**,
token move/rotate, the ownership-warning dialog, actor creation.

## Recommended order

Wire **#2 (PDS)** and **#1 (fire-phase order)** first — they make already-tested code play. Then
**#7 (editable weapons)** and **#8/#9 (hull hover + status icons)** for the biggest day-one
usability wins.
