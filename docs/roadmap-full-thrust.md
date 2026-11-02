---
date: 2026-11-02
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

> **Rules numbers do not belong in this file.** It used to restate ranges, dice and worked
> examples in its status notes. They were removed on 2026-11-02 under the policy in
> `docs/rules-content-audit.md`: name the mechanic, not its value.

**"Unverified live" below means what it says.** Everything marked done on 2026-11-02 was proved
by unit tests only. No Foundry world was available to that session.

## P0 — Playability blockers (logic exists, nothing calls it)

1. ~~**[wire] Fire-phase turn order.**~~ ✅ **DONE 2026-07-22.** `beginFirePhaseAction` +
   `round/fire-session.ts`; the order is persisted to a Document.
2. ~~**[wire] PDS / anti-fighter interception.**~~ ✅ **DONE.** Fighter path 2026-07-22. The missile
   half this item left pending is **also done**: `combat/missile.ts` calls `pdsKillsVsMissiles`
   (`d891783`).
3. ~~**[wire] Needle beams.**~~ ✅ **DONE 2026-07-22.** `combat/needle.ts` + "Needle Beam" tool.
4. ~~**[wire] Salvo missiles.**~~ ✅ **DONE 2026-07-22.** `combat/salvo.ts` + "Fire Salvo" tool.
   SIMPLIFICATION: resolves directly against a chosen target; the point-of-aim and
   movement-prediction step is deferred.
5. ~~**[wire] Damage control.**~~ ✅ **DONE 2026-07-22.** `resolveDamageControl` + GM tool.
6. ~~**[wire] Ship-design points.**~~ ✅ **DONE 2026-07-22.** `shipPointsFromSystem`. **Corrected
   2026-11-02:** every price it uses now comes from the world's profile, see the audit.

## P1 — QoL / UX

7. ~~**[qol] Editable-weapons sheet.**~~ ✅ **DONE 2026-07-22.**
8. ~~**[qol] Hull damage on the hover panel.**~~ ✅ **DONE 2026-07-22.**
9. ~~**[qol] Battlefield status icons.**~~ ✅ **DONE 2026-07-22.** `src/status.ts`.
10. ~~**[qol] Visual SSD.**~~ ✅ **DONE.** Hull and armour tracks and the arc overlay 2026-07-22. The
    system pips this item still listed had **already landed**: `prepareSystemPips` /
    `onToggleSystemPip` in `sheets/ship-sheet.ts` (`04ed560`).
11. ~~**[qol] Pre-fire targeting feedback.**~~ ✅ **DONE 2026-07-22.** `combat/targeting.ts`.
12. ~~**[qol] Turn tools, tracker, localized cards.**~~ ✅ **DONE 2026-11-02.** New Turn, New Battle and
    the tracker landed 2026-07-22. The fully localized cards landed now: the fire-phase line, side
    names, targeting rows and spinal heading go through `src/localize.ts`, and
    `tests/localized-cards.test.ts` fails on any key missing from `lang/en.json`. Every report card
    also now carries a speaker (`postReportCard`). Toasts (`notify`) are still English. Unverified
    live.
13. ~~**[qol] Friendlier plot entry.**~~ ✅ **DONE 2026-07-22.**

## P2 — Advanced rules (need new math)

14. **[build] Fighter operations** — 🟡 PARTIAL. Pilot quality, specialised types, launch/recover
    tools and movement are in. **Done 2026-11-02 (unverified live):** pilot quality and type on the
    fighter card; the end-of-turn endurance sweep (`combat/fighter-endurance.ts`) that orders exhausted
    groups home, counts dry turns on a flag and, behind the world setting "More Thrust: exhausted
    fighters are lost", removes a group after the profile's grace. Recovery now uses the group's own
    move rather than its attack range, and honours the per-turn limit. Remaining: a lost group's bay
    stays occupied (a group does not record its carrier). **⏸ Owner:** the launch limit needs to know
    whether a ship is an "actual carrier", and nothing in the ship model says so (a `bays` count is
    not the same claim).
