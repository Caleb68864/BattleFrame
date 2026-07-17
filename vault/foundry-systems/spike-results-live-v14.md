---
tags: [foundry-vtt, system-development, spike-results]
source: live observation — Foundry v14.363 at foundry.savagefables.com, 2026-07-17
confidence: confirmed
---

# Live v14 Results — Every Open Question, Answered

**Not a spike. The real packages.** `battleframe` 0.1.0 and `battleframe-greathelm` 0.1.0
were deployed into a live Foundry **v14.363** container, a world was created on the system,
the module was enabled, and every open question was probed against running code.

The throwaway `spike/` packages were never used — by the time we could reach a Foundry, the
real system existed, and the real system answers strictly more.

## The load-bearing question: init ordering — **HOLDS**

```js
game.battleframe.api.getRuleset('battleframe-greathelm')  // → true
game.battleframe.api.listRulesets()
// → [{ id: 'battleframe-greathelm', title: 'GREATHELM', primary: true }]
```

**The system's `init` runs before an enabled module's `init`.** `game.battleframe.api`
existed when `main.ts` looked for it; the silent `if (!api) return` never fired.

This was recorded as **explicitly unsettled** in
[[the-experiment-that-would-settle-the-critical-question]] and was the single highest-value
unknown after converge. It is now `confirmed` **for this configuration** — see Caveats.

## The architectural premise — **CONFIRMED**

```js
CONFIG.Actor.dataModels
// → ['generic', 'battleframe-greathelm.knight']
game.documentTypes.Actor
// → ['base', 'generic', 'battleframe-greathelm.knight']
```

**A module contributed an Actor subtype to a system, at runtime, in production.** This is
the entire premise of the ruleset-module architecture — see
[[modules-can-contribute-document-subtypes]] — and it works. Subtypes are **namespaced by
package id** exactly as [[document-subtypes-are-namespaced-by-package-id]] predicted, which
is why the registry needs no type-collision detection.

## Measurement — **EXACT for synthetic tokens, BROKEN for real ones**

> [!danger] This section originally read "**EXACT**" and was wrong. Corrected the same day.
> The probe below passed a **synthetic** object with `flags` set at the top level. **Real
> canvas Tokens do not have `.flags`** — they have `.document.flags`. Against real tokens
> the arithmetic below never runs. See "The bug the synthetic probe hid" and
> [[real-tokens-keep-their-flags-on-the-document]].

```js
// SYNTHETIC token: { center, scene, flags: { battleframe: { base } } }
game.battleframe.measure.between(a, b)
// → { distance: 1.7401574803149606, units: 'in', mode: 'base-to-base' }
// expected 3 - (32/25.4) = 1.7401574803149606   ← exact to the last bit
```

| case (synthetic tokens only) | result |
|---|---|
| touching bases | **exactly `0`** |
| overlapping bases | `0` — never negative |
| `between(a,b) === between(b,a)` | **`strictlyEqual: true`** |

The maths and the commutativity fix (`centre - (rA + rB)` rather than `centre - rA - rB`)
are correct. **What was wrong was the input.**

## The bug the synthetic probe hid — `confirmed`, live

Placing 12 real knights on a real gridless scene and measuring two that were **3 inches
apart** returned **`0`**. The engine's own debug line:

```
measure.between centreToCentre=3.007  radiusA=15.748  radiusB=15.748  base-to-base=0
```

**A radius of 15.748 inches** — 400mm — for a 32mm base whose radius is 0.63in.

The chain, measured live:

1. `getBase` reads `token.flags?.battleframe?.base`. **`'flags' in token` → `false`.** A
   canvas Token placeable keeps flags on **`token.document.flags`**.
2. So every real token falls through to `deriveBaseFromFootprint(token)`, which reads
   `token.width` / `token.height`.
3. **A Token placeable is a PIXI container**, so those are arbitrary rendered bounds:
   `placeable.width` → **9**, `placeable.height` → **32**. The real values are
   `placeable.w` → 125.98 (px) and `document.width` → 1.2598 (grid units).
4. `max(9, 32) = 32` × `DEFAULT_MM_PER_GRID_SQUARE (25)` = **800mm diameter** → 400mm radius
   → 15.748in. Every knight becomes a 32-inch model; everything overlaps; **every distance
   is 0**.

**All 189 tests passed.** Every one hands `between()` a synthetic object with top-level
`flags`. The code was written against the tests' shape rather than Foundry's — and the tests
were written from the same misunderstanding, so they could not catch it. My own live probe an
hour earlier made the identical mistake and produced the "EXACT" verdict above.

**The lesson is not "write more tests". It is that a test double which does not resemble the
real object in the one way that matters is worse than no test** — it manufactures confidence.
Twelve tokens on a board found in one call what 189 tests could not.

**This is the finding that should be read alongside
[[custom-distance-measurement-has-no-clean-override-seam]].** Base-to-base measurement was
called "the biggest unknown in this design" and gated behind a human-only spike for hours,
citing core issue #11428 — which concerns the **diagonal rule**, a square-grid concept, for a
game played **gridless** on a sheet of paper. It was always arithmetic. It computes exactly
right. The note's "no clean override seam" meant *do the maths yourself*, and doing the maths
yourself is fine.

