# Decision Log

Append-only. Newest last. One entry per non-obvious fix — the kind a future
reader would otherwise re-derive or re-break.

## 2026-07-16 — Negative-grep acceptance criteria were inverted; they failed on success
- Symptom: The factory deferred SS-02 with
  `idempotency-strong-build-gate: grep -c "template.json" packages/battleframe/system.json [real_failure]`.
  The worker's output was correct — `system.json` contained zero `template.json`,
  exactly as the criterion demanded. The gate rejected good work.
- Fix: `grep` exits **1** when it matches nothing, so a criterion phrased
  "`grep -c X` returns 0" fails at precisely the moment the spec is satisfied.
  This was systematic, not a one-off: **all 9 negative greps** in the master spec
  carried the same inversion (template.json, PDF-tracking, measurePath, greathelm
  ×2, rollInitiative, Math.random, schemaVersion, and the neutrality check). Every
  one would have deferred its sub-spec on success. All rewritten to
  `[ -z "$(...)" ]`, which exits 0 when the output is empty — the shape the
  check-command contract actually requires.
- Surfaces: `docs/specs/2026-07-16-battleframe-core-mvp.md` (9 MECHANICAL criteria);
  any future spec written in this repo. The generated `## Checks` tables in
  `docs/specs/battleframe-core-mvp/sub-spec-*.md` inherit the corrected shape.
- Watch: **Any acceptance criterion asserting the absence of something.** Phrase it
  as a command that exits 0 when absent, never as prose ("returns nothing") that a
  gate will translate into a bare `grep`. The neutrality check
  (`[ -z "$(grep -rniE "greathelm|..." packages/battleframe/src/)" ]`) is the
  load-bearing one — it is the mechanical proof that core stays ruleset-neutral,
  and an inverted version of it would have failed every green build.
- Commit: this commit.

## 2026-07-16 — npm criteria must be root-anchored; the hygiene linter's fix was wrong
- Symptom: The factory halted at the spec-hygiene gate with 3 CRITICAL
  `monorepo-command-missing-cwd` findings, recommending
  `cd packages/battleframe && npm install`.
- Fix: **Did not take that advice — it is incorrect for this repo.** This is an npm
  **workspaces** monorepo: the root `package.json` owns `workspaces`, the dependency
  tree, and the `build`/`test` scripts. Installing inside a package builds the wrong
  tree. Instead made root-anchoring explicit via
  `cd "$(git rev-parse --show-toplevel)" && npm ...`, which is correct *and* satisfies
  the gate.
- Surfaces: every MECHANICAL npm criterion in the master spec (11 total).
- Watch: The linter assumes per-package scripts and will flag this again on any new
  npm criterion. The rule is not wrong in general — it is wrong for workspaces. Keep
  the explicit prefix rather than disabling the gate.
- Commit: 40c19f2.

## 2026-07-16 — vault/ notes are tracked on purpose; only source documents are ignored
- Symptom: Red-team finding C-1. `.gitignore` ignored all of `vault/`, but the factory
  spawns a worktree from HEAD — so SS-04 and SS-10 pointed workers at research files
  that could not exist there. SS-10's worker would have had no GREATHELM rulebook and
  fallen back to web sources known to be wrong (Goonhammer: Run 6"; rulebook: Sprint 5").
- Fix: Narrowed the ignore from `vault/` to `vault/**/*.pdf` (+ epub/mobi/cbz/cbr/zip).
  The 262 notes are our own writing and are tracked; the copyrighted source PDF is not
  and must never be redistributed. SS-10 retargeted to read the notes, not the PDF.
- Surfaces: `.gitignore`; Context and SS-04/SS-10 scopes in the master spec.
- Watch: **Never track a rulebook.** A `[MECHANICAL]` criterion in SS-02 asserts
  `git ls-files | grep -iE '\.(pdf|epub|mobi|cbz|cbr)$'` is empty. If that ever fires,
  a copyrighted document has entered git history and removing it needs a history
  rewrite, not a `git rm`.
