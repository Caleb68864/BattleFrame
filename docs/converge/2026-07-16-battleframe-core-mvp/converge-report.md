# Converge Report — battleframe-core-mvp

**Outcome:** **NOT CONVERGED** — stopped deliberately at pass 2, not at the ceiling.
**Passes used:** 2 / 20 (convergence requires 3 consecutive clean passes; we had 0)
**References:** `docs/specs/2026-07-16-battleframe-core-mvp.md`,
`docs/plans/2026-07-16-battleframe-foundry-skirmish-engine-design.md`
**Branch:** `2026/07/17-0008-caleb-feat-battleframe-core-mvp`

## Why stop at 2

The goal was "check we didn't drift and that we're in a good place for the next round."
That is answered. What remains is not drift — it is a small set of **facts nobody has
checked against a live Foundry**, and no number of scan passes can close those. Passes 3–5
would re-derive the same list.

## Met% per pass

| Pass | Mode | Gaps | Fixed | Note |
|---|---|---|---|---|
| 1 | standard (4 agents) | 35 | 4 clusters | Met% withheld — dishonest to compute when the shipped bundle was empty |
| 2 | standard (2 agents) | 17 | 9 | Bundles now real; remaining gaps are mostly unverifiable-without-Foundry |

## The two findings that mattered

**1. The shipped system was dead code — twice.**

`battleframe.ts` was still SS-02's 9-line skeleton, so `dist/battleframe.js` was **7 lines**.
11/12 sub-specs read "complete" with 119 tests passing while the artifact did nothing. Fixed
in pass 1 (7 → 1021 lines). Then pass 2 found the *same bug one directory over*:
`dist/greathelm.js` was **146 lines** with `grep -c "runRound"` → **0**. Rollup tree-shook
the entire round loop out. Fixed by SS-13 (146 → 771 lines, grep → 9).

As a scan agent put it:

> **"The neutrality proof passes trivially in part because core imports nothing at all."**

The project's single most load-bearing check — the mechanical proof that core stays
ruleset-neutral — was a **vacuous pass**, and it was reported as the architecture being
validated.

**2. The spec was the defect, not the code.**

No acceptance criterion anywhere said what *triggers* a round. SS-10 and SS-11 specified pure
functions and unit tests; both were satisfied — literally, correctly, by the factory — with
code no user could reach. The Outcome ("two six-knight forces play a full GREATHELM round")
was unreachable through the specified surface.

**Every failure in this build was in the checks, never in the implementation:**

| # | Defect | Effect |
|---|---|---|
| 1 | Nine inverted negative greps (`grep -c X returns 0`) | `grep` exits 1 on no match — **failed when satisfied**. Deferred SS-02. |
| 2 | Literal `<foundry-data-dir>` in a `[MECHANICAL]` criterion | Gate ran it verbatim. Deferred SS-12 — whose job was the wiring. |
| 3 | ACs satisfiable by dead code | The whole round loop tree-shaken out, all criteria green. |
| 4 | `npm run build` never typechecked, and never built greathelm | Three agents reported "build 0" in good faith while `tsc` exited 2. SS-13's own bundle-grep AC would have passed against a **stale artifact**. |

The workers were right every time a gate said they were wrong.

## Fixed and verified

- **Entry point wired** — api → measure → dice → settings → `CONFIG.Combat.documentClass`
  (assigned *nowhere* in the repo previously). Mutation-tested: reverting fails 8/10.
- **SS-13 round trigger** — scene control via Foundry's own `getSceneControlButtons`. **Core
  required zero changes.** Tie re-roll implemented (bounded; throws rather than silently
  picking). Sprint measured and capped via `measure.between`. Order persisted via `setFlag`.
- **Courage order** — was summarising damage over *filtered testers*, contradicting the vault
  and its own doc comment. Regression tests verified to fail against the old code.