## Resolved: previously `not found`

| Question | Answer |
|---|---|
| **v14 ApplicationV2 combat tracker base class** | **Resolves.** `CONFIG.ui.combat` → `BattleframeCombatTracker`. No `MissingCombatTrackerBaseError`. Was "the highest-risk unknown in core". |
| **`CONFIG.Combat.documentClass`** | `BattleframeCombat`, instantiable. |
| **`getSceneControlButtons` shape** | **Works.** The vault had *zero* notes at any confidence. `ui.controls.controls['battleframe-greathelm'].tools` → `['greathelm-run-round']`. Scene-control titles store the **i18n key** and localize at render — a raw key in `ui.controls` is normal, not a bug. |
| **ApplicationV2 availability** | Resolves. The setup wizard rendered. |
| **Settings registration** | All three world settings registered: `activeRulesetId`, `setupCompleted`, `defaultGridUnit`. The wizard does not throw. |
| **Public API surface** | `registerRuleset`, `activateRuleset`, `getActiveRuleset`, `getRuleset`, **`listRulesets`** (not `getRulesets`). |

## Still open

- **`Combatant#initiative` accepting `null`** — the Combat class instantiates, but no combat
  with combatants was created. Nothing writes a number (the Lancer `initiative ??= 0` trap is
  genuinely absent), so the Must-Not holds in code.
- **A full GREATHELM round** — the control button is registered; the round has not been
  played end-to-end with six knights on a scene.
- **Ruler vs `measure.between` agreement** — untested.

## Bugs this found that no test could

1. **A new system does NOT appear until Foundry restarts.** Files were deployed and the
   Create World dropdown did not list BattleFrame. **Foundry scans `Data/systems` only at
   startup.** After a container restart it appeared immediately. This affects every install
   path and belongs in any install documentation.
2. **Three GREATHELM i18n keys were missing** — `fields.damage`, `fields.momentum`,
   `sheets.knight` resolved to raw keys via `game.i18n.localize`. Open a knight sheet and you
   see `battleframe-greathelm.fields.damage`. Every unit test passes without them. Fixed.
3. **`bash.exe.stackdump` was inside the system package** and would have been copied into
   Foundry verbatim. `deploy-local.mjs` now filters crash dumps and logs.
4. **`system.json` had no `styles` entry** — the CSS shipped and would never have loaded.
   Fixed.
5. **Copy bug in the wizard's zero-ruleset text** — says distance measures "base-to-base in
   **millimetres**". It measures in **inches**; millimetres is the *base size* unit. The same
   in/ft/mm confusion that produced the 12× bug, resurfacing in user-facing prose.

## Caveats — read before treating this as settled

- **One configuration, one observation.** Ordering held for `battleframe` + one module on
  v14.363. It is **not proof of a general guarantee** — Foundry publishes no ordering
  contract.
- **~~Adopt the top-level pattern anyway~~ — DONE, same day.** The api is now built at
  module top level and merged onto `game.system` at `init`, per
  [[settings-and-api-namespace-conventions]] (`confirmed`, dnd5e's verbatim two-step). **This
  observation is therefore no longer load-bearing** — registration works regardless of which
  package Foundry loads first. Verified by mutation test: reverting the installers back
  inside `init` fails the tests that assert the api is reachable with `init` never fired and
  with `game` deleted entirely.
- **~~`main.ts`'s silent `return` is still a bug~~ — FIXED, same day.** `failRegistration()`
  now notifies the GM and throws. A *rejected* registration (`result.ok === false`) was also
  being discarded silently — the same vanish-failure wearing a different hat — and now fails
  loudly too.
- Related: [[modules-can-contribute-document-subtypes]],
  [[lancer-activation-based-combat-precedent]], [[foundry-v14-is-current-as-of-july-2026]].

## Addendum — two development-workflow facts (2026-07-17, confirmed)

### Foundry scans `Data/systems` only at startup

Deploying a **new** system to a running Foundry produces **nothing**: it is absent from the
Create World dropdown, with no error, no log line, no hint. A container restart made it
appear immediately. Affects every install path — belongs in any install documentation.
Updating an already-registered system does not need a restart.

### System JS is served with `Cache-Control: max-age=14400`

Four hours. After a redeploy the browser **keeps running the old bundle and will not even
revalidate**. Observed directly: `globalThis.battleframe` was `undefined` in a live world
while the server was serving a byte-identical copy of the new build containing that exact
assignment (32,099 bytes, 17 `globalThis` references, `Last-Modified` matching the deploy).

**This is a trap that fabricates evidence.** Without checking the served bytes, the obvious
conclusion is "the fix does not work in production" — and it would have been wrong. Purging
`caches` and unregistering service workers does not help; neither is involved. It is the
plain HTTP cache. Hard-reload, or compare the served bytes with `curl` + `cmp`.

Recorded in `docs/DEPLOY.md` as well, because that is where someone will look.