- Commit: 240937d.

## 2026-07-16 — The measurement "gate" was overstated; SS-04 unblocked
- Symptom: SS-04 carried a hard blocker on SS-01 (a manual, human-only spike) on the claim
  that base-to-base measurement might be unreachable in Foundry. The whole build queued
  behind it for hours. The user pushed back: "Foundry has systems in place... what
  measurement are they so concerned about?" They were right.
- Fix: The claim rested on core issue #11428 — but that issue is *"allow overriding the
  **diagonal rule** for `measurePath()`"*, and **diagonal rules only exist on square grids**.
  The MVP is **gridless** (GREATHELM is played on a sheet of paper), so #11428 does not
  apply at all. For a gridless scene base-to-base is
  `max(0, hypot(dx,dy)/pxPerUnit - rA - rB)` — arithmetic on the SS-03 base model, needing
  no Foundry API and no extension seam. The source note says the override seam is *thin*,
  which means "do the maths yourself", not "it cannot be done". The gate was inflated from a
  headline. Removed: SS-04 `depends_on` drops SS-01; SS-01 is downgraded to verification.
- Surfaces: SS-01 scope, SS-04 scope/criteria/decisions, Intent decision boundaries,
  `docs/specs/battleframe-core-mvp/index.md`.
- Watch: **Base-to-base only changes *contact* and *range*, never movement** — movement is a
  rigid translation, so 5" is 5" measured from centres or edges. The one real open question
  is whether Foundry's **ruler** can display base-to-base so the player and the engine agree;
  if not, that is a follow-up, not a rewrite. Square/hex measurement is genuinely deferred
  (BattleTech's problem, a late stress test) — do not let it creep into SS-04.
- Commit: this commit.

## 2026-07-16 — SS-12 deferred on a literal placeholder in a MECHANICAL criterion
- Symptom: `SS-12 → check FAIL: node scripts/deploy-local.mjs --dest <foundry-data-dir>`.
  The gate executed `<foundry-data-dir>` **literally**. SS-12 deferred; its artifacts
  (`scripts/deploy-local.mjs`, `docs/DEPLOY.md`, `tests/integration/`) were left uncommitted.
- Fix: The worker's code was **correct** — run by hand against `$(mktemp -d)` it copies
  `battleframe` → `Data/systems/` and `battleframe-greathelm` → `Data/modules/` and exits 0.
  Only the criterion was broken. Rewritten to `--dest "$(mktemp -d)"`.
- Surfaces: SS-12's deploy criterion in the master spec.
- Watch: **A `[MECHANICAL]` criterion is a command that gets executed, not prose that gets
  read.** It must never contain an unfilled `<placeholder>` or `{var}`. This is the third
  defect of the same species in this spec — all three were in the *checks*, never in the
  code: (1) nine inverted negative greps that failed on success, (2) npm criteria the hygiene
  linter wanted "fixed" in a way that would have broken the workspaces build, (3) this
  placeholder. The workers have been right every time a gate said they were wrong.
- Commit: this commit.

## 2026-07-16 — The shipped system was dead code; the neutrality test passed vacuously
- Symptom: converge pass 1 (4 independent scans) found `packages/battleframe/src/battleframe.ts`
  was still the SS-02 nine-line skeleton — importing `./constants` and logging twice. It is
  Vite's sole lib entry, so `dist/battleframe.js` shipped **7 lines**. 11/12 sub-specs read
  "complete" and 119 tests passed while the built artifact did nothing. Every unit test passed
  because tests import services directly; nothing imported them into the bundle. As a scan
  agent put it: **"The neutrality proof passes trivially in part because core imports nothing
  at all."** The single most load-bearing check in the project was a vacuous pass, and it was
  reported as the architecture being validated.
- Fix: wired the entry point — `installBattleframeApi()` first (so `game.battleframe.api`
  exists before ruleset `init` calls `registerRuleset`), then measurement, dice, settings
  (passing the wizard class through), and `CONFIG.Combat.documentClass`, which **was assigned
  nowhere in the repo**. Plus side-effect imports for the six self-registering modules.
  Bundle 7 → 803 lines; wiring greps 0 → 17; tests 119 → 133.
- Surfaces: `packages/battleframe/src/battleframe.ts`, `src/battleframe.test.ts`.
- Watch: **A green suite is not evidence the product runs.** The root cause was SS-12
  deferring on a `<placeholder>` defect of mine, its artifacts then being committed without
  anyone checking that the wiring — SS-12's actual job — had happened. The entry-point test
  now mutation-tests itself: reverting `battleframe.ts` to the skeleton fails 8 of 10. Any
  future service MUST be asserted at the entry point, not only in its own unit test.
  Corollary: a hypothesis is not a finding — I warned about tree-shaking dropping
  side-effect imports; the agent checked and found Rollup preserves them
  (`moduleSideEffects: true`). The bundle was empty because the file imported nothing. Acting
  on my guess would have double-registered against each module's own `Hooks.once`.
- Commit: this commit.

## 2026-07-16 — base-to-base was not float-commutative; the property test hid it
- Symptom: `between(a,b) === between(b,a)` is a spec criterion. `centre - rA - rB` is
  `(centre - rA) - rB`, which IEEE-754 does not equate to `(centre - rB) - rA`. Probed over
  200k random triples: **47,838 (23.9%) fail strict equality**. The "property test" was a
  `for` loop over 4 hand-picked fixtures asserting `toBeCloseTo(…, 10)` rather than `===`.
- Fix: subtract the **sum** — `centre - (rA + rB)`. Float **addition is commutative**, and
  `hypot` is symmetric, so the expression is now exactly commutative: **0/200,000 failures**.
  The parenthesisation is load-bearing and carries a comment saying so. Replaced the test with
  a real property test: 20k seeded-PRNG pairs, strict `toBe`, with bucket assertions so it
  cannot pass vacuously by generating only one regime.
- Surfaces: `packages/battleframe/src/measurement/measure.ts`,
  `tests/measure.test.ts`, `tests/fixtures/known-distances.ts`.
- Watch: **The `max(0, …)` clamp masked two-thirds of the failures** — overlapping pairs both
  clamp to 0 and compare equal. So the old fixtures hid the defect twice: exact-binary radii
  AND the clamp. When a property test only exercises hand-picked fixtures, it is not a
  property test. Also open: `SceneMismatchError` compares grid parameters, not scene identity
  — `SceneLike` has no `id`, so two different scenes with identical grid settings still
  produce a meaningless number. Closing that needs `id?: string` on `SceneLike`.
- Commit: this commit.

## 2026-07-16 — GREATHELM courage order counted the wrong knights
- Symptom: `runCouragePhase` passed the **pre-filtered testers** into
  `summarizeWarbandDamage`, so `totalDamage` silently dropped damage on knights not in base
  contact and `knightsRemaining` counted testers rather than survivors. It contradicted the
  vault (`courage-phase.md`, `confidence: confirmed`, QSR p2 verbatim) **and the function's
  own doc comment**. It also destroyed the deliberate brutality the vault notes: both
  tiebreaks are meant to force the *losing* player to test first.
- Fix: `summarizeWarbandDamage(playerId, knights)` — the whole warband. The tester filter
  stays where it belongs, deciding who *rolls*, not who *counts*.
- Surfaces: `packages/battleframe-greathelm/src/round/courage.ts:116-122`.
- Watch: **The unit test asserted the correct behaviour against `summarizeWarbandDamage` in
  isolation, so the caller's bug flowed through uncaught.** Testing a helper with correct
  inputs proves nothing about the caller that feeds it wrong ones. The two new regression
  tests drive the real ordering path and were verified to FAIL against the old code — a test
  that passes before and after is a passenger.
- Commit: this commit.