- **Commutativity** — `centre - rA - rB` failed strict `===` on **23.9% of 200k triples**.
  Now `centre - (rA + rB)`: **0/200,000**. The `max(0,…)` clamp had been masking two-thirds
  of the failures.
- **12× unit bug** — `base-model` hardcoded 25.4mm/inch and never read `scene.grid.units`,
  while `defaultGridUnit` defaulted to `"ft"`. Silent 12× error in the core measurement path.
  Now unit-aware; unknown units **throw**.
- **Orphan warning** — GM-gated (was warning every player, proven by execution) and now
  actually offers conversion.
- **`schemaVersion`** — stamped via `preCreateActor`. Core stamps only what core creates; a
  ruleset Actor returns `null`.
- **`lang/en.json`** — 1 key → 24. Every wizard string was rendering as a raw key.
- **Real build gate** — `build` now typechecks and builds both workspaces. Proven by
  deliberately breaking a type (exit 2) and restoring it (exit 0).

**Current state:** build 0 · **186 tests passing** (was 119) · `tsc` 0 · neutrality clean ·
`battleframe.js` 1021 lines · `greathelm.js` 771 lines.

## Residual gaps — all need a live Foundry v14, none are code smells

| Gap | Why it can't be closed here |
|---|---|
| **Init ordering is an unproven assumption** | `main.ts` once asserted the system's `init` "always runs before" the module's. The vault records this as **explicitly unsettled**; SS-01 is the probe that answers it and has not run. The comment is now honest, but **the latent bug is unfixed**: core installs its API *inside* `init` rather than at top level (the vault's `confirmed` fix), and `if (!api) return` means GREATHELM would **silently never register**. Highest-value open item. |
| `getSceneControlButtons` shape | Vault has **zero notes** at any confidence. SS-13 accommodates both known payload shapes and asserts nothing; wrong shape = button doesn't appear, nothing corrupts. |
| `_prepareTrackerContext` | An unresolved guess inherited from the unconfirmed v14 tracker base class. Tests use a fake base that cannot detect a wrong override name. |
| `Combatant#initiative` accepts `null`? | Never guessed down to `0` (the Lancer trap is genuinely absent), never resolved. |
| Tracker `init` throw blast radius | A harness run showed `MissingCombatTrackerBaseError` aborting the hook loop. Real Foundry likely wraps listeners in try/catch — unconfirmed. |
| `RUNNING_BATTLEFRAME_VERSION` hardcoded `"0.1.0"` | Agrees with `system.json` today; nothing couples them. Next bump silently breaks compat checks. |
| `getDefaultGridUnit()` is decorative | Nothing applies it to new scenes. `radiusPx` correctly reads the *scene's* units instead. |
| Set-aside primary state is in-memory | Lasts until reload — long enough to pick a primary. |
| All `[HUMAN REVIEW]` | Live round, ruler agreement, Dice So Nice, second client, reload persistence. |

## Frozen gaps (require human review)

**None.** No gap survived 3 fix attempts. Every unresolved item above is blocked on a live
Foundry, not on a stubborn implementation.

## For the next round

1. **Run `spike/`** — 15 minutes at the Foundry box. It was downgraded from a measurement
   gate (that reasoning was wrong — #11428 is a square-grid diagonal issue and the MVP is
   gridless), but it is the probe that settles **init ordering**, which is now load-bearing
   for whether GREATHELM registers at all. Different reason, higher value.
2. **Fix the top-level API install** — the vault's `confirmed` note says top-level assignment
   is the load-order fix. We don't use it. Cheap, and removes the dependency on (1).
3. **Make `main.ts` fail loudly** on a missing api. `if (!api) return` inverts trade-off #2.
4. **Every new sub-spec needs a reachability criterion** — the SS-13 pattern
   (`grep dist/…`), not an existence criterion. This is the session's most reusable lesson.
5. Then: OPR (gated on the Army Forge export question) → Alpha Strike (the real neutrality
   proof — phase-based, no per-unit activation) → toolkit extraction (gated on three
   structurally different rulesets).
