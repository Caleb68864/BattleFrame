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
3. **[wire] Needle beams.** `needleHit` + range done; no action to fire one at a *chosen enemy
   system* (needs a system picker).
4. **[wire] Salvo missiles.** `salvoIntercepted/salvoDamage/salvoSurvivors` done; no launch
   flow (point-of-aim counter, move, resolve with PDS).
5. **[wire] Damage control.** `damageControlRepairs` done; no end-of-turn repair phase.
6. **[wire] Ship-design builder.** `designPoints` + component costs done (verified vs the worked
   example); no builder UI. `pointsValue` on a ship is never populated.

## P1 — QoL / UX

7. **[qol] Editable-weapons sheet.** The ship sheet's weapon list is READ-ONLY — you cannot add/
   remove/edit weapons in-app (only via fleet import or the data default). Biggest build-a-ship
   gap.
8. **[qol] Hull damage on the hover panel.** The most important at-a-glance stat is missing
   (`HoverStatField.max` is a static number, not a `damage/boxes` path).
9. **[qol] Battlefield status icons.** Only `defeated` shows. `driveCrippled` (can't maneuver)
   and `fcs==0` (can't fire) are in the data but invisible; the `status.crippled` i18n key is
   unused. Register `CONFIG.statusEffects` for them.
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
