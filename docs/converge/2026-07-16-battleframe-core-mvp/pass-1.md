# Converge Pass 1 — standard

**Mode:** standard (4 parallel Explore agents, batched by sub-spec)
**References:** `docs/specs/2026-07-16-battleframe-core-mvp.md`,
`docs/plans/2026-07-16-battleframe-foundry-skirmish-engine-design.md`
**Base:** `master` · **Branch:** `2026/07/17-0008-caleb-feat-battleframe-core-mvp`
**Verdict:** **35 gaps** — `clean_streak = 0`

## The finding

> **"The neutrality proof passes trivially in part *because* core imports nothing at all."**
> — SS-10/11/12 scan agent

`packages/battleframe/src/battleframe.ts` was never rewritten from its SS-02 skeleton. It
imports `./constants` and logs two lines. It is Vite's sole lib entry, so the shipped
`dist/battleframe.js` is **7 lines**.

**11/12 sub-specs "complete". 119 tests passing. The built artifact does nothing.**

Every unit test passes because tests import services directly. Nothing imports them into the
bundle. Every `Hooks.once("init")` side effect in SS-03 → SS-09 is tree-shaken out.

**Root cause:** SS-12 owned `battleframe.ts`'s content and was the one sub-spec that deferred
— on a literal `<placeholder>` in a `[MECHANICAL]` criterion (my defect). Its artifacts were
then committed without noticing the wiring never happened.

This is the same species as the `--passWithNoTests` trap caught during authoring: **green
tests, dead product.** Caught the hypothetical, shipped the real one.

## Gaps by cluster

### A. Nothing is wired (root cause — 20+ gaps collapse to this)
SS-04 AC1, SS-05 AC1/AC7, SS-06 AC1/AC8, SS-07 AC1, SS-08 AC1–AC4, SS-09 AC1/AC2/AC6/AC7,
SS-10 AC4, SS-12 AC1/AC2/AC7/AC8.
`game.battleframe.api`, `.measure`, `.dice` never installed. `CONFIG.Combat.documentClass`
never assigned — **anywhere in the repo**. GREATHELM's `main.ts` calls
`game.battleframe.api.registerRuleset`, finds nothing, and silently returns.

### B. Real logic bugs (not wiring)
| Gap | Detail |
|---|---|
| **SS-11 AC7 — courage order** | Warband damage computed from **filtered testers only** (`courage.ts:116-118`). Excludes damage on knights not in base contact; counts testers as "remaining". Contradicts the vault (`confirmed`) **and the function's own doc comment**. Unit test asserts correct behaviour *in isolation*, so the caller's bug passes uncaught. |
| **SS-04 AC5 — commutativity** | `centre - rA - rB` is not float-commutative. Probed over 200k random triples: **21% fail strict `===`**. The "property test" is a `for` loop over 4 fixtures with `toBeCloseTo` instead of `===`. Criterion is unmet by the implementation. |

### C. Dead exports — defined, exported, never called
- `determineInitiative` — **zero callers**. Initiative is never determined.
- `runRound` — **zero callers**. `main.ts` imports only the knight data model and sheet.
  **There is no way to start a round.**
- `setSchemaVersion` — zero callers. Nothing is ever stamped.
- `convertOrphanToGeneric` — zero callers outside tests.
- `registerBattleframeSettings` — zero callers. Settings never registered; the wizard would
  throw "not a registered game setting".
- `createBattleframeCombatClass` — zero callers. `initiative: null` is a **compile-time**
  claim, not a runtime one.

### D. Spec gap (not drift — genuinely never specified)
**Nothing triggers a round.** The Outcome says "two six-knight forces play a full GREATHELM
round"; no criterion in any sub-spec specifies the affordance that starts one. `runRound`
takes `firstPlayerId` as an *input* — so its caller must determine initiative, and that
caller does not exist. This needs a new sub-spec, not a fix.

### E. Smaller, real
- Orphan warning has **no GM gate** — warns every connected player.
- Orphan warning **doesn't offer conversion** — plain `ui.notifications.warn` prose; no
  dialog, button or callback.
- `lang/en.json` has **zero `setupWizard` keys** → every wizard string renders as a raw key.
- `styles/battleframe.css` **not referenced** by `system.json`.
- `disable-ruleset` is a **dead button** — emitted in the template, no registered handler.
- `_prepareTrackerContext` is an **unresolved guess** inherited from the unconfirmed v14
  tracker base class; tests use a fake base that cannot detect a wrong override name.
- `RUNNING_BATTLEFRAME_VERSION` hardcoded `"0.1.0"` — will drift from `system.json`.
- `measure.ts:23` reads `tokenA.scene`, **silently ignores `tokenB.scene`**.
- `base-model.ts:15` hardcodes 25.4 mm/inch — assumes scene units are inches, but SS-09
  introduces `defaultGridUnit`. A non-inch unit makes every radius silently wrong.
- `Combatant#initiative` nullability was correctly **not guessed** — but also never
  escalated (no `docs/decisions.md` entry).

## What is genuinely good (verified, not assumed)

- **The Lancer `initiative ??= 0` trap is absent.** No `?? 0`, `|| 0`, or numeric default on
  initiative anywhere in core.
- **No type-name collision detection** — correctly omitted per spec.
- **No round semantics in core** — one comment, zero code. No scope creep.
- **Dice is 63 lines**, no mechanics, no `Roll` subclass, no `Math.random` anywhere.
- **All negative greps now pass literally** (the inversion fix held).
- **SS-09's activate-before-write ordering is correct** and test-verified.
- **SS-03 base model is solid** — 10/10, dedicated `InvalidBaseSizeError`, zero-size throws.
- **GREATHELM ships no rules text**; `module.json` names the required rulebook.
- **Sprint = 5"** confirmed; no stray `6"`.

## Fixes dispatched (pass 1)

| Fix | Pathspec | Status |
|---|---|---|
| Wire `battleframe.ts` — the root cause | `src/battleframe.ts`, `src/battleframe.test.ts` | dispatched |
| Courage order — whole warband, not testers | `round/courage.ts`, `tests/courage.test.ts` | dispatched |
| Measure commutativity — subtract the sum | `measurement/measure.ts`, `tests/measure.test.ts`, `tests/fixtures/known-distances.ts` | dispatched |
| Record invented tie re-roll | `vault/greathelm/open-questions.md` | **done** |

## Met% — deliberately not computed this pass

A percentage here would be dishonest. The dominant defect is binary: **the shipped bundle is
empty**. Criteria scored "Met" at module level are simultaneously false at runtime. Met% will
be meaningful from pass 2, once the entry point wires something.
