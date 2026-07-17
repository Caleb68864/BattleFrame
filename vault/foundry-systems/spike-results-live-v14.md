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

## Measurement — **EXACT**

```js
// two 32mm bases, centres 3.00in apart
game.battleframe.measure.between(a, b)
// → { distance: 1.7401574803149606, units: 'in', mode: 'base-to-base' }
// expected 3 - (32/25.4) = 1.7401574803149606   ← exact to the last bit
```

| case | result |
|---|---|
| touching bases | **exactly `0`** |
| overlapping bases | `0` — never negative |
| `between(a,b) === between(b,a)` | **`strictlyEqual: true`** |

The commutativity fix (`centre - (rA + rB)` rather than `centre - rA - rB`) holds in
production, not just in a property test.

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
  v14.363. It is **not proof of a general guarantee**. Foundry publishes no ordering
  contract, and [[settings-and-api-namespace-conventions]] (`confirmed`) still says the
  **top-level assignment** pattern is the way to make load order irrelevant. We install
  inside `init`. **Adopt the top-level pattern anyway** — it removes the dependency on this
  observation entirely, and costs one line.
- **`main.ts`'s silent `return` on a missing api is still a bug**, independent of ordering.
  It inverts trade-off #2 (loud failure over plausible output): if this ever breaks, the
  ruleset vanishes with no error, no warning, no trace.
- Related: [[modules-can-contribute-document-subtypes]],
  [[lancer-activation-based-combat-precedent]], [[foundry-v14-is-current-as-of-july-2026]].