15. ~~**[build] Independent (More Thrust) missiles.**~~ ✅ **DONE.** The missile phase landed 2026-07-22.
    The EMP/Needle warhead picker this item still listed had **already landed**: `pickWarhead` in
    `ui/round-control.ts` (`0276bd2`).
16. ~~**[build] Fighter movement + dogfights.**~~ ✅ **DONE 2026-07-22 (live-verified).**
17. ~~**[build] Vector movement.**~~ ✅ **DONE.** The tool this item still listed had **already landed**:
    `vectorMoveAction` (`4179372`). **Fixed 2026-11-02:** that tool never called `checkManoeuvres`, so
    any order executed however far over budget; it now refuses with the reason. Unverified live.
18. ~~**[build] Multi-FCS fire-splitting.**~~ ✅ **DONE 2026-07-22 (live-verified).** An explicit
    per-weapon target picker is a possible future refinement.
19. **[build] Fleet Book optional layers** — 🟡 PARTIAL. **Done 2026-11-02 (unverified live):**
    - Conditional aft fire is wired behind the world setting "Fleet Book: conditional aft fire". The shot,
      the targeting preview and split-fire allocation share one check (`weaponBears`), and the plot and
      vector tools record main-drive thrust on a per-turn flag.
    - Penetrating damage now reaches the hull while armour remains. It was wired as ordinary damage,
      which spent armour first, contrary to what `ship/fleet-book.ts` itself describes.

    - **Variable hull** is wired through import, not through a design UI: a fleet ship's `hullGrade`
      sizes its track and prices its hull (`FLEET-FORMAT.md`). No sheet control yet.

    Remaining:
    - **⏸ Owner, rules not in the repo:** Core Systems threshold bonus, Needle-Beam core immunity,
      Enhanced Pulse Torpedo split, Fleet Book PDS reroll. See "Blocked on the owner".
20. **[build] Big/xeno weapons** — 🟡 PARTIAL. Nova Cannon and Wave Gun are fireable (live-verified),
    and the Wave Gun charge cycle this item listed as deferred has **already landed**
    (`waveGunChargeAfterTurn`/`waveGunChargeAfterFiring`, `6f1291d`). Kra'Vak K-guns are wired through
    `combat/fire.ts`. Remaining, none started: the swept/expanding template on the canvas, the Nova
    Cannon's multi-turn sweep (it fires its first turn only), and wiring Sa'Vasku and Phalon as fireable
    kinds with their design and damage models.

## P3 — Live-verification debt

The pure logic is unit-tested; these UI shells need a real Foundry v14 world: scene-control
payload shape, sheet render, both DialogV2 prompts (plot + import), the **PIXI preview overlay**,
token move/rotate, the ownership-warning dialog, actor creation. Add everything marked "unverified
live" above.

## Blocked on the owner

Rules the repository does not contain, and which were not written from memory or the web:

| Item | What is missing |
| --- | --- |
| Core Systems threshold bonus | Which ship systems count as core. `ship/fleet-book.ts` takes an `isCore` array and has nothing to fill it from; the ship model has no such systems. |
| Needle-Beam core immunity | The same list, plus whether a needle may nominate one at all. |
| Enhanced Pulse Torpedo split | The whole rule: nothing beyond its name is in the repo. |
| Fleet Book PDS reroll | The whole rule: nothing beyond its name is in the repo. |
| Launch limit per turn | What makes a ship an "actual carrier". `launchLimit` takes the answer and the ship model has no field for it. |

## Engine-extraction findings (move functionality module → engine)

All three are **already done**:
1. ~~**Adopt the engine's activation order.**~~ ✅ `round/fire-session.ts` calls
   `rounds.createActivationOrder` (`6a68db7`).
2. ~~**Engine status-effect register helper.**~~ ✅ `src/status.ts` uses `status.register` (`c937a04`).
3. ~~**Engine outcome chat-card helper.**~~ ✅ `packages/battleframe/src/ui/chat.ts` `card` / `postCard`.
