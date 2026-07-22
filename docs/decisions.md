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

## 2026-07-16 — "npm run build exits 0" was never evidence of anything
- Symptom: three separate agents reported `npm run build` exit 0 in good faith while
  `tsc --noEmit` exited 2. All were right; none of it meant the code typechecked. Root
  `package.json` had **no typecheck script at all** — only `build` (which strips types via
  vite/rollup without checking them) and `test`. Worse, `build` was
  `--workspace packages/battleframe` only, so **`battleframe-greathelm` was never built by
  the normal workflow**; its `dist/` was a stale factory artifact.
- Fix: added `"typecheck": "tsc --noEmit"` and made `build` run it first, then
  `--workspaces --if-present` so both packages build. Verified the gate is real by
  deliberately introducing a type error (build exit 2, `error TS2322`) and restoring it
  (exit 0) — a gate nobody has watched fail is not a gate.
- Surfaces: root `package.json`; `packages/battleframe/src/documents/actor.ts:117` (the one
  real error it caught — `Hooks.on`'s listener is `(...args: unknown[]) => void`, so the
  narrow parameter must be asserted at the boundary).
- Watch: **This is the third "green means nothing" trap in this project**, after
  `--passWithNoTests` (every filtered check passes vacuously) and acceptance criteria that
  dead code satisfies. The pattern is identical each time: a signal everyone reads as
  success that is not wired to the thing it claims to measure. The stale-bundle case is the
  sharpest — SS-13's `[MECHANICAL]` criterion greps `dist/greathelm.js`, and before this fix
  it would have passed against a 146-line artifact from a previous run. **A check that reads
  a build output must be preceded by a build that actually produces it.**
- Commit: this commit.

## 2026-07-16 — The round loop was never in the product; the spec never said what starts one
- Symptom: converge pass 2 proved from build output, not by reading, that
  `dist/greathelm.js` was **146 lines** — the knight data model, the sheet, and registration.
  `grep -c "runRound|determineInitiative"` → **0**. Rollup tree-shook `loop.ts`,
  `dice-pool.ts`, `courage.ts`, `clash.ts` and `actions.ts` out entirely, because nothing
  reachable from `main.ts` imported them. `runRound`, `determineInitiative` and
  `resolveDieAction` had zero production callers. The courage-order bug fixed earlier in the
  same session was fixed in code that does not ship.
- Fix: SS-13 — a scene control registered through Foundry's own `getSceneControlButtons`.
  **Core required zero changes**, which is the point: a seam on core's combat tracker was
  considered and rejected because core would have to learn that a ruleset may start a round,
  brushing against trade-off #1. Bundle 146 → 771 lines; the grep 0 → 9; tests 133 → 186.
- Surfaces: `packages/battleframe-greathelm/src/ui/round-control.ts`, `main.ts`,
  `lang/en.json`; new SS-13 in the master spec.
- Watch: **The root cause was mine, and it is the most reusable lesson here.** SS-10 and
  SS-11 specified pure functions and unit tests. Both were satisfied — literally, correctly,
  by the factory — with code no user could reach. No AC anywhere named a button, macro,
  hook, tracker control, or exported API. **I wrote acceptance criteria that dead code
  satisfies.** SS-13 now carries the antidote:
  `[ -n "$(grep -oE 'runRound|determineInitiative' dist/greathelm.js)" ]` — a criterion
  testing *reachability*, not *existence*. Every future sub-spec that produces runtime
  behaviour needs one.
- Commit: this commit.

## 2026-07-17 — Live v14: every open question answered; the spike was obsolete
- Symptom: a dozen turns of this project were gated on questions nobody had checked against a
  real Foundry — init ordering, the v14 tracker base class, `getSceneControlButtons`,
  ApplicationV2 availability, and whether base-to-base measurement was even reachable.
- Fix: deployed the **real packages** (not the throwaway `spike/`) into the live v14.363
  container via a container management API, created a world, enabled the module, and
  probed running code with Playwright. **The spike was obsolete the moment real packages
  existed** — it would have tested code we are deleting. Results are recorded as `confirmed`
  in `vault/foundry-systems/spike-results-live-v14.md`.
- Surfaces: everything. Headlines: **init ordering HOLDS** (GREATHELM registered; the silent
  `if (!api) return` never fired); **a module contributed an Actor subtype to a system at
  runtime** — the architecture's entire premise, confirmed; measurement returned
  `1.7401574803149606` against an expected `1.7401574803149606`, **exact to the last bit**,
  with touching bases at exactly `0` and `between(a,b) === between(b,a)` strictly true.
- Watch: **live running found five bugs no test could.** (1) A new system does not appear
  until Foundry restarts — it scans `Data/systems` only at startup; this affects every
  install path. (2) Three GREATHELM i18n keys resolved to raw keys — every unit test passed
  without them. (3) A crash dump had landed inside the system package and would have shipped
  verbatim. (4) `system.json` had no `styles` entry, so the CSS shipped and never loaded.
  (5) The wizard told users distances measure in "millimetres" — they measure in inches; mm
  is the *base size* unit. That is the same in/ft/mm confusion that produced the 12× bug,
  resurfacing in user-facing prose.
  **The deeper lesson: 186 green tests, a clean typecheck, and two real bundles still did not
  tell us the product worked. Twenty minutes in a live world did.**
- Caveat: ordering held for ONE configuration on ONE version. Foundry publishes no ordering
  contract, and `settings-and-api-namespace-conventions.md` (`confirmed`) still says
  top-level assignment is what makes load order irrelevant. **Adopt it anyway** — one line,
  and it removes the dependency on this observation. The silent `return` in `main.ts` remains
  a trade-off #2 violation regardless.
- Commit: this commit.

## 2026-07-17 — Removed the load-order dependency instead of relying on a lucky observation
- Symptom: live v14 showed init ordering HOLDS — the system's `init` ran before the module's,
  GREATHELM registered, the silent `if (!api) return` never fired. It would have been easy to
  call that settled and move on. But it is **one configuration, one version, one observation**,
  and Foundry publishes no ordering contract.
- Fix: adopted dnd5e's verbatim two-step from
  `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confirmed`):
  build `globalThis.battleframe` at **module top level**, then merge onto `game.system` at
  `init`. Registration now works regardless of which package Foundry loads first. The old
  installers guarded `typeof game !== "undefined"` and spread into a fresh object — at top
  level that guard is always false, so the dependency had to be inverted: installers write to
  the namespace; binding to `game` is deferred to `init`. The spread was a latent bug too — a
  late installer could clobber a sibling. GREATHELM's silent `return` became
  `failRegistration()`: notify the GM, then throw.
- Surfaces: `packages/battleframe/src/{battleframe.ts,api/index.ts,measurement/measure.ts,dice/dice.ts,hooks/index.ts}`,
  `packages/battleframe-greathelm/src/main.ts`.
- Watch: **A passing observation is not a guarantee.** The temptation after seeing ordering
  hold live was to delete the risk from the report. The right move was to delete the
  *dependency*. Mutation-verified: reverting the installers back inside `init` fails both new
  tests (api reachable with `init` never fired; `game` deleted entirely). Also: a *rejected*
  registration (`result.ok === false`) was being discarded silently — the same vanish-failure
  wearing a different hat. Any code path that can make a ruleset disappear must be loud.
- Commit: this commit.

## 2026-07-17 — Foundry's 4-hour JS cache fabricates evidence
- Symptom: after redeploying the top-level-namespace fix, `globalThis.battleframe` read
  `undefined` in the live world while `game.battleframe` existed — exactly the signature of
  the OLD build. The obvious conclusion was "the fix does not work in production."
- Fix: **that conclusion was wrong.** The server was serving a **byte-identical** copy of the
  new build (32,099 bytes, 17 `globalThis` references, `Last-Modified` matching the deploy).
  Foundry serves system JS with `Cache-Control: max-age=14400` — the browser keeps running
  the old bundle for **four hours** and does not even revalidate. Purging `caches` and
  unregistering service workers does nothing; neither is involved. It is the plain HTTP cache.
  Documented in `docs/DEPLOY.md` and the vault.
- Surfaces: `docs/DEPLOY.md`, `vault/foundry-systems/spike-results-live-v14.md`.
- Watch: **This trap manufactures false evidence for a plausible wrong conclusion**, which
  makes it worse than a plain bug. The check that saved it: fetch the served bytes with a
  cache-buster and `cmp` them against the local build. If the server has your build and the
  world disagrees, it is the cache — not your code. Pairs with the same day's other lesson:
  three agents reported "build exit 0" while `tsc` exited 2. **Verify the thing you actually
  care about, not a proxy for it.**
- Commit: this commit.

## 2026-07-17 — Playing one round found what 189 tests could not
- Symptom: placing 12 real knights on a real board and running one round exposed two bugs
  that the entire suite, a clean typecheck, and my own live probe had all missed.
  **(1)** `measure.between` returned **0 for every pair** of real tokens — two knights three
  inches apart measured zero. **(2)** Base contact could never fire, so a full round spent 14
  dice and produced **zero damage and zero courage tests**.
- Fix (1): `getBase` read `token.flags`, but **a canvas Token has no `.flags`** — they live on
  `token.document.flags`. So every real token fell through to `deriveBaseFromFootprint`, which
  read `token.width`/`.height` — **PIXI container bounds** (measured: 9 and 32), not grid
  units. `max(9,32) × 25mm` = 800mm diameter → **15.748in radius** for a 32mm base. Every
  knight became a 32-inch model; everything overlapped; every distance collapsed to 0. Now
  reads `document.flags` first, derives only from `document.width`, and **throws** when there
  is nothing legitimate to derive from — the only remaining candidate was the PIXI bounds that
  caused the bug.
- Fix (2): see the next entry — base contact needs a tolerance.
- Surfaces: `packages/battleframe/src/base/{base-model.ts,types.ts}`, tests + fixtures.
- Watch: **All 189 tests passed because every one handed `between()` a synthetic object with
  top-level `flags`.** The code was written against the tests' shape rather than Foundry's,
  and the tests were written from the same misunderstanding — so they agreed with each other
  and both were wrong. My own live probe an hour earlier made the identical mistake and
  produced a `confirmed` vault note saying measurement was "EXACT". **A test double that does
  not resemble the real object in the one way that matters is worse than no test: it
  manufactures confidence.** The new fixture deliberately carries *wrong-but-present*
  top-level `width: 9, height: 32` — omitting them wouldn't catch this, because `undefined`
  fails loudly while `32` produces a plausible silent error.
- Commit: this commit.

## 2026-07-17 — Base contact could never fire; `=== 0` is measure-zero in a VTT
- Symptom: a real round on a real board spent 14 dice and produced **zero damage and zero
  courage tests**. `Blue Knight 1: bash has no enemy in base contact -- die not spent`, for
  two knights placed deliberately touching.
- Fix: **Foundry stores token x/y as integers.** Two 32mm bases cannot sit at exactly
  125.98425196850394px apart — Foundry rounded to 337 and 463, a 126px gap, so base-to-base
  was **0.0001574803149606563"**, not `0`. `isInBaseContact` tested `distance === 0`. In a
  pixel-coordinate VTT, exact contact is **measure-zero — it essentially never occurs**, and
  base contact is GREATHELM's *only* spatial relation (`base-contact-and-engagement.md`,
  `confirmed`: no zone of control, no engagement range). So the game could not work.
  Tolerance is **2 pixels, converted per-scene** — the error source is integer rounding of
  positions, so the bound is in *pixels*, not inches: two tokens compound to ≈1.414px, 2px
  clears it and nothing more, and stays under Foundry's token outline so knights can never
  appear to fight across a visible gap. It lives in GREATHELM, not core — core reports a
  distance; "what counts as touching" is a ruleset judgement. Not in `constants.ts`: that
  file's contract is "GREATHELM numbers from the QSR", and this is a VTT artefact, not a rule.
- Surfaces: `packages/battleframe-greathelm/src/combat/clash.ts`, `src/ui/round-control.ts`,
  new `tests/base-contact.test.ts`. 204 → 218 tests.
- Watch: **There were THREE `=== 0` checks, not one.** Beyond `findDefenderInBaseContact`,
  both courage views computed `inBaseContactWithEnemy` independently. Fixing only the obvious
  one would have produced clashes that damage knights, then a courage phase that thinks
  everyone is disengaged mid-melee — a *worse* bug, because it would look like it worked. A
  converge scan predicted this exact failure hours earlier and called it "latent, not
  currently failing"; playing one round made it current. **When a predicate is duplicated,
  fixing one copy is worse than fixing none.**
- Commit: this commit.

## 2026-07-17 — The rules were right; the game was missing
- Symptom: a full round plays correctly in a live world — pool sizing, 6→1, contact, opposed
  clashes, damage, courage — and **the player makes zero decisions**. Dice are assigned
  round-robin.
- Fix: specced the player layer (`docs/specs/2026-07-17-greathelm-player-layer.md`).
  `vault/greathelm/action-economy-per-die-not-per-model.md` (`confirmed`) is unambiguous: the
  pool is a **player-level** resource, any die may activate any knight, there is no activation
  limit, one knight may take every action. **Choosing which knight spends which die IS
  GREATHELM.** Round-robin does not approximate that choice — it deletes it, leaving an
  auto-battler that happens to obey the rules. SS-13's own code said so: *"it is not an AI and
  does not claim to be a good one. A real per-die knight picker is the obvious next
  increment."*
- Surfaces: new design + spec; 5 sub-specs; core untouched.
- Watch: **the architectural consequence is a prediction coming true.** Player agency forces
  `runRound` from a pure function into a **suspendable session** — which is exactly what the
  original design predicted from INX (reactions interrupt an activation) and Classic
  BattleTech (*"the target chooses"* before the attacker rolls): *"attack resolution cannot be
  a pure function; it must suspend and prompt another player."* That was filed as the
  toolkit's Resolution Stack, Phase 5, gated on three rulesets. It arrived early from a fourth
  direction — the player's own turn. **Do NOT generalise it into core or a toolkit now: one
  example is not evidence.** That restraint is the entire point of Approach C, and this is the
  first real test of it.
- Commit: this commit.

## 2026-07-17 — Run a grep-based criterion against the current tree BEFORE trusting it
- Symptom: SS-05's headline criterion — the one whose only job is to prove round-robin is
  dead — grepped for **`assignDiceRoundRobin`**, a function that **does not exist**. The real
  one is `assignDiceToKnights` (`round-control.ts:248`, called at `:495`). A grep for a
  nonexistent name matches nothing, so the check **passed today, with round-robin fully
  wired.** Caught by a prep agent, not by me.
- Fix: corrected the identifier, then ran **every** grep-based criterion in the new spec
  against the current tree and confirmed each **fails**: round-robin-dead fails, player-layer-
  in-bundle fails, notifyUser-bound fails. The core-ignorance guard passes, correctly — it
  protects an invariant that already holds.
- Surfaces: `docs/specs/2026-07-17-greathelm-player-layer.md` SS-05.
- Watch: **This is the FOURTH check in this project that measured nothing** — after nine
  inverted negative greps (`grep -c X returns 0` exits 1 when it matches nothing, failing
  exactly when satisfied), a literal `<placeholder>` a gate executed verbatim, and acceptance
  criteria that dead code fully satisfied. Every one was in the *checks*, never the
  implementation.
  **The rule that would have caught all four, in thirty seconds each:** before trusting a
  grep-based criterion, **run it against the tree as it is now and confirm it FAILS.** A check
  that passes before the work is done is not a check — it is a decoration that will be
  reported as a pass. Same principle as the mutation testing the fix agents have been doing:
  a test that passes both before and after is a passenger.
  Also fixed from the same review: a `[STRUCTURAL]` criterion describing runtime lifecycle
  (retagged `[BEHAVIORAL]` — a static tag invites a fake grep), and SS-04 shipping against
  `DialogV2` (zero vault notes at any confidence) with no `[HUMAN REVIEW]`. **A feature-detect
  that has never been watched succeed is a hypothesis, not a fallback.**
- Commit: this commit.

## 2026-07-17 — Prep caught a deadlock the spec made unsatisfiable
- Symptom: SS-01 required "a knight removed mid-round does not break the session", but the
  session surface had no way to spend a die **without** activating a knight. A prep agent
  showed the criterion was therefore **unsatisfiable**: a side whose knights are all gone
  still holds dice with no legal target — never illegal, never spendable, never complete. The
  round **deadlocks below `isComplete()`**.
- Fix: added `discardDie(dieId, reason)` to SS-01, and strengthened the criterion to say the
  round must reach completion — **it must never deadlock**. This is the explicit form of what
  `round-control.ts:570` already does implicitly (notify + skip a clash die with no defender).
  Also clarified SS-02: the panel shows **every unspent die, both sides** — 6→1 is a **global**
  rule, so a die is unavailable because the *opponent* holds a higher face, and an
  active-side-only panel cannot explain why your 4 is greyed out.
- Surfaces: `docs/specs/2026-07-17-greathelm-player-layer.md` SS-01, SS-02.
- Watch: **the i18n gate has a blind spot, and it is the one that already bit us.** A key built
  as `` `battleframe-greathelm.reasons.${reason}` `` is invisible to a grep for literal keys —
  which is exactly how three keys shipped missing while every test passed. SS-02 now requires
  keys to be a literal exhaustive `Record` over the reason union, so adding a reason **breaks
  the build** instead of rendering a raw key at the table. **A gate you can route around is
  not a gate** — the same lesson as the four checks that measured nothing, wearing different
  clothes.
  Both prep agents independently caught the `assignDiceRoundRobin` error. Independent
  corroboration is worth more than a second opinion from the same context.
- Commit: this commit.

## 2026-07-17 — The factory refused to dispatch: two parallel sub-specs shared a file
- Symptom: the factory ran and completed **0/15** sub-specs. Exit 0 from the shell wrapper
  masked an internal exit 2 (`deferred_manual`). Nothing was dispatched.
- Fix: `gate=file-conflict reason=packages/battleframe-greathelm/lang/en.json
  sub_spec_a=SS-02 sub_spec_b=SS-04`. Both modify `lang/en.json`; both depended only on
  SS-01, so they sat in the same wave and would have **raced on the same file**. Declared the
  dependency instead of dodging it: SS-04 now `depends_on: ['SS-01','SS-02']` — it needs SS-02
  for a *file*, not for code. Splitting the lang file to regain the parallelism would be a
  build artefact shaped by a scheduler. Costs one wave; honest.
- Surfaces: master spec SS-04 frontmatter + Requirement 2; phase spec SS-04 frontmatter.
- Watch: **the gate did its job and I should have caught this while writing the spec.** Any two
  sub-specs in the same wave that touch the same file will race — check `Files (modify)`
  across a wave before declaring the DAG done. Also: the factory's coherence pass
  independently flagged `assignDiceRoundRobin`, and was right that I had only fixed the
  *criterion* — **Requirement 2 still named the nonexistent function.** Fixing a claim in one
  place and not the other is how the vault ended up with a `confirmed` note saying measurement
  was "EXACT" while the code returned 0. When a fact is wrong, grep for every copy of it.
- Commit: this commit.

## 2026-07-17 — Highlighting: tint the mesh, never refresh it; keep the render handle apart from the measurement double

**Decision.** `resolveTintApi().setTint` writes `token.mesh.tint` and returns. It does NOT call
`placeable.refresh()`. `RoundKnight` gains a `placeable` field (the real canvas Token, for
rendering) kept deliberately separate from `token` (a reshaped double carrying only what
`measure.between` reads).

**Why.** Measured live on v14.363, controlled experiment: write-alone holds indefinitely;
write-then-`refresh()` reads back `#ffffff` after ~800ms. `refresh()` recomputes `mesh.tint`
from `document.texture.tint`, which is white because highlighting deliberately never writes the
document. The helper destroyed its own write on its last line. The two knight shapes stay apart
because the measurement double has no `.mesh` — tint it and nothing happens, silently.

**Scope.** Stays in the module for now. `resolveTintApi` is pure Foundry-version plumbing with
zero GREATHELM semantics and is a strong candidate for core (same category as `measure` and
`base-model`) — deferred until a second ruleset needs it, per the standing rule that anything
generalised from one ruleset will be that ruleset's shape.

Related: `vault/foundry-systems/token-tinting-is-mesh-tint-and-it-survives-refresh.md`.

## 2026-07-17 — Area service: exact base-aware containment, not Region#testPoint
- Symptom: The backlog demanded "read spike-results-regions.md before designing anything here."
  That file never existed — the prerequisite was never run — and its committed default
  (`preview(shape) -> {commit, cancel}`) was built around a persistence problem nobody had
  measured. The vault also claimed MeasuredTemplates were deleted in v14.
- Fix: Ran the spike live on v14.363. An UNSAVED Region computes polygons/area/bounds/testPoint
  with zero persistence and zero server round-trip, so commit/cancel is dropped and two of four
  ACs (no orphan on cancel, none on disconnect) are vacuously true — nothing is ever created.
  Containment does not use testPoint: it tests a point while models are discs, and a Region
  circle is a 63-vertex inscribed polygon, 0.165% under-area, biased toward excluding. Exact
  arithmetic on the base model instead, consistent with measure.between. MeasuredTemplates are
  deprecated in v14, removed in v16 — vault corrected.
- Surfaces: `game.battleframe.areas` — circle, rectangle, contains, tokensInside, toRegionShapes.
  Containment mode (`base-overlap` | `centre`) is the ruleset's choice; core does not pick,
  because the researched games disagree and that makes it a rule.
- Watch: There is no decidable "exactly touching" — (3+r)*20 and 3*20+r*20 differ by 1.42e-14,
  so `contains` promises only correct resolution either side of the boundary. A ruleset needing
  exact touch must define a tolerance in rules units, as greathelm's clash does. Cones and lines
  are unbuilt: both need a base-overlap-against-arc/capsule decision no ruleset has asked for.
- Commit: feat(core): area service — exact base-aware containment on gridless boards

## 2026-07-17 — The dice service threw away the Roll; nothing could animate it
- Symptom: The design specifies the dice service as a thin passthrough *because*
  "thin = Dice So Nice works free" (design line 134), and carries a HUMAN REVIEW
  item asserting it animates. It cannot. `dice.roll` evaluated a `Roll`, read
  `formula` and `total` off it into primitives, and `postRollToChat` rendered
  those into an HTML string and called `ChatMessage.create({content, flavor})`.
  The Roll object never reached the message. Foundry attaches dice to a message
  via `rolls`; that is what the breakdown tooltip is built from, what roll modes
  gate on, and what Dice So Nice hooks. A message carrying only pre-rendered
  numbers has no dice on it, so it animates nothing — and reads perfectly.
- Fix: Pass the evaluated Roll through `RollChatCardData.roll` and attach it as
  `rolls: [roll]`. The template never reads it; `renderRollChatCard` is unchanged
  and the card is unchanged. **Thin was never the problem** — the passthrough was
  thin in the one way that didn't help. No Dice So Nice dependency and no module
  detection: the free integration is free only if the Roll travels with the
  message.
- Surfaces: `packages/battleframe/src/dice/chat.ts` (`RollChatCardData.roll`,
  `postRollToChat`), `packages/battleframe/src/dice/dice.ts`. Every ruleset roll
  goes through here — greathelm's initiative, clash, and courage tests all inherit
  the fix.
- Watch: **The `rolls` create-data field name is UNVERIFIED against a live v14** —
  it comes from the docs, not observation, and is marked as such in place. A wrong
  field name animates nothing and throws nothing: the identical silent failure to
  the bug being fixed. The tests mock `ChatMessage` and therefore *cannot* detect
  it; only the live Dice So Nice HUMAN REVIEW item can. More generally: a card that
  renders the right numbers is not evidence the message carries dice.
- Commit: fix(core): attach the Roll to its chat message so dice can animate

## 2026-07-17 — Victory was unreachable: a rule routed through an optional member
- Symptom: `resolveRoundEnd` called `checkVictory(knights)` with `RoundKnight[]`.
  `RoundKnight` has **no `isRemoved`** — only `toSessionKnight` ever added one —
  and `CheckVictoryKnight.isRemoved` is **optional**, defaulting to "in play".
  So it typechecked, every knight read as alive, and the check returned
  `continue` forever: a round loop with no end, behind a green suite and 12
  passing `checkVictory` tests. The pure function was correct the whole time;
  nothing correct was ever handed to it. Underneath sat the other half: QSR p2
  removes a knight by damage **or** by fleeing, `victory.ts` asserted in a doc
  comment that `isRemoved` "treats both identically", and the only `isRemoved`
  checked damage. `runCouragePhase` computed outcomes, `courageOutcomes()`
  exposed them, and **nothing consumed them** — a fled knight blocked its
  player's defeat and was re-gathered next round as if it had never run.
- Fix: `round/removal.ts` holds both routes out of play, read live from the Actor
  (never snapshotted — a knight routed mid-round must drop out on the next call).
  `session.ts` persists courage failures via `actor.update`, a namespaced flag
  rather than a schema field: fleeing is scenario state, not a stat, and a flag
  needs no migration for knights that predate the check. `toVictoryKnights`
  makes the RoundKnight→CheckVictoryKnight translation **explicit and tested**.
  `victory.ts`'s comment now points at the shared rule instead of asserting a
  guarantee it could not make.
- Surfaces: `packages/battleframe-greathelm/src/round/removal.ts` (new),
  `round/session.ts` (`persistCourageFlight`), `round/loop.ts` (`ActorLike.flags`),
  `ui/round-control.ts` (`toVictoryKnights`, `toSessionKnight`), `round/victory.ts`.
- Watch: **An optional interface member is not a seam to route a rule through.**
  `isRemoved?` made "the caller forgot the rule" and "nobody has been removed"
  the same program — indistinguishable to the compiler and to every test. That is
  how a rule went missing while its own unit tests stayed green. Where a default
  must exist for ergonomics, make the *translation* an explicit exported function
  and test that, rather than letting each call site hand-roll the predicate. Note
  the family resemblance to the tree-shaken bundle: both are **reachability**
  failures — correct code nothing reaches — and both passed every existence check.
  Also: the `fled` flag persists on the Actor with no reset path, exactly as
  `system.damage` already does. Consistent, but a fresh battle needs both cleared.
- Commit: feat(greathelm): end the game — victory check, action hints, and both routes out of play

## 2026-07-17 — The running version was a pinned literal, coupled to nothing
- Symptom: `registry.ts` held `const RUNNING_BATTLEFRAME_VERSION = "0.1.0"`,
  agreeing with `system.json` by coincidence. It is the value a ruleset's
  `battleframeCompatibility.minimum` is compared against in `validate.ts`, so a
  stale literal fails **backwards**: bump `system.json` to `0.2.0` and a ruleset
  correctly requiring `>= 0.2.0` is rejected — "requires battleframe >= 0.2.0,
  but the running system is 0.1.0" — with no error, just refused good work. The
  converge report flagged it as "hardcoded, nothing couples them".
- Fix: `src/version.ts` resolves it from two sources, neither able to drift.
  `game.system.version` is the runtime authority — literally what Foundry parsed
  from the manifest and loaded, and present by the time a ruleset's `init` calls
  `registerRuleset`. When `game` is absent (tests, top-level registration before
  init), it falls back to `system.json` **imported at build time** (`MANIFEST_VERSION`),
  which is the file itself rather than a transcribed number. `resolveJsonModule`
  is already on; the import inlines the manifest into the bundle.
- Surfaces: `packages/battleframe/src/version.ts` (new),
  `src/rulesets/registry.ts` (calls `runningBattleframeVersion()`),
  `tests/version.test.ts`. `validate.ts` was already parameterized on
  `runningVersion` — the literal was the only coupling point.
- Watch: `game.system.version` is trusted only when `game.system.id === SYSTEM_ID`,
  so a different active system cannot spoof the check. The build-time fallback can
  only ever be *behind* a bumped runtime, never ahead, and only in no-`game`
  contexts where no user-facing compat decision rides on it. If a ruleset ever
  registers at module top level rather than in `init`, it gets the fallback — fine
  today because greathelm registers in `init`.
- Commit: fix(core): couple the running version to system.json instead of a pinned literal

## 2026-07-17 — The win banner named one knight for a whole warband
- Symptom: `sideLabel(playerId, knight)` returned `knight?.name`, so a warband
  victory announced "Sir Bedwyr wins" — one model named as if it were the army.
  The `playerId` it receives is a **disposition id** (`sideFromDisposition` →
  `"friendly"`/`"hostile"`), which is what a GREATHELM side actually is: the QSR
  gives warbands no identity ("warband construction" is `not found` in the
  vault), so a side is a disposition and nothing finer.
- Fix: `sideLabel(playerId)` drops the knight entirely and localizes the side —
  new `side.friendly`/`side.hostile` keys → "The hostile warband wins". Falls
  back to the id (`"hostile"`, still readable) rather than a raw i18n key for an
  unmapped disposition.
- Surfaces: `packages/battleframe-greathelm/src/ui/round-control.ts` (`sideLabel`,
  now exported and unit-tested; `resolveRoundEnd` drops its dead knight lookup),
  `lang/en.json` (`side.*`), `tests/side-label.test.ts`.
- Watch: The original comment had the right instinct — a raw disposition id is
  engine vocabulary, not player prose — and then fixed it by naming the wrong
  thing. Reaching for *a* value that is present (a knight's name) over *the*
  value that is correct (the side) is the same shape as the victory-wiring bug
  in the same file: convenient-but-wrong beats absent, and reads fine until a
  human sees it. A side is not a knight; do not label it with one.
- Commit: fix(greathelm): win banner names the side, not one of its knights

## 2026-07-17 — Measurement space was decided by grid settings, not scene identity
- Symptom: `assertSameMeasurementSpace` compared only `grid.size/distance/units`.
  Two **different** scenes with identical grid settings — the common case, since
  most gridless scenes share the same grid — passed the check and produced a
  plausible-but-meaningless base-to-base distance. The measure.ts comment
  admitted it: "Scenes carry no id on `SceneLike`, so the grid parameters are
  what we can compare." Grid parameters cannot tell two scenes apart; only an id
  can. The earlier commutativity entry flagged this same gap in its Watch.
- Fix: added `id?: string` to `SceneLike` and made identity a three-tier check:
  same reference → same space; both ids present → **the id decides** (equal ids
  are the same space even across distinct grid-object instances, which is exactly
  how the greathelm round hands each token its own reshaped double; differing ids
  mismatch even with byte-identical grids); either id absent → fall back to grid
  comparison for plain-object callers and tests. Real Foundry Scenes always carry
  `.id`, and `round-control.ts` already threads `placeable.scene` through, so the
  stronger check engages in-game with no caller change.
- Surfaces: `packages/battleframe/src/base/types.ts` (`SceneLike.id`),
  `src/measurement/measure.ts` (`assertSameMeasurementSpace`),
  `tests/measure.test.ts` (distinct-scenes-same-grid throws; same-id-distinct-grid
  allowed).
- Watch: the fallback still *assumes* equal grids without ids are the same scene —
  it cannot prove it. That is unavoidable for id-less doubles and is why the id
  tier is checked first. A caller that builds doubles from real scenes should
  always carry the id through (greathelm does); dropping it silently downgrades
  the check to the weaker proxy without any error. The RED test failed before the
  fix (no throw) and passes after — the same-id test passed before via the grid
  fallback and still does, so it is a passenger guarding the id short-circuit, not
  proof of the new behaviour; the distinct-scenes test is the load-bearing one.
- Commit: fix(core): decide measurement-space identity by scene id, not just grid

## 2026-07-17 — A knight's battle state had no reset path; a second battle was unplayable
- Symptom: the three things a battle writes to a knight — `system.damage`
  (persisted by `applyClashDamage`), the `fled` flag (`markFled`), and momentum
  — all persist on the Actor document and none reset. The victory entry's own
  Watch flagged it: "a fresh battle needs both cleared." So a second battle began
  with every knight still carrying the first battle's wounds and flight, and
  `checkVictory` would declare a winner before the first die was thrown. The only
  way to replay was to hand-edit every knight.
- Fix: `resetKnight(actor)` returns a knight to pristine state — `system.damage`
  0, `system.momentum` 0, and the `fled` flag *deleted* (Foundry's `-=` key-removal
  idiom, the exact inverse of `markFled` setting it) — in a single `actor.update`.
  Reachable via a new **"New Battle"** scene control tool, which is GM-only (it
  writes shared Actor state) and confirms first through `promptResetConfirmation`.
  That confirmation's no-dialog and error paths return `false` — unlike the other
  prompts, whose no-dialog default is a safe *game* choice, a reset is destructive
  and a missing confirmation is never consent.
- Surfaces: `packages/battleframe-greathelm/src/round/removal.ts` (`resetKnight`),
  `src/ui/choice-prompts.ts` (`promptResetConfirmation`),
  `src/ui/round-control.ts` (`resetBattleFromControl`, second tool in
  `addRoundSceneControl`), `lang/en.json` (`controls.newBattle.*`,
  `prompts.resetBattle.*`), `tests/removal.test.ts`, `tests/choice-prompts.test.ts`.
- Watch: the button-wiring shares the round tool's payload shape, which IS
  live-verified on v14.363, so it accommodates both `getSceneControlButtons`
  idioms without asserting either — but a GM running battle two live is still the
  check that settles that the tool appears. Reachability was grepped in the built
  bundle (`resetKnight`, `resetBattleFromControl`, `greathelm-new-battle` all
  present) so this is not another dead-code-satisfies-existence trap. The reset
  clears momentum defensively: no code currently persists `system.momentum` via
  `update`, so today that key is a 0→0 no-op, but it is a schema field a battle is
  meant to accrue and the reset must own the whole fresh-knight state, not the
  subset that happens to be wired now.
- Commit: feat(greathelm): New Battle control — reset every knight for a fresh game

## 2026-07-17 — The New Battle reset shipped with no test on its safety ordering
- Symptom: `resetBattleFromControl` is destructive — it clears every knight's
  wounds, momentum and flight — and landed with only its pieces tested
  (`resetKnight`, `promptResetConfirmation`), never the orchestrator that decides
  *whether* to reset. A reorder that confirmed after resetting, or dropped the
  GM gate, would have passed the whole suite.
- Fix: added a `resetBattleFromControl` block that stubs the world (game/canvas/
  ui/foundry) and pins the ordering: non-GM is refused, an empty canvas never
  opens the dialog, and a cancelled *or* absent confirmation resets nothing —
  absence is not consent. Also asserts both scene-control tools register in either
  payload shape. The reset payload itself stays tested in `removal.test.ts`.
- Surfaces: `packages/battleframe-greathelm/tests/round-control.test.ts` only;
  no production change.
- Watch: the two "resets nothing" tests were mutation-verified — replacing the
  `if (!(await promptResetConfirmation())) return 0;` guard with a bare
  `await promptResetConfirmation();` failed exactly those two and nothing else, so
  they guard the real property and are not passengers. The orchestrator still is
  not exercised against a live canvas; these stubs prove the control flow, not
  that Foundry's `getSceneControlButtons` calls the click handler — that remains
  the live HUMAN REVIEW item.
- Commit: test(greathelm): cover the New Battle control's destructive-action safety

## 2026-07-17 — The dice `rolls` field name was doc-confirmed; only the animation stays live-only
- Symptom: `chat.ts` attached the evaluated Roll to `ChatMessage.create` as
  `rolls: [roll]` but carried a standing "UNVERIFIED against a live v14 … comes
  from the docs, not observation" warning, treating the field *name* as an open
  risk equal to the silent bug it fixed.
- Fix: verified the name against Foundry's official v10 migration article — the
  ChatMessage `rolls` field "now contains an array of Roll objects instead of a
  single roll", singular `roll` deprecated, and that shape carries through v14.
  So `rolls: [roll]` is correct, and `dice.test.ts` already pins it
  (`payload.rolls === [result]`) against an accidental rename. Narrowed the
  comment: the residual live-only unknown is only whether Dice So Nice, a
  third-party module, animates off the attached Roll — not the field name.
- Surfaces: `packages/battleframe/src/dice/chat.ts` (comment only; no behaviour
  change). Verified via context7 against `/websites/foundryvtt_article`.
- Watch: this is a "verify the thing you care about" close-out, not a new
  behaviour — the test and the code were already right; only the recorded
  confidence was stale. Do not read this as clearance that Dice So Nice works;
  that still needs the live HUMAN REVIEW. A doc-confirmed field name plus a
  mock-based payload test is strong evidence the message *carries* dice, and no
  evidence at all that a specific module *renders* them.
- Commit: docs(core): the dice rolls field name is doc-confirmed, not unverified

## 2026-07-17 — Deleted the superseded round loop; the live game runs through session.ts
- Symptom: `loop.ts` still held `runRound`, `resolveBattlePhaseOrder` and
  `writeRoundOrderToCombatFlags` — the whole atomic auto-battler the player layer
  replaced. They had zero production callers (`runRound` called the other two;
  nothing called `runRound`); the live round runs gather → session → pool-panel →
  `resolveDieAction`. This is the third time this project has been bitten by a
  dead round loop — two prior entries (the tree-shaken 146-line bundle, and "the
  round loop was never in the product"). Worse, `writeRoundOrderToCombatFlags` was
  a documented *trap*: it assigns to a plain `flags` object that "does not reach
  the database" on a real Combat document, and `round-control.ts` had already
  reimplemented persistence correctly via `combat.setFlag`. Two encodings of turn
  order, one of them broken, kept alive only by its own tests.
- Fix: removed the three functions plus their only-local helpers (`rotateToFirst`,
  `RunRoundOptions`, `RoundResult`) and the now-unused `actionForFace`/courage
  imports. Deleted `loop.test.ts`, which tested only those three. Kept everything
  live: `resolveDieAction`, `applyClashDamage`, and the shared types `RoundDie`/
  `ResolvedDie`/`ActorLike`/`ClashParticipantRef`. Kept `CombatLike`/
  `BattleframeCombatFlags` too — `round-control.ts`'s `CombatDocumentLike extends
  CombatLike`, so they are load-bearing despite the writer being gone. Updated the
  two round-control comments that pointed at the deleted code (one also named a
  round-robin assigner already removed with the player layer).
- Surfaces: `packages/battleframe-greathelm/src/round/loop.ts` (223 → 96 lines),
  `tests/loop.test.ts` (deleted), `src/ui/round-control.ts` (two comments).
- Watch: the bundle was byte-for-byte unchanged (47.59 kB) — these functions were
  already tree-shaken out, so this is source hygiene, not a shipped-code fix. That
  is exactly why it mattered: dead-but-present code with green tests is what caused
  the two prior round-loop incidents. Verified live functions still pass (322
  tests, was 325 — the drop is the three deleted dead-function suites) and the dead
  symbols are absent from the built bundle. `resolveBattlePhaseOrder` encoded the
  6→1 alternating order; that rule now lives only in `session.ts`, whose own tests
  cover it — one encoding, not two that can drift.
- Commit: refactor(greathelm): delete the dead round loop superseded by session.ts

## 2026-07-17 — Courage difficulty ignored allies already removed; the death-spiral never gathered
- Symptom: QSR p2 (`courage-test.md`, `confidence: confirmed`): difficulty =
  (allied knights removed from play) + (damage on the testing knight). `courage.ts`
  models this exactly, and `runCouragePhase` takes an `initialAlliedRemoved` seed
  for the allies already off the board — but the live caller, `session.ts`'s
  `maybeCompleteRound`, invoked `runCouragePhase(dice, warbandsKnights)` with **no
  seed**. So difficulty started at 0 and counted only knights that fled *during*
  the phase (the cascade). A warband that had already lost knights to damage this
  round, or to flight in an earlier round, faced tests as easy as if it were at
  full strength. The vault calls the cascade "the game's real losing condition";
  the missing seed removed its main input, so warbands almost never collapsed.
- Fix: seed `initialAlliedRemoved` per side with the count of currently-removed
  allies — `knights.filter(k => k.playerId === p && isRemoved(k)).length` — and pass
  it. No double-count with the cascade: the seed is phase-start state, and knights
  that flee mid-phase are persisted (`persistCourageFlight`) only *after*
  `runCouragePhase`, so they are invisible to `isRemoved` at seed time and are
  accounted for solely by the cascade's `removed += 1`.
- Surfaces: `packages/battleframe-greathelm/src/round/session.ts`
  (`maybeCompleteRound`), `tests/session.test.ts` (a removed ally raises a
  tester's difficulty to 2, not 1).
- Watch: the fifth instance of this project's endemic species — a correct pure
  function handed the wrong (or no) input by its live caller, passing every
  unit test while the rule goes missing (see: momentum, courage *outcomes*,
  victory `isRemoved`, and the round loop). The tell each time is a parameter or
  return value that only tests supply or read. `initialAlliedRemoved` existed and
  was defaulted; nothing live populated it. The new test failed against the old
  caller (difficulty 1) and passes now (2) — the seed is load-bearing, not a
  passenger. The intra-phase cascade itself remains `confidence: partial` in the
  vault (no source states a mid-phase flee raises later difficulty); this fix does
  not touch that — it wires only the confirmed phase-start count.
- Commit: fix(greathelm): courage difficulty counts allies already removed, not just this-phase flights

## 2026-07-17 — Initiative had a dead conditional; the equal-nonzero-face path was untested
- Symptom: `determineInitiative` matched equal counts at a face with
  `if (a === b) { if (a > 0) { continue; } continue; }` — both branches identical,
  and a comment ("keep descending unless we're already comparing 6s and it's a
  full tie") describing conditional behaviour the code did not have. Separately,
  the one initiative path the comment gestured at — both players holding *equal
  nonzero* 6s, decided at a lower face — had no test; only the both-*zero* descent
  and the full-tie cases were covered.
- Fix: collapsed the branch to `if (a === b) continue;` with a comment that matches
  what it does. Verified behaviour-preserving (the two branches were provably
  identical) and added the missing test: `[6,6,5]` vs `[6,6,4]` descends past the
  tied 6s and yields `{ choose, a }` — a *choice*, not `forced-first`, since both
  hold 6s.
- Surfaces: `packages/battleframe-greathelm/src/round/dice-pool.ts`
  (`determineInitiative`), `tests/dice-pool.test.ts` (new descent case).
- Watch: this is cleanup, not a fix — the old code produced the right answer, it
  just said it did so conditionally when it didn't. The value is the closed
  coverage gap: nothing had pinned that equal nonzero 6s descends rather than
  forcing first, which is exactly the boundary between the `forced-first` and
  `choose` outcomes. `forced-first` requires the *loser* to hold zero 6s; a future
  edit that widened it to any 6s advantage would now break a test instead of
  silently changing turn order.
- Commit: refactor(greathelm): collapse initiative's dead branch, cover equal-nonzero descent

## 2026-07-17 — Neutrality was tested for imports, not vocabulary; two comment leaks had slipped through
- Symptom: the neutrality integration test proved core imports no ruleset package,
  but not that core stays *ignorant of ruleset concepts*. The decision log calls
  the vocabulary check "the load-bearing one ... the mechanical proof that core
  stays ruleset-neutral", yet it had only ever been a spec criterion, never an
  automated test. On adding it, it went red immediately: `areas/area.ts` reasoned
  about "a knight whose base is half under a blast", and `measurement/measure.ts`
  said "the greathelm round hands each token its own reshaped double" — the second
  a comment I had written earlier this same session while fixing scene identity.
  No import, but core now named a GREATHELM concept.
- Fix: added `no file under packages/battleframe/src speaks a ruleset's vocabulary`
  — scans core src for GREATHELM proper nouns (knight, momentum, courage, warband,
  greathelm) that have no generic engineering meaning. Neutralised both comments
  ("a model whose base", "a ruleset may hand each token"). The term list is built
  from string parts so the checker never matches its own source.
- Surfaces: `packages/battleframe/tests/integration/neutrality.test.ts` (new case),
  `src/areas/area.ts` and `src/measurement/measure.ts` (comments only).
- Watch: mutation-verified — appending `// knight momentum` to `constants.ts` fails
  the test; reverting passes it. The vocabulary list is deliberately conservative
  (unmistakable proper nouns only) to avoid false positives on generic words a
  future core service might legitimately use ("clash", "sprint", "bash" were left
  out for that reason). It is a floor, not a ceiling: it cannot prove core is
  neutral, only catch the named-concept leaks that are the common failure. That an
  in-session comment tripped it is the point — neutrality erodes through prose long
  before it erodes through imports.
- Commit: test(core): assert core speaks no ruleset vocabulary, and fix two comment leaks

## 2026-07-17 — The public API surface was asserted for three of four services; areas was reachable-in-code, tested-nowhere
- Symptom: `game.battleframe` is the whole contract a ruleset module builds
  against — `{api, measure, dice, areas}`. The entry-point test pinned `api`,
  `measure` and `dice`, but **`areas`** — the AoE primitive — was installed
  (`installAreaApi()` at the entry point) yet asserted nowhere. Dropping that one
  line would vanish `game.battleframe.areas` with a green suite: the same
  reachability failure that once shipped a 7-line bundle, in miniature.
- Fix: one test that pins the entire surface — all five `api` methods
  (`register/activate/getActive/get/list`), `measure.between`, `dice.roll`, and
  all five `areas` methods (`circle/rectangle/contains/tokensInside/toRegionShapes`)
  — asserting each is a function at the namespace a module actually reads, with a
  message that names which service/method is missing.
- Surfaces: `packages/battleframe/src/battleframe.test.ts` (one new case); no
  production change.
- Watch: mutation-verified — commenting out `installAreaApi()` fails with
  "game.battleframe.areas is missing", and nothing else. This is the standing rule
  from the dead-bundle entry applied to the last service that lacked it: **every
  public service must be asserted at the entry point, not only in its own unit
  test**, because unit tests import the service directly and cannot see it fall out
  of the shipped namespace. The surface list is now the single place that has to be
  updated when core gains a fifth primitive — which is the point.
- Commit: test(core): pin the complete game.battleframe public API surface

## 2026-07-17 — The areas primitive accepted degenerate dimensions silently; base-model already didn't
- Symptom: `circle()` and `rectangle()` built an area from whatever radius/width/
  height they were handed. A zero or negative extent produced a silently
  meaningless containment result — a blast that catches everything or nothing —
  with no error. `base-model` already refuses this for a base (`InvalidBaseSizeError`),
  but its sibling geometry primitive, the one a ruleset will call to build blast
  markers, did not.
- Fix: added `InvalidAreaError` and validate in the two factories, the documented
  `game.battleframe.areas` construction path. The guard is `!(value > 0)` rather
  than `value <= 0` so `NaN` is rejected too — a ruleset computing a radius from a
  weapon profile that divides by zero should fail loud here, not produce an area
  that quietly matches nothing.
- Surfaces: `packages/battleframe/src/areas/area.ts` (`InvalidAreaError`,
  `assertPositive`, both factories), `tests/areas.test.ts`.
- Watch: this hardens an existing shipped primitive to match a sibling's contract;
  it is not a new feature and adds no capability — consistent with the standing
  rule not to build ahead of a ruleset, since the areas service already exists and
  is public. Validation lives in the factories, not in `contains`, so a caller who
  hand-builds a `CircleArea` object literal bypasses it; that mirrors how a module
  is expected to construct areas (through the API) and keeps the hot containment
  path check-free. If a future ruleset is found building area literals directly,
  move the assert into `contains`/`tokensInside` instead.
- Commit: harden(core): areas reject non-positive dimensions, like base-model already does

## 2026-07-17 — Battle-phase alternation is continuous across steps; the rewrite changed it silently and untested
- Symptom: the player-layer rewrite moved the round from the (now-deleted)
  `resolveBattlePhaseOrder`, which restarted each initiative step from the
  initiative winner, to `session.ts`'s continuous `turnPointer`, which advances to
  the other side after every spend and is never reset per step. That is a real
  behavioural difference — after an odd number of activations in a step, the *next*
  step opens with the initiative **loser** — and it was neither documented nor
  covered by a test. The within-step alternation was tested; the step *boundary*
  was not.
- Fix: pinned the behaviour with a step-boundary test (a wins initiative with two
  6s to b's one; after the three 6s alternate a,b,a, b opens the 5s) and documented
  the interpretation at `consumeDie`. QSR p1 — "starting with whoever goes first,
  players alternate ... working through the current step before the next"
  (`battle-phase-initiative-steps.md`, `confirmed` for the step *structure*) — reads
  as one unbroken alternation, with "starting with" setting only the phase's first
  activation. The continuous reading is therefore at least as defensible as the old
  per-step restart, and probably more so.
- Surfaces: `packages/battleframe-greathelm/src/round/session.ts` (`consumeDie`
  comment), `tests/session.test.ts` (step-boundary case).
- Watch: this pins an *interpretation*, not a proven rule — the QSR does not
  explicitly say whether a new step restarts with the winner, so the per-step-start
  is genuinely open and wants full-rulebook verification (same status as the
  courage intra-phase cascade). Mutation-verified the test is load-bearing: adding
  a per-step reset to `consumeDie` fails exactly this test and nothing else. If the
  rulebook later says restart-per-step, the change is one line at `consumeDie` plus
  flipping the test's expectation — both now carry the rationale, so it will be a
  deliberate change, not a silent one. The value is converting an accidental,
  invisible behaviour into a documented, tested, flagged one.
- Commit: test(greathelm): pin continuous battle-phase alternation across step boundaries

## 2026-07-17 — The pool panel re-derived the 6->1 rule its own comment said it never did
- Symptom: `buildDieViewModels` computed `offerable` locally —
  `die.playerId === activePlayerId && die.face === highestUnspentFace`, with its
  own loop to find the highest unspent face — a second copy of the 6->1 + turn
  rule the session already owns in `requirePlayableDie`. The function's comment
  claimed offerability was "never from a locally re-implemented copy of the 6-to-1
  rule". It was. Two copies in two files that agreed today and could drift
  tomorrow — the duplicated-predicate hazard that turned a one-line `=== 0` fix
  into a worse bug earlier in this project.
- Fix: added `session.isOfferable(dieId)` — the boolean sibling of
  `requirePlayableDie`, both composing `currentFace()`/`activePlayerId()`, so the
  rule has one definition. The panel now calls it and renders the result; it no
  longer knows what "offerable" means. The wrapper session in `round-control.ts`
  forwards it too.
- Surfaces: `packages/battleframe-greathelm/src/round/session.ts` (`isOfferable` +
  interface + return), `src/ui/pool-panel.ts` (`buildDieViewModels` delegates),
  `src/ui/round-control.ts` (forward), `tests/session.test.ts` (isOfferable
  authority), `tests/pool-panel.test.ts` (stub mirrors the rule).
- Watch: the pool-panel test *double* still mirrors the rule (a stub has to
  answer `isOfferable` somehow), but the shipped panel no longer does — the
  duplication that mattered was production panel vs production session, and that
  is gone. The session now has two internal expressions of the composition
  (`isOfferable` returns a bool, `requirePlayableDie` throws with per-branch
  messages); they are co-located in one file and both build on the same two
  helpers, so the *rule* — what the current face and active player are — is single-
  sourced, which is the part that was actually spread across files.
- Commit: refactor(greathelm): session owns die offerability; the panel asks instead of re-deriving

## 2026-07-17 — Nothing asserted the language file carried the keys the code references
- Symptom: missing i18n keys have shipped here more than once (three resolved to
  raw strings live while every test passed). The exhaustive `Record<union, key>`
  objects guarantee a key *string* exists for each case, and one hand-written list
  in `pool-panel.test.ts` checked a dozen keys — but nothing asserted the *language
  file itself* carried every key the code references, and the computed families
  (`actions.<id>`, `actionHint.<id>`, `side.<...>`) were unchecked against en.json
  entirely. A grep confirmed all 38 literal keys and all 12 action-family keys
  currently resolve, so this closes a latent gap, not an active bug.
- Fix: `tests/i18n.test.ts` flattens en.json to dotted keys (Foundry resolves keys
  against the nested object; the flatten matches), scans `src` for every literal
  `"battleframe-greathelm.*"` reference, and asserts each resolves — plus the
  action name/hint families for all six faces from `DIE_FACE_TO_ACTION`. Guards
  itself with a floor (`referenced.size > 20`) so a broken regex can't pass
  vacuously.
- Surfaces: `packages/battleframe-greathelm/tests/i18n.test.ts` (new); no source
  change.
- Watch: mutation-verified — deleting `actions.bash` from en.json fails the test
  naming the missing key. Still blind to keys built from *runtime* strings the
  scan can't see as literals (e.g. a `reasons.${reason}` interpolation) — those
  stay covered by their exhaustive `Record`s, which is why those Records exist. The
  rule this enforces: a key the code can name literally must exist in the language
  file, checked at build time, not discovered in a live world.
- Commit: test(greathelm): assert en.json carries every i18n key the code references

## 2026-07-17 — No test drove a whole round; the pieces were proven, the composition was not
- Symptom: dice pool, clash, damage, removal, courage and victory each had unit
  tests, but nothing exercised them end to end. Every "correct pieces, broken
  whole" defect this project has hit — courage difficulty seeded at 0, victory
  handed knights with no `isRemoved`, the tree-shaken round loop — lived precisely
  in the gap between green units and a played round.
- Fix: `tests/round-integration.test.ts` drives a real session: spend the
  descending initiative steps in order, resolve a Heavy clash that wounds a knight
  past the removal cap, let the session complete into the courage phase, then read
  the result through `toVictoryKnights`/`checkVictory` — the full wiring, clash →
  persisted damage → `isKnightRemoved` → victory. A second case leaves both sides
  alive and asserts the game continues.
- Surfaces: `packages/battleframe-greathelm/tests/round-integration.test.ts` (new);
  no source change.
- Watch: this is the in-test form of "play one round", which is where this project
  has repeatedly found what tests missed — it is not a substitute for a live world
  (the pool panel, canvas, scene controls and Dice So Nice are all still
  HUMAN-REVIEW), but it does hold the pure composition together against a
  piece-level change that silently breaks the whole. It exercises the 6->1 global
  order (b's higher face acts before a's, even though a won initiative), so it also
  guards the alternation and offerability rules the two prior passes pinned.
- Commit: test(greathelm): end-to-end round -- clash, removal, courage, victory compose

## 2026-07-17 — The initiative pool counted dead knights; the death-spiral never bit
- Symptom: `beginRoundFromControl` sized each side's initiative pool from
  `knightsOfSide(knights, playerId).length` — every knight on the side, removed or
  not. QSR p1 (`initiative-dice-pool-size.md`, `confirmed`): "1 initiative die for
  every knight you control **in the play area**, plus 1", and the pool "shrinks as
  your knights die" — a deliberate death-spiral. But a knight removed by damage or
  flight keeps its token on the canvas (removal is a flag, not a token deletion),
  so a warband ground down to one knight kept rolling a full pool round after
  round. The single confirmed dynamic the pool exists to create was silently off.
- Fix: filter the count by `!isKnightRemoved(knight.actor)`, so only knights in the
  play area contribute. This is the third time in this session the same species
  surfaced — a "knights in play" number that quietly included the dead (courage
  difficulty, and before that the victory `isRemoved` wiring).
- Surfaces: `packages/battleframe-greathelm/src/ui/round-control.ts`
  (`beginRoundFromControl` pool sizing), `tests/round-control.test.ts` (a removed
  knight does not inflate the pool).
- Watch: the RED test failed against the old code (pool 3 for one live knight) and
  passes now (2); mutation-honest. Note the count is taken at round *start*, so a
  knight removed mid-round shrinks the *next* round's pool, not the current one —
  correct, since the pool is rolled once per round. `sideIds` still derives sides
  from all present tokens including fully-removed ones, but that only matters if a
  wiped side reaches a new round, which the victory check prevents first; left as
  is. The min-dice floor still applies after the filter, which is exactly where the
  Kickstarter floor is meant to bind (≤1 knight remaining).
- Commit: fix(greathelm): size the initiative pool from knights in play, not the dead too

## 2026-07-17 — Measurement gained a centre-to-centre mode, on the second witness, not a guess
- Symptom: `measure.between` returned base-to-base only. A second ruleset
  (Simple Skirmish) measures movement and line-of-sight **centre-to-centre**, base
  sizes ignored, so core could not answer the distance it needs.
- Fix: `between(a, b, mode?)` with `mode: "base-to-base" | "centre-to-centre"`,
  default `base-to-base` so the existing ruleset is untouched. Centre-to-centre
  returns the raw centre distance (no radius subtraction, no clamp -- a centre
  distance is never negative); base-to-base is unchanged. The result reports the
  mode it used.
- Surfaces: `packages/battleframe/src/measurement/types.ts` (`MeasurementMode`,
  `MeasurementApi.between` signature), `src/measurement/measure.ts` (`between`),
  `tests/measure.test.ts` (centre-to-centre distance, symmetry, default).
- Watch: this is the seam I **deliberately did not build** five commits earlier,
  when only one ruleset existed and the standing rule -- "a primitive generalised
  from one ruleset takes that ruleset's shape" -- said to wait. The restraint paid
  off: the mode arrived from a real second witness pulling the opposite way, which
  is the evidence the architecture requires, so it is a parameter shaped by two
  needs rather than a guess shaped by one. The neutrality vocabulary test earned
  its keep again -- the first draft of these comments named both rulesets in core
  and the test failed the build until they were made generic. Centre-to-nearest-
  *model* stays in the ruleset: "nearest model of a unit" is formation logic core
  does not know.
- Commit: feat(core): measurement gains a centre-to-centre mode for unit-based rulesets

## 2026-07-17 — Second ruleset scaffolded (Simple Skirmish), core required no changes to host it
- Symptom: n/a — new work. `packages/battleframe-simple-skirmish`, the first ruleset
  whose rules are licensed to ship (CC BY-NC 4.0), scaffolded: package.json,
  vite.config (own `simple-skirmish.js` bundle), module.json (attribution +
  `documentTypes.Actor.unit`), constants, lang, styles, a `NOTICE.md`, a `unit`
  Actor data model, and a load-order-independent, fail-loud registration.
- Fix: registration mirrors GREATHELM's proven shape — resolve the api off
  `globalThis.battleframe`/`game.battleframe`, `registerRuleset` last, notify-then-
  throw on absence or rejection. The unit schema models the Basic Game: `models`
  count, `move` inches, per-type `attackMelee/Ranged/Magic` and a `save`, all
  nullable d6 targets defaulting to null — "cannot do that action", never 0 (a 0
  would read as "hits on anything").
- Surfaces: the whole new package; no change to `packages/battleframe/src` beyond
  the centre-to-centre mode committed just before. That is the neutrality claim
  holding for a second, structurally-different ruleset: the only core change this
  ruleset drove was a measurement mode, wanted by two witnesses.
- Watch: the nullable-vs-0 stance is the same "absent means absent, not zero"
  lesson as GREATHELM's optional `isRemoved` — a stat's absence must be
  representable distinctly from a stat of value 0, or "cannot attack" and "hits on
  a 1+" collapse into one. Save uses the game's inverted sense (roll **< save** is a
  casualty, so lower is better); the combat resolver (next) must encode that
  direction exactly once. Per-type saves are folded to one `save` for the MVP; the
  quick reference allows a save per attack type, deferred with the Advanced Game.
- Commit: feat(simple-skirmish): scaffold the ruleset -- package, unit model, registration

## 2026-07-17 — Simple Skirmish combat: hits >= Attack, casualties < Save, saves skipped when moot
- Symptom: n/a — new. The Basic Game's whole combat resolution.
- Fix: `combat/resolve.ts`. `countHits` (roll >= Attack) and `countUnsaved`
  (save roll < Save; lower Save is better) are pure. `resolveAttack` rolls one
  `1d6` per model through the shared dice API, counts hits, then rolls one save
  per hit and counts casualties -- but skips the save roll entirely when the
  defender has no Save (every hit lands) or when there were no hits (nothing to
  save against).
- Surfaces: `packages/battleframe-simple-skirmish/src/combat/resolve.ts`,
  `tests/combat.test.ts`.
- Watch: the Save direction is inverted from most systems (below the number is
  worse, not better) and is encoded in exactly one place, `countUnsaved` -- every
  caller goes through it, so the inversion cannot be re-derived wrong elsewhere.
  Per-die `1d6` rolls (not `Nd6` summed) are load-bearing: the result is read by
  face, and it is what keeps Dice So Nice animating. `null` Save is threaded as a
  distinct value, never conflated with 0.
- Commit: feat(simple-skirmish): Basic Game combat resolution -- hits, saves, casualties

## 2026-07-17 — Simple Skirmish: casualties remove models; range is centre-to-nearest-enemy
- Symptom: n/a — new. Applying combat outcomes, and measuring range/charge.
- Fix: `data/unit-state.ts` — `unitModels`, `isUnitDestroyed` (0 models), and
  `applyCasualties` (decrement to a floor of 0, persisted via `update`, no write on
  zero casualties). `combat/range.ts` — `nearestEnemy` walks the enemy units and
  takes the minimum **centre-to-centre** distance (the new core mode), `isInRange`
  is an inclusive boundary check.
- Surfaces: `packages/battleframe-simple-skirmish/src/data/unit-state.ts`,
  `src/combat/range.ts`, and their tests.
- Watch: **Unit representation is one token per unit** for the MVP -- model count
  is a stat, models are not placed individually -- so "unit centre to nearest enemy
  model" (QSR) resolves to nearest enemy *unit* centre-to-centre. That is an
  approximation the design doc already flagged (skirmish formation is not
  enforced); a future per-model representation would move the "nearest model"
  search without changing this seam, because the walk-and-min already lives in the
  ruleset, not core. Casualty persistence mirrors GREATHELM writing wounds to the
  document; a fresh battle will need a models reset, same open item as GREATHELM's.
- Commit: feat(simple-skirmish): casualties remove models; range measures to the nearest enemy

## 2026-07-17 — Simple Skirmish game structure: alternating activation and deathmatch victory
- Symptom: n/a — new. The turn loop and the win condition.
- Fix: `round/session.ts` — `createSkirmishRound` alternates activation, one unit
  per turn, continuous (a side out of un-activated units is skipped, the other
  continues), refusing an out-of-turn/repeat/unknown activation loudly.
  `determineFirstPlayer` gives the first turn to the highest initiative roll and
  returns null on a tie (unresolved by the QSR -> re-roll, never a guessed winner).
  `round/victory.ts` — `checkVictory` is the Basic Game deathmatch: last side with
  a surviving unit wins, both-wiped is an honest draw.
- Surfaces: `packages/battleframe-simple-skirmish/src/round/{session,victory}.ts`
  and tests.
- Watch: the continuous alternation is deliberately the same shape as GREATHELM's
  battle phase (which this session just pinned as continuous, not per-step-restart)
  minus the descending dice steps -- one activation model, learned once. Tie and
  simultaneous-wipe are both left unresolved-and-labelled rather than invented,
  the standing honesty rule. This completes the pure game logic; orchestration
  (wire combat into an activation, apply casualties, read victory) and UI are next.
- Commit: feat(simple-skirmish): alternating-activation round and deathmatch victory

## 2026-07-17 — Simple Skirmish combat composes into a round; a destroyed unit drops out of activation
- Symptom: n/a — new, but the end-to-end test surfaced a composition gap the unit
  tests could not: a unit destroyed mid-round still appeared as un-activated, so
  the round would never complete and would demand a turn from an empty side.
- Fix: `combat/attack.ts` — `performAttack` reads the attacker's per-type Attack
  and the defender's Save off their Actors, resolves the roll, applies casualties,
  and reports destruction (or a `refused` reason with no document write). Then the
  round session gained a live `isDestroyed?` on `SkirmishUnit`: a destroyed unit is
  "resolved" (needs no turn, cannot be activated), so `activePlayerId`/`isComplete`
  skip it -- the same live-predicate discipline as GREATHELM's `isRemoved`.
  `tests/round-integration.test.ts` drives activate -> attack -> casualties ->
  drop-out -> victory, and a second non-lethal case that keeps the round going.
- Surfaces: `packages/battleframe-simple-skirmish/src/combat/attack.ts`,
  `src/round/session.ts` (`isDestroyed`/`isResolved`), the integration test.
- Watch: this is the Basic Game reaching **playable in logic** -- activate, attack,
  remove, win. What remains is the Foundry UI (unit sheet, an activation control),
  i18n, and the Advanced tier (advantage points, champions, skills). The destroyed-
  skip is exactly the "correct pieces, broken whole" class the integration test
  exists to catch, and it caught one on the first run.
- Commit: feat(simple-skirmish): attacks compose into a round, end to end, with destroyed units dropping out

## 2026-07-17 — Simple Skirmish unit sheet
- Symptom: n/a — new. The Foundry sheet for the unit Actor subtype.
- Fix: `sheets/unit-sheet.ts` mirrors GREATHELM's knight sheet -- ApplicationV2 via
  `HandlebarsApplicationMixin(ActorSheetV2)`, registered through
  `DocumentSheetConfig.registerSheet` scoped to this module's id, default for the
  namespaced `battleframe-simple-skirmish.unit` subtype. Template renders the Basic
  Game stats (models, move, per-type Attack, Save; Skill carried for the Advanced
  tier). Wired into `main.ts` init.
- Surfaces: `packages/battleframe-simple-skirmish/src/sheets/unit-sheet.ts`,
  `templates/unit-sheet.hbs`, `src/main.ts`, `tests/unit-sheet.test.ts`.
- Watch: `registerUnitSheet` and the template path are both present in the built
  bundle (reachability grep), so this is not dead UI. Same UNVERIFIED-against-live
  caveat as GREATHELM's sheet: the ApplicationV2 shape is feature-detected, and a
  live world is still the check that the sheet actually renders.
- Commit: feat(simple-skirmish): unit sheet for the Basic Game stats

## 2026-07-17 — Simple Skirmish i18n completeness guard (src + templates)
- Symptom: n/a — new. Preventing the missing-key regression this project has hit
  in its other ruleset, in the new one.
- Fix: `tests/i18n.test.ts` flattens en.json and asserts every literal
  `battleframe-simple-skirmish.*` key in both `src` (`.ts`) and `templates`
  (`.hbs`) resolves. Scanning templates matters -- a sheet's `{{localize}}` keys
  go missing as easily as code's. Guards against a vacuous pass with a floor.
- Surfaces: `packages/battleframe-simple-skirmish/tests/i18n.test.ts`.
- Watch: covers literal keys only; there are no computed key families in this
  module yet (the exhaustive-Record trick from GREATHELM is the answer if one is
  added). All 8 referenced keys currently resolve.
- Commit: test(simple-skirmish): assert en.json carries every referenced i18n key

## 2026-07-17 — Simple Skirmish: advantage points, champions, and movement modifiers
- Symptom: n/a — new. The remaining rule pieces beyond core combat.
- Fix: three small, pure modules. `combat/advantage.ts` -- `netAdvantage` (both
  sides' points cancel; the remainder is net) and `alterDie` (one point alters one
  die by one, clamped to its faces). `combat/champion.ts` -- `championDieSize`
  (item die d8/d10/d12, else d6); `resolveAttack` gained a `dieSize` param so a
  champion attack is just the same resolution on a bigger die (hit/save targets are
  face-count-agnostic). `round/movement.ts` -- `effectiveMoveInches` (terrain and
  vertical each halve) and `moveSpeedInches`.
- Surfaces: `packages/battleframe-simple-skirmish/src/combat/{advantage,champion}.ts`,
  `src/combat/resolve.ts` (`dieSize`), `src/round/movement.ts`, tests.
- Watch: two honesty flags. (1) Terrain+vertical stacking to a quarter is the
  *literal* reading of two independent "half" rules; the QSR does not say they
  stack, so it is flagged for the full rulebook, not presented as settled. (2)
  Which dice a player alters with net advantage, and the champion's attach/detach
  and casualty-order rules, are player-choice / Advanced-Game orchestration
  deferred with that tier -- these modules own only the mechanical primitives
  (the net, the alteration, the die), never the table choices, the same line
  GREATHELM draws.
- Commit: feat(simple-skirmish): advantage points, champion dice, movement modifiers

## 2026-07-17 — Neutrality import guard generalised to every ruleset, not just the first
- Symptom: the neutrality test hardcoded `battleframe-greathelm` -- with a second
  ruleset shipped, core could import `battleframe-simple-skirmish` (or any future
  one) and the guard would not notice. The load-bearing "core depends on no
  ruleset" proof only covered one ruleset.
- Fix: match any *bare* `battleframe-<name>` import specifier. The bare-specifier
  anchor is load-bearing: a first draft matched `battleframe-<any>` anywhere in the
  path and tripped on core's own relative import of `./combat/battleframe-combat`
  -- caught because the test went red on the current tree before any mutation. The
  final pattern requires the specifier to START with `battleframe-`, so a package
  dependency matches and a relative import of a same-named file does not.
- Surfaces: `packages/battleframe/tests/integration/neutrality.test.ts`.
- Watch: mutation-verified twice -- a bare `import ... from "battleframe-simple-
  skirmish"` in core fails it, and the `./combat/battleframe-combat` relative
  import does not. The vocabulary check still lists only GREATHELM proper nouns;
  the new ruleset's terms (unit, champion, casualty) are too generic to add without
  false positives, so the import guard -- now ruleset-agnostic -- is the strong one.
- Commit: test(core): neutrality guard catches core importing ANY ruleset, not just greathelm

## 2026-07-17 — Simple Skirmish init hook was untested; the functions were proven, the wiring was not
- Symptom: `main.test.ts` tested `registerSimpleSkirmishRuleset`/`registerUnitDataModel`
  in isolation -- proving they *can* register -- but nothing fired the `init` hook to
  prove main.ts actually *calls* them (and `registerUnitSheet`). That is exactly how a
  ruleset ships wired-but-unreachable, the class that bit GREATHELM more than once.
- Fix: an entry-point test stands up a fake Foundry (Hooks capturing init, a system api,
  CONFIG, foundry.abstract/data/applications), imports the entry point, fires init, and
  asserts all three registrations landed -- data model on CONFIG, sheet registered,
  ruleset registered via the api.
- Surfaces: `packages/battleframe-simple-skirmish/tests/main.test.ts`.
- Watch: mutation-verified -- dropping `registerUnitSheet()` from the init hook fails it.
  The same "assert at the reachable seam, not only the unit" rule the core entry-point
  suite follows, now applied to the second ruleset from the start rather than after a
  live-world surprise.
- Commit: test(simple-skirmish): prove the init hook wires the data model, sheet, and ruleset

## 2026-07-17 — Review of the new ruleset: mechanics sound; three honest fixes
- Symptom: an independent review of `battleframe-simple-skirmish` confirmed the
  arithmetic is correct (hit >= Attack, casualty < Save with the right inversion,
  range <=, die clamp, null never coerced to 0 -- no off-by-one), and surfaced
  three real items.
- Fix: (1) `performAttack` reported `casualties` = raw unsaved hits, which a card
  would over-report (5 "casualties" on a 2-model unit); added `modelsRemoved` =
  the count actually removed (before - after), leaving `casualties` as the combat
  figure. (2) `orderedPlayers` treated an unknown `firstPlayerId` (`indexOf` -1)
  the same as index 0 -- a silent wrong turn order; now throws, matching the
  module's fail-loud posture. (3) A GREATHELM comment still said core refuses a
  pair "whose grid parameters differ"; after the scene-id change the primary check
  is identity, grid is the fallback -- corrected.
- Surfaces: `packages/battleframe-simple-skirmish/src/combat/attack.ts`
  (`modelsRemoved`), `src/round/session.ts` (`orderedPlayers` guard),
  `packages/battleframe-greathelm/src/combat/clash.ts` (comment),
  `COVERAGE.md` (accuracy note), tests.
- Watch: the review's headline is not a code bug but a **documentation
  overstatement**: `main.ts` imports only the data model + sheet, so all combat/
  round/victory logic is tree-shaken out of the shipped bundle -- correct and
  tested, but unreachable in a running world until the in-canvas activation control
  wires it. COVERAGE.md now states this in bold at the top: ✅ means "implemented
  and tested", not "clickable in Foundry". Advantage/champion/`dieSize` remain
  computed-but-unconsumed, the documented Advanced-Game deferral. The activation
  control is the one thing left to make the Basic Game playable in-app.
- Commit: fix(simple-skirmish): report models actually removed; fail loud on an unknown first player

## 2026-07-17 — Simple Skirmish activation control: the testable orchestration core
- Symptom: n/a — new. The combat/round/victory logic was proven but had no caller
  a Foundry session reaches (tree-shaken). This is the first half of wiring it: the
  part that can be tested without a canvas.
- Fix: `ui/round-control.ts` composes the tested pieces into the GM's flow.
  `rollInitiative` (d6/player, re-roll on tie, bounded -- the same invented house
  rule GREATHELM uses), `beginRound` (initiative + `createSkirmishRound` with live
  `isDestroyed`), `legalAttackTypes` (has the stat AND target in range: melee within
  Move as a charge, ranged/magic within 12"), and `resolveActivation` (resolve the
  declared attack, apply, advance the turn, and on the last activation read
  `checkVictory`). All injectable (dice, notify), no Foundry.
- Surfaces: `packages/battleframe-simple-skirmish/src/ui/round-control.ts`,
  `tests/round-control.test.ts`.
- Watch: this is deliberately the GREATHELM shape -- a testable `beginRound`/
  `resolveActivation` core with the canvas glue kept separate (next pass), so the
  round is provable without a live world. Range legality is an MVP model (melee =
  charge within Move, ranged/magic = default 12"); per-unit ranges are the
  documented Advanced refinement. The turn authority stays the round session; the
  control's own turn check is an earlier, clearer message, not a second copy of the
  rule.
- Commit: feat(simple-skirmish): testable activation orchestration -- initiative, activation, attack, victory

## 2026-07-17 — Simple Skirmish activation control: the game is now reachable in the bundle
- Symptom: the combat/round/victory logic was correct and tested but tree-shaken
  out of `dist/simple-skirmish.js` -- `main.ts` imported only the data model and
  sheet, so a Foundry session could not reach any mechanic. The module gave a Unit
  type and a sheet, no playable game.
- Fix: the Foundry glue in `ui/round-control.ts` (kept apart from the testable
  core) plus wiring `registerRoundControl()` into `init`. Two scene-control tools:
  "Run Round" (gather units, roll initiative, open a round) and "Activate Unit"
  (activate the selected unit against the targeted -- or nearest living -- enemy
  with its first legal attack type, apply casualties, advance the turn, and read
  the deathmatch victory on the last activation). Centre-to-centre distance via the
  core measure service; sides from token disposition. The bundle grew ~5 kB -> ~20
  kB and a reachability grep now finds `beginRound`, `resolveActivation`,
  `performAttack`, `createSkirmishRound`, `checkVictory`, `nearestEnemy` in the
  shipped file.
- Surfaces: `packages/battleframe-simple-skirmish/src/ui/round-control.ts` (glue),
  `src/main.ts` (init wiring), `lang/en.json` (control strings),
  `tests/round-control.test.ts` (scene control + sideFromDisposition), `COVERAGE.md`.
- Watch: wiring `nearestEnemy`/`isInRange` in was deliberate -- an earlier draft
  used the GM's explicit target and a direct distance, which tree-shook `range.ts`
  out; routing the no-target case through `nearestEnemy` and the reach check through
  `isInRange` gives both a production caller (no computed-but-unconsumed helper). The
  scene-control payload shape and the controlled/targeted-token reads are UNVERIFIED
  against a live v14 -- feature-detected, both idioms accommodated, the same HUMAN
  REVIEW debt GREATHELM's control carries. Range legality is the MVP model (melee =
  charge within Move); per-unit ranges and the full advantage/champion/scenario tier
  remain the documented Advanced Game.
- Commit: feat(simple-skirmish): activation scene control -- the Basic Game is playable in Foundry

## 2026-07-17 — Live verification found three real bugs the tests could not
- Symptom: driving the deployed packages in a live Foundry v14.363 world (Simple
  Skirmish enabled, Greathelm disabled) surfaced three defects unit tests missed.
- Fix: (1) CORE crash -- `extractPackageId` did `actorType.indexOf(".")`, but an
  Actor whose module is disabled fails validation and initializes with
  `type === undefined`; the orphan check, which exists to run over exactly those
  Actors, crashed the whole `ready` hook. Guarded to return null for a non-string
  type. (2) SIMPLE SKIRMISH -- the activation control used the GM's Foundry target
  without checking it is an enemy, so a stale self-target resolved a unit attacking
  itself; now only a living enemy (different side, different id) is accepted, else
  it falls to the nearest enemy. (3) SIMPLE SKIRMISH -- notifications printed actor
  ids ("O2Ydybn1... melee vs ..."); they now use the unit name.
- Surfaces: `packages/battleframe/src/rulesets/orphan-check.ts` (+ test),
  `packages/battleframe-simple-skirmish/src/ui/round-control.ts` (target guard,
  `label`/`name`).
- Watch: all three are the classic live-only class -- a test double always has a
  string `type`, always sets a clean target, and reads a return value rather than a
  rendered notification, so none could have caught these. What DID verify live and
  clean: the module registered a ruleset + Actor subtype into the system,
  centre-to-centre measurement, the scene control's two tools (the previously-
  UNVERIFIED `getSceneControlButtons` shape), Run Round (initiative through the real
  dice service, tie re-roll, first-player announce), Activate (4 attack dice -> 2
  hits -> 2 saves -> 1 casualty, persisted, turn advanced), and the deathmatch
  victory notification ("friendly wins"). The orphan crash was itself triggered by
  the test setup (disabling Greathelm on a world full of knight Actors) -- the exact
  scenario the orphan check is for, which is why its crashing there was the sharpest
  finding.
- Commit: fix: three live-found bugs -- orphan-check crash, self-target attack, id-not-name notifications

## 2026-07-17 — Simple Skirmish: the self-target guard is now testable, not buried in canvas glue
- Symptom: the live self-attack bug (a unit attacking itself off a stale Foundry
  target) had NO unit test, because the target-selection logic lived inside the
  canvas-bound `activateSelectedControl` where a test cannot reach it.
- Fix: extracted `selectAttackTarget(attacker, explicitTargets, allUnits, measure)`
  and `isAttackableEnemy` into the testable core -- prefer the explicit target if
  it is a living enemy, else the nearest living enemy, never the attacker itself or
  a friendly. The glue now calls it. Six tests cover: explicit enemy, self-target
  rejected (the live bug), friendly rejected, destroyed-enemy skipped, nearest
  fallback, and no-enemy -> null. Also removed a duplicate `MeasureApiLike`
  interface the glue declared alongside the imported one.
- Surfaces: `packages/battleframe-simple-skirmish/src/ui/round-control.ts`
  (`selectAttackTarget`, `isAttackableEnemy`), `tests/round-control.test.ts`.
- Watch: the pattern the live-verification session drove home -- a bug found in a
  canvas-bound handler should be fixed by extracting the decision into a pure
  function and testing THAT, not by patching in place where it stays untestable. The
  glue is now a thin caller; the rule (`isAttackableEnemy`) has one definition and a
  regression test.
- Commit: refactor(simple-skirmish): make the never-attack-yourself target rule testable

## 2026-07-17 — Simple Skirmish glue: covered against a stubbed Foundry
- Symptom: `runRoundControl`/`activateSelectedControl`/`gatherUnitsFromCanvas` -- the
  canvas-bound wiring live verification exercised by hand -- had no automated
  coverage. Its guards (no GM, no units, no active round) and the run->select->
  attack path were only ever tested with a real browser.
- Fix: a stubbed-Foundry test (game/canvas/ui doubles, a measure that returns
  centre-to-centre = |dx|) drives the glue: gather picks up only unit tokens (a
  greathelm knight token is ignored), the guards warn, and a full activation runs a
  round, selects the controlled unit, resolves the attack against the targeted
  enemy, and reports it with unit NAMES while casualties land on the defender.
- Surfaces: `packages/battleframe-simple-skirmish/tests/round-control.test.ts`
  (fake-Foundry helpers + glue tests).
- Watch: this is the GREATHELM stubbed-globals pattern applied to the second
  ruleset -- the glue is thin (it delegates to `beginRound`/`selectAttackTarget`/
  `resolveActivation`, all unit-tested), so these tests guard the wiring, not the
  rules. Still UNVERIFIED-against-live only for the `getSceneControlButtons` payload
  shape and real token reads, which the live session already confirmed once.
- Commit: test(simple-skirmish): cover the round-control glue against a stubbed Foundry

## 2026-07-17 — Simple Skirmish: "Run Round" no longer silently abandons a round in progress
- Symptom: `runRoundControl` always created a fresh round, overwriting `activeRound`
  even mid-round. A GM clicking "Run Round" again by reflex would throw away the
  current round (units still to activate) and re-roll initiative -- a footgun I hit
  repeatedly while driving the live world.
- Fix: guard -- if a round exists and is not complete, warn and do nothing. A round
  clears itself the instant its last unit activates (the glue sets `activeRound =
  undefined` on `roundComplete`), so once finished the guard is gone and the next
  round starts normally. New i18n key `controls.round.inProgress`.
- Surfaces: `packages/battleframe-simple-skirmish/src/ui/round-control.ts`
  (`runRoundControl`), `lang/en.json`, `tests/round-control.test.ts` (refuses to
  restart mid-round).
- Watch: found by play, not by reading -- the "start over" behaviour looked fine in
  code and only felt wrong once a human kept clicking. The round-completion clear is
  what makes the guard self-releasing rather than a mode the GM has to exit.
- Commit: harden(simple-skirmish): Run Round refuses to restart a round already in progress

## 2026-07-17 — Simple Skirmish: removed a dead export
- Symptom: `survivingModels` in `ui/round-control.ts` was exported "for the glue's
  target lists" but used nowhere -- not in the glue (which calls `unitModels`/
  `isUnitDestroyed` directly), not in tests. Dead code, the class this project treats
  as a hazard.
- Fix: removed `survivingModels` and the now-unused `unitModels` import. Verified the
  Advanced-tier modules (champion/advantage/movement) are NOT dead in the same sense
  -- they are documented, tested deferrals awaiting their wiring (COVERAGE.md), and
  stay.
- Surfaces: `packages/battleframe-simple-skirmish/src/ui/round-control.ts`.
- Watch: the distinction that matters -- `survivingModels` was an accidental unused
  export (delete it), whereas `netAdvantage`/`championDieSize`/`effectiveMoveInches`
  are intentional Advanced-Game primitives with tests and a named deferral (keep
  them). Dead-because-forgotten is not the same as dead-because-not-yet-wired.
- Commit: chore(simple-skirmish): remove the unused survivingModels export

## 2026-07-17 — Simple Skirmish: a multi-round game is covered end to end
- Symptom: the integration tests played a single round; nothing verified the round
  loop across MULTIPLE rounds -- that an indecisive round yields "continue", a fresh
  round starts, and a later round that wipes a side yields the winner. This is what
  live verification did by hand, clicking Run Round repeatedly.
- Fix: a deterministic two-round test through the real orchestrator
  (`beginRound` + `resolveActivation`): round 1 both sides trade and survive
  (`{result: "continue"}`); round 2 the first side wipes the other's last model and
  the activation returns `{result: "winner", playerId: "a"}`. Scripted dice make
  every roll (initiative, attack, save) deterministic.
- Surfaces: `packages/battleframe-simple-skirmish/tests/round-control.test.ts`.
- Watch: at the orchestrator level `playerId` is the raw side id ("a"/"b"); the
  "friendly"/"hostile" mapping is only `gatherUnitsFromCanvas`'s disposition read, so
  the test asserts "a", not "friendly" (the first draft got this wrong and failed
  loudly -- a useful reminder of where that translation lives). Together with the
  single-round integration and the stubbed-Foundry glue tests, the full game --
  initiative, alternating activation, attack, casualties, round completion, and
  multi-round victory -- is now covered without a browser.
- Commit: test(simple-skirmish): cover a multi-round game to a decisive victory

## 2026-07-18 — InCountry: engine activation service + INX core combat logic
- Symptom: a third ruleset (INCOUNTRY / INX 2.0) is being built, and it needs a
  turn structure the engine did not offer: a privileged first pass of "priority"
  units, then a count-weighted random "bag" draw of the rest. The two shipped
  rulesets each hand-roll their own alternating round; nothing reusable existed,
  and INX's is materially more complex.
- Fix: a ruleset-neutral `createActivationOrder` in the engine
  (`packages/battleframe/src/rounds/activation.ts`) — priority tier alternates
  (first side leading, skipping a side with no priority unit), then a main tier
  whose next side comes from a pluggable `selectMain` (defaults to alternation;
  INX will inject a count-weighted bag). Plus the INX-specific pure logic in the
  new module: d10 roll-under combat (attack total = SUM of hitting faces, armor
  survives on strict >), suppression-as-morale, low-wins initiative, and the
  counterattack ordering (highest total first, discard-on-death, equal =
  simultaneous). All dependency-injected and unit-tested without Foundry.
- Surfaces: `packages/battleframe/src/rounds/activation.ts` + `tests/activation.test.ts`;
  `packages/battleframe-incountry/src/{combat/resolve,round/command,round/suppression,round/reactions}.ts`
  + their tests; `src/constants.ts`.
- Watch: the neutrality guard caught the first draft naming GREATHELM in an
  engine comment — the engine service must describe the *shape* (priority tier,
  bag selector) without knowing which ruleset uses it, so all ruleset names were
  scrubbed from the engine file. The module ships NO INX content (mechanics +
  numbers only, user supplies unit data), same clean-room stance as Simple
  Skirmish. Still UNVERIFIED against live Foundry — this is pure logic; the
  data model, sheet, and round controller (and the engine's real use of the
  activation service) are the next TDD steps.
- Commit: feat(incountry): engine activation service + INX core combat logic (TDD)

## 2026-07-18 — InCountry: a complete, loadable module on the engine rounds service
- Symptom: the pure INX logic existed but nothing made it a Foundry module — no
  actor schema, sheet, registration, or round controller — and the engine's new
  activation order was not reachable by a module (dice/measure/areas are on
  `game.battleframe`, but the round service was not).
- Fix: exposed a **rounds API** on the shared namespace
  (`installRoundsApi` -> `game.battleframe.rounds = { createActivationOrder,
  weightedBagSelector }`), the same top-level-install pattern as dice/measure,
  so modules consume it at runtime and never import engine internals. Built the
  module end to end: the unit data model (`data/unit.ts`, weapons as an
  ArrayField), the tactical "Field Dossier" sheet (`sheets/unit-sheet.ts` +
  hbs + css, with add/remove-weapon actions), and the round controller
  (`ui/round-control.ts`) whose testable core — initiative roll-off, the engine
  bag-draw order, `resolveUnitAttack`, casualty + suppression application, and an
  elimination victory read — is exercised through the REAL engine rounds API
  without a canvas. Registration, manifest, lang, NOTICE, and the deploy script
  round it out.
- Surfaces: `packages/battleframe/src/rounds/activation.ts` (rounds API) +
  `src/battleframe.ts` (installer wiring); the whole
  `packages/battleframe-incountry/` tree; `scripts/deploy-local.mjs`.
- Watch: v0.1 stages the interactive shell honestly — initiative is a d10
  roll-off standing in for the secret command-card reveal, all units activate in
  the bag-draw main tier (priority orders + the CP economy are a later layer),
  and attacks default to no-cover (LoS/cover detection deferred). None of that
  touches the combat MATH, which is faithfully in `resolveUnitAttack`. The
  Foundry glue (scene control, token reads, actor.update) is UNVERIFIED against
  live v14 — the next step. Module ships NO INX content.
- Commit: feat(incountry): complete loadable module on the engine rounds service

## 2026-07-18 — Live verification caught two shipped bugs the unit suite could not
- Symptom: driving the live world exposed two defects invisible to the 483-test
  suite. (1) NO ruleset sheet actually saved edits — typing a stat and blurring
  changed nothing; no `updateActor` fired. (2) The medieval theme icons 404'd in
  the live sheets (`.../modules/battleframe-simple-skirmish/styles/systems/battleframe/assets/heraldry/sword.png`).
- Fix: (1) each sheet template wrapped its content in its OWN `<form>`, but an
  ApplicationV2 DocumentSheet's root element is ALREADY a `<form>`. The nested
  form owned the inputs, so ApplicationV2's submit read an empty root form.
  Proved live by unwrapping the inner form in the DOM (then edits saved), then
  changed the wrapper `<form>`→`<div>` in all three templates (knight-sheet,
  both unit-sheets). (2) CSS `url("systems/…")` resolves RELATIVE to the CSS
  file (`modules/<id>/styles/`), not the Foundry root — changed to
  `url("../../../systems/…")` in simple-skirmish.css and greathelm.css.
- Surfaces: `packages/*/templates/*.hbs` (form→div ×3);
  `simple-skirmish.css` + `greathelm.css` (11 url paths); plus polish — INX
  armor-select localization, the `noApi` string wording, and `TYPES.Actor.*`
  labels so window titles read "Unit"/"Knight" not the raw i18n key.
- Watch: BOTH bugs were structurally invisible to unit tests — one is Foundry
  form-ownership runtime behavior, the other is browser URL resolution. Neither
  had ever been exercised: prior playtests only used programmatic `actor.update`
  via the round controller, never sheet editing, and the theme icons were only
  ever checked in a local preview server rooted differently than Foundry. This
  is the case for live verification as a non-negotiable step, now logged. The
  nested-`<form>` fix is the load-bearing one — it repaired sheet editing across
  ALL THREE shipped rulesets, not just InCountry.
- Commit: fix(sheets): unwrap nested form so edits save; fix theme icon paths

## 2026-07-18 — Engine rounds API hardened after an adversarial review
- Symptom: an independent engine review of the new activation service found one
  real contract divergence and a robustness gap. (1) `installRoundsApi` set
  `namespace.rounds = createRoundsApi()` unconditionally, unlike the dice /
  measure / area installers, which all guard with `?? create()`; a second
  install (double eval, HMR, a test) would swap the object a consumer had
  captured. (2) `createActivationOrder({ units: [] })` threw (via `orderedSides`
  `indexOf === -1`) instead of yielding an already-complete order — a latent
  crash for a reusable engine service handed a possibly-empty live unit list.
- Fix: made the installer idempotent (`namespace.rounds ?? createRoundsApi()`);
  `orderedSides` now returns `[]` for an empty round (→ phase "complete") while
  still throwing for a NON-empty round whose `firstSideId` names no side (the
  real caller bug that guard exists for). Corrected the `eligible()` doc to say
  it is phase eligibility, not a turn check. Scrubbed a ruleset name from a core
  test comment (neutrality-in-spirit). Added tests: idempotency, empty round,
  single-side round, firstSideId mismatch, and a custom-selector-returns-
  ineligible throw.
- Surfaces: `packages/battleframe/src/rounds/activation.ts`,
  `packages/battleframe/tests/activation.test.ts`.
- Watch: kept as a deliberate fail-loud — `activeSideId()` throwing when a custom
  `selectMain` returns an out-of-set side. That is a caller programming error
  worth surfacing; the shipped `weightedBagSelector` can never trigger it. 488
  tests green; typecheck clean; no regression to the two shipped rulesets.
- Commit: harden(engine): idempotent rounds installer + empty-round handling

## 2026-07-18 — Sheet save fix needed submitOnChange too (SS + GREATHELM)
- Symptom: after the nested-`<form>`→`<div>` fix, InCountry saved edits (it set
  `form:{submitOnChange:true}`), but Simple Skirmish and GREATHELM STILL did not
  — a live regression check showed their edits persisted neither on change nor on
  close. Their sheets inherit v14 DocumentSheetV2's `submitOnChange: false`, and
  with no submit button that means no save path at all.
- Fix: added `form: { submitOnChange: true }` to both sheets' DEFAULT_OPTIONS,
  matching InCountry. Verified live: editing a field now persists immediately for
  all three rulesets. The form→div fix was necessary but not sufficient; this is
  the other half.
- Surfaces: `packages/battleframe-simple-skirmish/src/sheets/unit-sheet.ts`,
  `packages/battleframe-greathelm/src/sheets/knight-sheet.ts`.
- Watch: this is the second live-only bug in the same subsystem — sheet editing
  had never actually worked in any shipped ruleset, because every prior playtest
  drove state programmatically (round controller / new-battle), never the sheet.
  Also added durable coverage the unit suite lacked: an InCountry i18n
  key-completeness test and an end-to-end round test where an attack suppresses a
  surviving unit and the game continues.
- Commit: fix(sheets): submitOnChange so SS + GREATHELM edits persist; add tests

## 2026-07-18 — Line-of-sight is a thin engine service over Foundry's walls, not a reimplementation
- Symptom: the engine had dice / measure / areas / rounds services but no
  line-of-sight, so a ruleset that needs LoS or cover (InCountry) had nothing to
  call. Question raised: wrap Foundry's wall system, or reimplement?
- Fix: added `game.battleframe.los` (`src/vision/los.ts`) that DELEGATES to
  Foundry's `ClockwiseSweepPolygon.testCollision` /
  `CONFIG.Canvas.polygonBackends[type]` -- it reimplements no geometry. It adds
  only the ruleset-neutral layer worth sharing: `isClear(a, b, type?)`,
  `between(tokenA, tokenB, {sample:"corners"})` for base-aware "can I see any
  part of that model", and a fail-open default (clear) when there is no canvas
  so tests/headless don't explode. Pure decision helpers take an injected
  backend and test without Foundry (11 tests); the adapter feature-detects the
  collision entry point.
- Surfaces: `packages/battleframe/src/vision/los.ts` + `tests/los.test.ts`;
  installer wired in `src/battleframe.ts`.
- Watch: same wrap-not-reimplement judgement as `measure`/`areas` -- Foundry
  owns the hard geometry (walls, terrain/limited-sight, doors), the engine owns
  the base-aware token sampling on top. Verified live against a real wall: a
  sight line crossing it is blocked, a line on one side is clear, token-to-token
  across it is blocked. NOT yet consumed by InCountry -- wiring cover/LoS gating
  into the round controller (INX cover = the line passing through terrain walls)
  is the follow-up; the primitive is ready.
- Commit: feat(engine): line-of-sight service delegating to Foundry's walls

## 2026-07-18 — Foundry-integration audit → roadmap (five scanning passes)
- Symptom: concern that the project reimplements Foundry functionality instead of
  building on it.
- Fix: five focused scanning passes (combat/turns, data/documents, UI/apps,
  geometry, effects/dice) across the vault's Foundry-API research + engine + three
  modules, synthesized into `docs/roadmap-foundry-integration.md`. Verdict: most
  of the stack is correctly built ON Foundry; the reimplementation clusters into
  three gaps, all "state Foundry would persist/sync/display that we hold in
  private JS and never surface": (P0) round/turn state in module `let` variables
  instead of on the `Combat` document — the engine already registered the correct
  `BattleframeCombat` seam but every module bypasses it (zero callers); (P1) no
  token shows game state — `CONFIG.statusEffects` unused, markers are invisible
  `system` booleans; (P2) outcomes go to GM-only toasts and dice pools roll N
  separate Rolls instead of chat cards + one Roll.
- Surfaces: `docs/roadmap-foundry-integration.md` (the deliverable).
- Watch: the passes confirmed the deliberate divergences are justified and should
  be KEPT (no numeric initiative, bespoke tracker/pool-panel, base-to-base
  measurement, exact-arithmetic areas vs Region#testPoint) — the roadmap is about
  moving live state onto documents + the canvas, not undoing those. P0 is a
  significant architecture change; get sign-off before executing.
- Commit: docs: Foundry-integration audit + prioritized roadmap

## 2026-07-18 — P0: Simple Skirmish round state moved onto the Combat document
- Symptom: the round lived in module-scoped `let activeRound`/`activeUnits`, so a
  GM reload mid-round wiped it, no other client saw it, and the registered
  BattleframeCombat tracker rendered empty (roadmap P0).
- Fix: made `SkirmishRound` serializable (`serialize()`/`restoreSkirmishRound`),
  and rewrote the round-control glue to (a) create/get a `Combat`, (b) seat each
  unit token as a `Combatant`, (c) store the serialized round on
  `combat.flags.battleframe.round` + the tracker order on `.order`, and (d)
  reconstruct the round from the document on every control click. Retired the
  module globals; `_resetActiveRoundForTests` is now a no-op.
- Surfaces: `packages/battleframe-simple-skirmish/src/round/session.ts`
  (serialize/restore), `src/ui/round-control.ts` (the glue), `tests/session.test.ts`
  + `tests/round-control.test.ts` (a `fakeCombat` double; asserts state lands on
  the combat).
- Watch: live-verified — running the round via the real scene-control button
  created a Combat with 6 Combatants and the round flag, and the state SURVIVED A
  FULL PAGE RELOAD (the property the JS-variable model lost). The activation
  algorithm is unchanged; only the storage moved. INX + GREATHELM P0 to follow
  (each has its own round machine to make serializable).
- Commit: refactor(simple-skirmish): round state on the Combat document (P0)

## 2026-07-18 — P0: InCountry round state on the Combat document (engine order made serializable)
- Symptom: same as the SS P0 — InCountry held the round in module-scoped
  `let activeRound`/`activeUnits`, lost on reload, unsynced.
- Fix: made the ENGINE activation order serializable (`ActivationOrder#serialize`
  + `restoreActivationOrder`, exposed on `game.battleframe.rounds`; the bag
  selector is re-supplied on restore, and the cached main-tier pick is preserved
  so the current turn is stable). Rewrote the InCountry glue to the same
  Combat-document pattern as SS: create a Combat, seat Combatants, store the
  serialized order on `combat.flags.battleframe.round`, reconstruct each click.
- Surfaces: `packages/battleframe/src/rounds/activation.ts` (serialize/restore +
  RoundsApi), `tests/activation.test.ts`; `packages/battleframe-incountry/src/ui/round-control.ts`.
- Watch: live-verified — running the round via the real scene-control button
  created a Combat with 2 Combatants + the round flag, and it SURVIVED A RELOAD.
  Engine change is neutral (no ruleset vocabulary). GREATHELM P0 still to do (its
  richer dice-pool RoundSession).
- Commit: refactor(incountry): round state on the Combat document (P0)

## 2026-07-18 — P3 + P4: non-gridless guard + generic-sheet form fix
- Symptom: (P3) measure/areas assumed gridless everywhere and never checked
  `grid.type`, so a square/hex scene returned plausible-but-wrong Euclidean
  numbers that silently disagreed with Foundry's ruler. (P4) the engine's
  generic-actor sheet had the same nested-`<form>` + missing-`submitOnChange`
  bug we fixed on the ruleset sheets (its edits never persisted) plus a
  V1-style editor `<div>`.
- Fix: (P3) `assertGridlessScene` + `NonGridlessSceneError` in base-model, wired
  into `measure.between` and `areas.contains`; a scene with no `grid.type` is
  treated as gridless (plain-object callers/tests). (P4) generic-actor-sheet
  template `<form>`→`<div>`, `form:{submitOnChange:true}`, and the editor div
  replaced with a `<prose-mirror>` element.
- Surfaces: `packages/battleframe/src/base/{base-model,types}.ts`,
  `measurement/measure.ts`, `areas/area.ts`, `tests/measure.test.ts`;
  `applications/generic-actor-sheet.ts` + `templates/generic-actor-sheet.hbs`.
- Watch: the gridless-only scope is deliberate (square/hex backlogged with
  BattleTech); the guard just makes the boundary loud instead of wrong. Remaining
  minor P4 nits (isNewerVersion swap, pool-panel actions map, DialogV2.confirm)
  are low-value and left for forge-converge to flag.
- Commit: feat(engine): non-gridless guard (P3) + generic-sheet form fix (P4)

## 2026-07-18 — P2 (part): dice pools roll as ONE Roll / one chat card
- Symptom: InCountry rolled each pool die as a separate `1d10` Roll, so one
  5-die attack posted ~6 chat messages and fired ~6 Dice So Nice animations
  (roadmap P2, the most visible day-to-day defect).
- Fix: added `dice.rollPool(count, dieSize, opts)` to the engine dice API -- one
  `Nd{size}` Roll, one chat card, returns the individual faces (read off
  `roll.dice[0].results`). InCountry's `resolve.ts` pool helper now delegates to
  it instead of looping `dice.roll`.
- Surfaces: `packages/battleframe/src/dice/dice.ts` + `tests/dice.test.ts`;
  `packages/battleframe-incountry/src/combat/resolve.ts` + the three INX test
  doubles (now provide `rollPool`).
- Watch: live-verified -- `rollPool(5,10)` returns 5 faces and posts exactly ONE
  message. The remaining P2 half (combat OUTCOMES as ChatMessage cards instead of
  GM-only toasts) is a larger cross-module change, still pending. P1 (status
  effects) and GREATHELM P0 also remain.
- Commit: feat(engine): dice.rollPool -- one Roll per pool (P2)

## 2026-07-18 — P1 (focused): InCountry suppression as a Foundry status effect
- Symptom: no token showed any game state -- CONFIG.statusEffects was used
  nowhere, so suppression/removal were invisible `system` booleans (roadmap P1).
- Fix: register a `battleframe-incountry-suppressed` status effect at init
  (`status.ts`, a core SVG icon -- ships no artwork), and in the attack-flow's
  `applyStateToActor` toggle it via `actor.toggleStatusEffect` alongside the
  system field, plus the core `defeated` skull when a unit is wiped
  (modelsRemaining <= 0). State now shows on the token, syncs, and persists.
- Surfaces: `packages/battleframe-incountry/src/status.ts` + `tests/status.test.ts`,
  `main.ts` (register at init), `ui/round-control.ts` (toggle), `lang/en.json`.
- Watch: live-verified -- the status registers on CONFIG.statusEffects and
  toggling puts it in `actor.statuses`. This is the focused slice; the broader P1
  (GREATHELM momentum/damage-threshold -> defeated, InCountry engaged/injury/stun,
  token resource bars) follows the same pattern and remains. Numeric counters stay
  NumberFields by design.
- Commit: feat(incountry): suppression as a Foundry status effect (P1)

## 2026-07-18 — P0: GREATHELM round state on the Combat document (dice-pool session)
- Symptom: the deferred third P0. GREATHELM's per-player dice-pool RoundSession
  lived inside the PoolPanel Application, so a GM reload mid-round lost it (the
  panel held the only copy). Only the completed-round order flag was persisted.
- Fix: made `RoundSession` serializable (`serialize()`/`restoreRoundSession`,
  seeding the unspent pools + turn from persisted state). Extracted the round-
  control wrapper into `wrapRoundSession`, shared by a fresh round and a resumed
  one; it now persists the serialized round to `combat.flags.battleframe.round`
  after every spend/discard (and on open) and clears it on completion.
  `onRoundControlActivated` RESUMES an in-progress round from the document
  (reopen the panel on the restored session) instead of re-rolling a new one, and
  `resumeRoundFromControl` rebuilds it.
- Surfaces: `packages/battleframe-greathelm/src/round/session.ts`
  (serialize/restore), `src/ui/round-control.ts` (wrapper extraction + resume +
  persist), `tests/session.test.ts` + `tests/round-control.test.ts`.
- Watch: live-verified that a GREATHELM-shaped serialized round SURVIVES A RELOAD
  on the Combat document (the exact P0 target). The full onClick flow test hit a
  Foundry combat-registration quirk with a programmatically created+activated
  combat (setFlag threw "Combat does not exist"); `Combat.createDocuments` /
  the normal GM tracker flow registers it correctly. P0 is now complete for all
  three rulesets.
- Commit: refactor(greathelm): round state on the Combat document (P0)

## 2026-07-18 — P1: defeated-on-threshold for Simple Skirmish + GREATHELM
- Symptom: a wiped Simple Skirmish unit (models == 0) and a removed GREATHELM
  knight (3 damage, or fled a courage test) sat on the canvas identical to a
  live one. The condition was an invisible number/flag; nothing showed on the
  token. (InCountry's suppressed/defeated slice already did this; these two were
  the remaining P1 gap.)
- Fix: a small co-located `sync…DefeatedStatus(actor)` helper in each module
  toggles Foundry's native "defeated" status (`CONFIG.specialStatusEffects.DEFEATED`,
  the skull) to match the ruleset's own removal predicate — `isUnitDestroyed`
  (SS) / `isKnightRemoved` (GH, either QSR route). Wired into the exact write
  sites: SS `applyCasualties`; GH `applyClashDamage`, `markFled`, and `resetKnight`
  (which clears it). The count/marker stays a `NumberField`; only the threshold
  condition goes native. The turn-order drop already worked (both read removal
  live), so this is purely making the state visible + synced + persisted.
- Surfaces: `battleframe-simple-skirmish/src/data/unit-state.ts`,
  `battleframe-greathelm/src/round/{removal,loop}.ts`, plus tests in
  `tests/unit-state.test.ts` and `tests/removal.test.ts`.
- Watch: live-verified on the shared world — `CONFIG.specialStatusEffects.DEFEATED`
  is `"dead"` (matches the fallback), and `toggleStatusEffect("dead", {active})`
  sets/clears `actor.statuses` on real SS-unit and GH-knight actors (temp actors
  deleted, no debris). 526 tests green; typecheck + build clean.
- Commit: feat(ss,greathelm): native defeated status on threshold (P1)

## 2026-07-18 — Hover stat panel: pure core is three injectable modules
- Context: the hover panel (stats on token hover) must render ruleset-specific
  fields while `packages/battleframe/src` stays ruleset-neutral (a test greps the
  engine for ruleset vocabulary). Foundry globals also make logic hard to unit
  test.
- Decision: split the panel's brain into three PURE, Foundry-free modules under
  `src/ui/` — a per-actor-type field **registry** (rulesets register providers;
  last write wins for idempotent install), a **visibility** resolver
  (`ruleset`→provider default→`owners`, plus a GM/owner/everyone check), and a
  **model builder** that turns actor+provider into render-ready rows (missing
  value → em dash, never throws) with a status resolver injected so no CONFIG
  lookup leaks into core. The Foundry-facing glue (hooks, CONFIG, settings) lands
  in later units and calls into these.
- Watch: the engine names no field or type; rulesets supply both via the registry.
- Commit: feat(core): hover-panel field registry (ruleset-neutral)

## 2026-07-18 — Hover panel visibility: setting resolves through the provider
- Symptom: the hover panel needs a GM-owned visibility choice that can also
  defer to each ruleset's own default, and the "who may see this" test must run
  without Foundry's `game.user`/`token` globals.
- Fix: `resolveVisibility(setting, provider)` collapses the stored setting to a
  concrete mode — an explicit `everyone`/`owners`/`gm` passes through, while
  `ruleset` defers to `provider.defaultVisibility` and finally to `owners`.
  `isVisibleTo(user, token, mode)` is a pure predicate over duck-typed
  `{ isGM }` / `{ actor: { isOwner } }` shapes: everyone→always, GM→always,
  gm→GM-only, owners→owner-only.
- Surfaces: `packages/battleframe/src/ui/hover-visibility.ts`,
  `packages/battleframe/tests/hover-visibility.test.ts`.
- Watch: GM always sees the panel except when the mode is `everyone` (trivially
  true anyway); the predicate never reads a Foundry global.
- Commit: feat(core): hover-panel visibility resolution

## 2026-07-18 — Hover panel model builder is pure and never throws
- Symptom: rendering the hover panel from a live actor risks throwing on missing
  `system` fields and would otherwise reach into Foundry `CONFIG.statusEffects`
  for status icons — untestable and fragile.
- Fix: `buildPanelModel(actor, provider, resolveStatus)` maps each provider field
  to a `{ label, text }` row, rendering a missing/null value as an em dash (and
  `—/max` when the field declares a max) so it never throws. Active statuses are
  mapped through an injected `resolveStatus` and silently dropped when it returns
  undefined, keeping the CONFIG lookup out of core.
- Surfaces: `packages/battleframe/src/ui/hover-panel-model.ts`,
  `packages/battleframe/tests/hover-panel-model.test.ts`.
- Watch: values are stringified via `String(value)`; unresolvable statuses are
  omitted rather than shown icon-less.
- Commit: feat(core): hover-panel content model builder

## 2026-07-18 — statVisibility world setting defaults to "ruleset"
- Symptom: The hover panel needs a GM-level policy for who sees actor stats, but
  each ruleset also declares its own per-provider default (`defaultVisibility`).
- Fix: Added `SETTING_STAT_VISIBILITY` ("statVisibility"), a `config: true` world
  setting with choices ruleset/everyone/owners/gm defaulting to `"ruleset"`, plus
  `getStatVisibilitySetting()` mirroring `getDefaultGridUnit()`'s fallback shape.
  The `"ruleset"` sentinel defers to the provider default via `resolveVisibility`,
  so the GM opts into an override only deliberately.
- Surfaces: `packages/battleframe/src/settings/index.ts`,
  `packages/battleframe/tests/settings-stat-visibility.test.ts`.
- Commit: feat(core): statVisibility world setting

## 2026-07-18 — hover registry installed on the namespace at module top level
- Symptom: Rulesets register hover providers from their own `init`, which may run
  before this system's `init`. The registry must exist before any ruleset needs it.
- Fix: Added `installHoverApi()` mirroring `installDiceApi()` — it puts one
  idempotent `HoverRegistry` on `battleframeNamespace().hover` and is called from
  the module-top-level install block in `battleframe.ts`, right after
  `installLosApi()`. Same load-order guarantee as dice/measure/area/rounds/los.
- Surfaces: `packages/battleframe/src/ui/hover-registry.ts`,
  `packages/battleframe/src/battleframe.ts`,
  `packages/battleframe/tests/hover-registry.test.ts`.
- Commit: feat(core): expose game.battleframe.hover registry

## 2026-07-18 — hoverToken panel glue wires pure pieces to a reused div
- Symptom: The hover registry, visibility rules, and panel model are pure and
  tested, but nothing binds them to Foundry's `hoverToken` hook or paints a panel.
- Fix: Added `packages/battleframe/src/ui/hover-panel.ts` — thin glue that
  registers `hoverToken`/`canvasPan`/`deleteToken` at module scope, stamps
  `buildPanelModel` output into one reused `#battleframe-hover-panel` div, and
  positions it in screen space off `canvas.stage.worldTransform`. The single
  testable decision, `shouldRender`, is unit-tested; DOM/positioning is
  live-verified. Guards on `globalThis.Hooks`/`document` keep import safe under
  vitest (Hooks absent → `registerHoverPanel` returns early). Side-effect imported
  from `battleframe.ts` alongside the other module-scope registrations.
- Surfaces: `packages/battleframe/src/ui/hover-panel.ts`,
  `packages/battleframe/src/battleframe.ts`,
  `packages/battleframe/tests/hover-panel-glue.test.ts`.
- Commit: feat(core): hoverToken panel glue

## 2026-07-18 — hover panel styles + statVisibility i18n
- Symptom: The panel div and the statVisibility setting existed but had no CSS
  and no localized labels, so the panel was unstyled and the setting showed raw
  i18n keys.
- Fix: Appended `#battleframe-hover-panel` styling (dark rounded tooltip, flex
  rows, status icon strip) to `styles/battleframe.css`, and added the flat-dotted
  `battleframe.settings.statVisibility.{name,hint,choices.*}` keys to
  `lang/en.json` right after `defaultGridUnit.hint`. JSON re-validated with node.
- Surfaces: `packages/battleframe/styles/battleframe.css`,
  `packages/battleframe/lang/en.json`.
- Commit: feat(core): hover panel styles + statVisibility i18n

## 2026-07-18 — escape hover panel HTML + correct PIXI matrix positioning
- Symptom: `renderPanel` interpolated the user-editable actor name and stringified
  system fields straight into `innerHTML` — a cross-client stored XSS on a shared
  world. Separately, `position` read `.e`/`.f` off `canvas.stage.worldTransform`,
  which is a PIXI.Matrix (translation is `.tx`/`.ty`), so positions were `NaN`.
- Fix: Extracted pure, unit-tested `escapeHtml` and `buildPanelHtml(model,
  localize)` — every dynamic value is HTML-escaped; field/status labels are
  localized via injected Foundry i18n (with a fallback), the actor name is escaped
  but never localized (it is data, not an i18n key). `renderPanel` now delegates to
  `buildPanelHtml`. Corrected `position` to read `.tx`/`.ty` with a typed matrix.
  Added a `registered` guard so the exported + self-invoked `registerHoverPanel`
  can't double-bind hooks.
- Surfaces: `packages/battleframe/src/ui/hover-panel.ts`,
  `packages/battleframe/tests/hover-panel-glue.test.ts`.
- Commit: fix(core): escape hover panel HTML + correct PIXI matrix positioning

## 2026-07-18 — Ruleset hover stat registrations (GREATHELM)
- What: GREATHELM now advertises its knight hover stat fields to the engine's
  hover registry via `registerGreathelmHoverFields()`, called from init. Fields:
  `momentum` and `damage`, both rendered as value/3 (the knight's only per-model
  numbers), `defaultVisibility: "everyone"`. Labels reuse the existing
  `battleframe-greathelm.fields.*` i18n keys, which the engine localizes at
  render time.
- Also: GREATHELM's `main.ts` top-level `Hooks.once("init", …)` was changed to the
  guarded `globalHooks?.once(...)` shape already used by Simple Skirmish and
  InCountry. Raw `Hooks.once` threw `ReferenceError: Hooks is not defined` the
  moment `main.ts` was imported under Vitest, making the module untestable. The
  guard makes the module importable without a Foundry global while preserving
  identical runtime behaviour in a live world.
- Registry resolved defensively (`globalThis.battleframe.hover` ?? 
  `game.battleframe.hover`); a miss is a no-op, matching the api-resolution pattern.
- Commit: this commit.

## 2026-07-18 — Ruleset hover stat registrations (Simple Skirmish)
- What: Simple Skirmish advertises its unit hover stat fields via
  `registerSimpleSkirmishHoverFields()`, called from init. The seven Basic Game
  stats -- `models`, `move`, `attackMelee`, `attackRanged`, `attackMagic`,
  `save`, `skill` -- register with no `max` (each is a d6 target number or a
  count with no fixed ceiling), `defaultVisibility: "everyone"`. Labels reuse the
  existing `battleframe-simple-skirmish.fields.*` i18n keys.
- Registry resolved defensively (`globalThis.battleframe.hover` ??
  `game.battleframe.hover`); a miss is a no-op.
- Commit: this commit.

## 2026-07-18 — Ruleset hover stat registrations (InCountry)
- What: InCountry advertises its unit hover stat fields via
  `registerInCountryHoverFields()`, called from init. Only `modelsRemaining`
  registers (no `max`), `defaultVisibility: "everyone"`. Suppression is
  deliberately NOT a hover field -- it is a battlefield condition surfaced
  through the engine's status-icon row (status.ts), per the reimplementation
  smell test.
- New i18n key: `battleframe-incountry.fields.modelsRemaining` = "Models" added
  to lang/en.json (the only new label this feature needed; GH and SS reused
  existing keys). The engine localizes it at render time.
- Registry resolved defensively (`globalThis.battleframe.hover` ??
  `game.battleframe.hover`); a miss is a no-op.
- Commit: this commit.

## 2026-07-18 — Actor stats on hover (engine UI panel) — feature complete + live-verified
- What: hovering a token shows a small themed panel of the actor's stats + active
  status icons. Engine owns the mechanism (`hoverToken` hook, a reused positioned
  `<div>`, a `game.battleframe.hover` registry, the `statVisibility` world setting);
  each ruleset registers its fields (GH: momentum/damage; SS: models/move/attacks/
  save/skill; INX: modelsRemaining). Ruleset-neutral — the neutrality test passes.
- Design/plan: docs/plans/2026-07-18-hover-stat-panel-design.md + -hover-stat-panel.md.
- Review catches (subagent code review): (1) CRITICAL stored XSS — actor/token
  names are user-editable, so the panel now HTML-escapes every interpolated value
  via a pure, unit-tested `escapeHtml`/`buildPanelHtml`; (2) `position()` read
  DOMMatrix `e`/`f` off a PIXI matrix (→ NaN) — fixed to `tx`/`ty`.
- Live-verified on the shared world (Build 363): `hoverToken` is the correct hook;
  panel renders with localized labels + value/max (Momentum 2/3, Damage 3/3), the
  defeated skull in the status row (ties to P1), real pixel positioning (no NaN),
  hides on leave; a malicious token name (`<img onerror>`) is entity-encoded and
  does NOT execute (our escaping, confirmed with the payload actually reaching the
  panel). Owners/GM visibility modes are exhaustively unit-tested; GM-sees path
  confirmed live (non-GM path needs a second user session, not exercised live).
- Watch: field labels must be existing i18n keys (the glue localizes them); the
  panel is read-only; no per-player/per-token visibility overrides (YAGNI).
- Commits: ec09403..a2cb833 (design, plan, 11 feature commits).

## 2026-07-22 — Full Thrust ruleset module + engine facing/bearing primitive (in progress)
- What: new `battleframe-full-thrust` module implementing the Full Thrust
  starship-combat game (Jon Tuffley / GZG). Mechanics only — ships NO rulebook
  text, stat blocks, faction lists, or artwork (bring-your-own ship designs).
  Design + autonomous decision log: docs/plans/2026-07-22-full-thrust-ruleset-design.md.
- Edition baseline: FT2 core (superset of Full Thrust Light). Where FTL/FT2
  disagree we take FT2 — notably the threshold check rolls HIGH (6 / 5-6 / 4-6),
  not FTL's low rolls. Recorded so a rules correction is unambiguous.
- Engine addition (authorised by the user: "add generic engine support for space
  battles, as generic as possible"): a **facing/bearing geometry primitive**
  (`game.battleframe.facing` — `facingOf`, `absoluteBearing`, `bearingOf`). This
  is the geometry half of docs/plans/2026-07-17-facing-geometry-design.md, built
  in the note's most-neutral shape (Q3): core exposes a numeric bearing (degrees,
  clockwise, 0 = dead ahead); the ruleset buckets it into arcs. No arc counts and
  no fore/aft vocabulary in core — the neutrality vocabulary test still passes.
  The gate ("build with Alpha Strike") is superseded: Full Thrust is a real
  facing consumer, and its 6x60° fire arcs are exactly what the primitive answers.
- Built + tested so far (TDD, all green — 630 tests total): pure combat math
  (hull damage track + row thresholds; threshold-check kill numbers; beam dice
  by range band + screen downgrade; torpedo to-hit + submunition dice; armour
  absorbs before hull; 6-arc bucketing), the ship Actor data model + SSD sheet,
  ship-state damage I/O with native `defeated`-on-destruction, hover fields, and
  the init-hook wiring (reachability-tested). NOT yet done: firing orchestration
  reachable via a scene control (so the combat math is currently tree-shaken from
  the bundle — same COVERAGE caveat as Simple Skirmish), the turn/initiative loop,
  movement-order validation, fighters/missiles/PDS/needle, ship-design helpers.
- Commit: this commit (first milestone: skeleton + facing primitive + combat math).

## 2026-07-22 — Full Thrust: firing pipeline + turn structure + reachable scene control
- What: the playable combat loop. resolveWeaponFire (pure) rolls a ship's weapons
  (beam/torpedo/submunition) against one target given range/bearing/screen;
  fireShipAtTarget (orchestrator, engine services injected) measures range
  centre-to-centre, reads bearing off game.battleframe.facing, buckets it into a
  fire arc, rolls via game.battleframe.dice, applies damage armour->hull, and runs
  the threshold check (enumerate surviving systems, roll per system, knock out
  FCS/PDS/screens/weapons/drives). Movement: parseOrder/applyOrder validate an
  order against the thrust budget (turning <= half, up) and compute velocity/course.
  Turn: determineInitiative + createFirePhase (winner fires one, strict alternation).
- Reachability: a "Full Thrust" scene control (ui/round-control.ts) with Fire and
  Plot tools, using Foundry native token control + targeting, posting an
  HTML-escaped fire report to chat. Pulls combat/movement into the bundle
  (7.5kB/4 modules -> 25kB/16 modules).
- Drives simplification (documented): a drive threshold-hit halves thrust (floor)
  rather than FT2's exact "first half, second dead".
- 678 tests passing. Live-unverified (no browser here): scene-control glue, sheet
  render, DialogV2 order prompt -- flagged for the user. Advanced systems
  (fighters, missiles, PDS-vs-fighters, needle, ship-design helpers) still to come.
- Commit: this commit.

## 2026-07-22 — Full Thrust advanced systems: fighters, PDS, ordnance, ship design
- Fighter & anti-fighter math (combat/fighters.ts, pure): fighter attacks on ships
  (beam table, screens apply), PDS vs fighters (4-5=1, 6=2), PDS vs missiles (only
  6), dogfight kills. Ordnance (combat/ordnance.ts): needle beams (9mu, knock a
  system on a 6, ignore screens/armour) and salvo missiles (interception + damage).
- Fighter group Actor subtype (data/fighter-group.ts) + minimal sheet; fighter
  attack orchestrator (combat/fire-fighters.ts): 6mu fore-arc, one die per fighter,
  shared armour/hull + threshold via extracted combat/apply-damage.ts.
- Ship-design helpers (ship/design.ts, pure FT2 Mass/Points), verified vs the
  worked example (MASS 36 superheavy cruiser = 267 points).
- Scene control Fire tool dispatches ship-weapons vs fighter-attack by actor type.
- 708 tests passing; build 31kB/21 modules. Deferred: full fighter ops, moving
  missiles, damage control, vector movement, live Foundry verification.
- Commit: this commit.

## 2026-07-22 — Full Thrust: fighter morale/endurance + damage-control math
- Added pure, tested rule math: fighter morale (More Thrust: a depleted group
  passes on a d6 <= remaining fighters), endurance spend/exhaustion, and damage
  control (each DCP rolls, a 6 repairs a threshold-lost system; free DCPs by
  class). combat/fighters.ts + combat/damage-control.ts. 715 tests passing.
- These are rule primitives not yet wired to a reachable trigger (they tree-shake
  from the bundle until a repair/morale UI calls them) -- COVERAGE.md marks them
  🟡 with file locations, honestly, rather than claiming full integration.
- Commit: this commit.

## 2026-07-22 — Full Thrust hardening + rules-fidelity fixes (review pass 1)
- Ran 4 parallel review agents (hardening, polish, 2x rules-fidelity vs the notes),
  cross-verified findings, rejected one misread (free-FCS-by-class IS correct per
  the design cheat sheet; the 267pt worked example confirms it).
- Hardening (edge-case guards on exported pure fns, all TDD): non-finite distance ->
  beamDiceAtRange/torpedoToHit/submunitionDiceAtRange return 0/null (no NaN into
  rollPool; torpedo no longer auto-hits on undefined); arcForBearing(NaN)->"F";
  thresholdKillOn clamps worst>=1 (no NaN killOn); rowBoundaries treats rows<1 as 1
  (no div-by-zero disabling thresholds); beamDamageForFace(<0 screen)->unscreened;
  parseOrder tolerates nullish; fire-fighters rejects non-finite range.
- Rules fixes: (1) enforce "lose all FCS -> cannot fire" in fireShipAtTarget
  (refused:"no-fcs"); missing fcs defaults to 1 (schema default) so only explicit 0
  refuses. (2) faithful drive "half then dead": added schema `driveCrippled`; first
  drive threshold-hit halves thrust + flags, second kills outright (was repeated
  halving). (3) wired fighter morale (depleted group rolls <= size or aborts),
  endurance spend on a fired attack, and Attack-type +1/die into fireFighterGroupAtTarget.
  (4) MAX_THRUST=8 now enforced on the thrust schema field.
- Also H4: attacker spent-weapon write now uses targeted `system.weapons.N.spent`
  paths instead of clobbering the whole array from a pre-await snapshot.
- 729 tests passing. XSS handling reviewed and confirmed sound (no change).
- Commit: aeb0990.

## 2026-07-22 — Full Thrust polish pass (review: 5 hardening / 5 polish / 5 rules-gap)
- Polish refactors, behavior-preserving, 730 tests still green: extracted
  data/foundry-data-model.ts (shared TypeDataModel/fields resolution + registerActorDataModel,
  was triplicated); shared sheet resolution + registerActorSheet (fighter-sheet dropped its
  weaker `any` copy); combat/bands.ts shared bandIndex; reportBodyLines/wrapReport dedup the
  two chat-card builders; used the previously-unused constants (DIE_*, PDS_FIGHTER_*,
  MAX_THRUST, COURSES, FIGHTER_GROUP_MAX) instead of magic numbers; typed `game.user.targets`
  to drop an `as any`; removed a dead i18n type member.
- Documented deliberate simplifications now explicit in code: cinematic pivot-move-pivot
  displacement is manual-drag (only heading auto-applied); FTL aft blind spot is data-driven
  per-weapon; Fleet Book conditional aft fire / reroll / penetrating damage / Core-Systems +1
  / most specialised fighter types are out of FT2-core scope.
- Added a centre-to-centre regression test on the fire path; SYSTEM_POINTS/designPoints cite
  their source and scope.
- Commit: d4ee981.

## 2026-07-22 — Full Thrust: cinematic pivot-move-pivot movement now executed (was deferred)
- The previously-deferred cinematic course-change DISPLACEMENT is implemented. movement/path.ts
  `plotMovementPath` computes the pivot-move-pivot-move path per "Making Course Changes" (pivot
  half the turn rounded DOWN, move half the resulting velocity, pivot the rest, move the rest),
  returning the mid-turn waypoint + final displacement in mu (screen space, course N faces
  (N mod 12)x30deg clockwise from up). Verified numerically against BOTH worked examples
  (P3 v10 from C3 -> C12; S1 v14 from C8 -> C9).
- The Plot tool now traces it on the canvas: ui/round-control.ts `executeMovementPath` does two
  sequential token updates (pivot to mid-course + move to waypoint, then pivot to final course +
  move to end), converting mu->px via `pixelsPerMu(scene.grid)` (floored at 1, never /0). So the
  ship actually curves to its new position, not just rotates. Move distance = the RESULTING
  (post-order) velocity, matching FT "move the full velocity".
- 738 tests passing. Still canvas-only-unverified live (like the rest of the scene-control glue),
  but the geometry itself is unit-tested against the rulebook examples.
- Commit: e9fe75f.

## 2026-07-22 — Full Thrust: secret order plotting + simultaneous reveal (user request)
- The defining FT "written orders, then execute" mechanic. Plot tool no longer moves the token:
  it stores the order text on an actor flag (`flags.battleframe-full-thrust.plottedOrder`) that
  only the owner + GM can read (an opponent with no permission on the actor never receives it),
  so plotting is hidden. "Execute Maneuvers" (new GM-only scene-control tool) reads every ship
  token's plotted order, applies velocity/course + traces the pivot-move-pivot path, and clears
  the flags -- all ships move at once, the simultaneous reveal.
- Live plotting preview (user asked for "a line with an arrow ... forming as you fill out the
  plot"): as the owner types the order in the plot dialog, a client-LOCAL PIXI line-and-arrow
  (green legal / red illegal) redraws through start->waypoint->end. Pure geometry in
  movement/preview.ts (previewPointsPx/arrowHeadPx, tested); the PIXI drawing (ui/preview-
  overlay.ts) is defensive glue that never throws and is a local graphic, not a synced document,
  so the opponent never sees it. The dialog's live-redraw wiring + PIXI drawing are UNVERIFIED
  against a live Foundry canvas (the pure geometry and the execute logic are unit-tested).
- Secrecy relies on the normal ownership setup (each player owns only their own ships); documented.
- 743 tests passing.
- Commit: b715ec8.

## 2026-07-22 — Full Thrust: ownership-secrecy warning + player fleet import (user requests)
- Ownership warning: ui/ownership-warning.ts hooks `updateActor`; when a ship's ownership is
  changed so 2+ non-GM players can OBSERVE it (>= level 2, the point at which a user receives the
  document's flags), it warns via DialogV2 (notification fallback) that an opponent could now read
  the secretly-plotted order. Pure `plotSecrecyAtRisk(ownership, users)` tested (owner-only = safe,
  a second observer / default>=OBSERVER = at risk, GM ignored, LIMITED can't read).
- Fleet import (self-service, answers "can players build/import their fleet"): data/fleet-import.ts
  `parseFleet` (pure, tested) turns a bring-your-own-data JSON fleet into ship Actor create-data
  (derives the hull track from MASS when omitted, clamps out-of-range fields, drops unknown weapon
  kinds/arcs with a note). "Import Fleet" scene tool creates the actors owned by the importing
  player. Foundry's "Create New Actors" world permission still gates it -- the tool says so on
  failure. Format documented in FLEET-FORMAT.md. We ship no fleet data.
- Prior state (now answered): ship building was sheet-only and actor CREATION is GM-gated by
  default, so the GM prepped ships; the importer + the permission note give players a self-serve path.
- 757 tests passing.
- Commit: 7659277.

## 2026-07-22 — Full Thrust roadmap note + wired fire-phase turn order (roadmap P0 #1)
- Added docs/roadmap-full-thrust.md: a prioritized gaps/QoL inventory (P0 playability blockers =
  tested-but-dormant math; P1 QoL; P2 advanced rules; P3 live-verification debt).
- Fire-phase turn order is now WIRED (was tested-but-unreachable). round/fire-session.ts adds
  side-from-disposition (`shipSideOf`), ship collection (`collectFireShips`), the "may fire now?"
  check (`canShipFire`), and restore. round-control gains: "Begin Fire Phase" tool
  (`beginFirePhaseAction`, GM) that rolls initiative (one die per side via game.battleframe.dice,
  re-rolling ties) and persists the phase; fireAction now enforces active-side + eligibility when
  a phase is running and calls `advanceFirePhase` (record fire, announce next side, auto-clear on
  complete). No fire phase active = free fire (backward compatible).
- Storage: the phase state lives on a Document -- the active Combat if present, else the Scene --
  per the project's turn-state-on-a-Document rule (Scene fallback avoids forcing an encounter).
- 765 tests passing. Enforcement/initiative logic unit-tested; the scene-tool clicks + Document
  flag round-trip still want live-Foundry verification.
- Commit: 5b02bc2.

## 2026-07-22 — Full Thrust: PDS interception vs fighters (roadmap P0 #2)
- combat/fire-fighters.ts now fires the target's point defence FIRST: rolls `pds` dice,
  `pdsKillsVsFighters` (4-5=1, 6=2) removes fighters (capped at the group size), casualties
  persist to the group (system.size), and a group shot down to zero makes no attack
  (reason "shot-down"). PDS losses feed the morale check (depleted-group threshold uses the
  post-PDS count) and the attack rolls the survivors. Chat card reports the PDS kills.
- pdsKillsVsMissiles stays unwired until the missile/salvo launch flow exists (#4/#15).
- 767 tests passing.
- Commit: 500f496.

## 2026-07-22 — Full Thrust QoL: ship status icons + hull on hover (roadmap P1 #8, #9)
- src/status.ts registers `crippled` (drives dead, thrust 0) and `weapons-offline` (all FCS gone,
  fcs 0) on CONFIG.statusEffects; `syncShipStatuses(actor)` toggles both to match the ship's
  systems and is called at the end of `applyDamageAndThreshold`, so a threshold knockout that
  kills the drives/FCS immediately shows on the token. Destruction stays native `defeated`.
- The ship data model's `prepareDerivedData` computes `hullTrack` = "remaining/total" (the hover
  panel renders a value verbatim and a static field `max` can't track the box count), registered
  as the first hover field so hull damage is the headline at-a-glance stat.
- 774 tests passing.
- Commit: cb8c667.

## 2026-07-22 — Full Thrust QoL: editable-weapons ship sheet (roadmap P1 #7)
- The ship sheet's weapon list was read-only; now it has Add/Remove buttons (ApplicationV2
  `actions` → `onAddWeapon`/`onRemoveWeapon` over the pure `addWeaponTo`/`removeWeaponAt` ops) and
  per-weapon editing: kind (select), class (number), arcs (multi-select). `_prepareContext` builds
  `prepareWeaponRows` (kind/arc options with selected flags) so the template needs no `eq`/
  `includes` Handlebars helpers. Array ops + row prep + handlers unit-tested (782 total).
- Live-unverified: the ApplicationV2 action-button dispatch and the multi-select
  `system.weapons.N.arcs` → array form binding (needs a real Foundry v14 sheet).
- Commit: b989457.

## 2026-07-22 — Full Thrust: needle beams wired (roadmap P0 #3)
- combat/needle.ts `fireNeedleAtSystem`: requires a working needle mount that bears (arc) on a
  target within 9mu, rolls 1d6, and on a 6 knocks out ONE nominated surviving system (reusing
  enumerateSurvivingSystems + applySystemKnockouts), ignoring screens/armour and dealing no hull
  damage; then syncs the token status. A "Needle Beam" scene tool picks the system type
  (fcs/drive/screen/pds/weapon) via a dialog and posts a chat report. Core unit-tested (790 total).
- Commit: 3148e46.

## 2026-07-22 — Full Thrust: derive ship Points from systems (roadmap P0 #6)
- ship/design.ts `shipPointsFromSystem(system)` maps a ship's live play-model (mass/thrust/ftl/
  screens/pds/fcs + weapon mounts) onto a DesignSpec and runs designPoints -- beams become
  batteries (class + arc count), PDS costed as PDAF, FCS beyond the free class allowance charged.
  Reproduces the worked example (267) from an in-play system. A new `ftl` boolean field feeds it.
- prepareDerivedData populates `pointsValue`; the sheet shows Points + an FTL checkbox; fleet
  import parses `ftl` (default true). It's an informative FT2 estimate, not a standalone designer.
- 793 tests passing.
- Commit: a22013e.

## 2026-07-22 — Full Thrust: design+damage system model → damage control + SSD tracks (P0 #5, P1 #10)
- User-approved refactor: repairable systems now keep a DESIGN count plus a damage counter
  (fcs+fcsLost, pds+pdsLost, screens+screensLost, thrust+driveHits{0,1,2}); remaining is computed
  (usableThrust/remainingFcs/…), mirroring hull boxes/damage. A plain decrement forgot the
  original and blocked repair + an "N/M" SSD. `applySystemKnockouts` now increments the counters;
  new `applySystemRepairs` steps them back. Readers updated: enumerate (remaining), fire-ship FCS
  gate (remainingFcs), status (usableThrust/remainingFcs), movement (usableThrust as the thrust
  budget). Schema swapped driveCrippled→driveHits + added the …Lost fields.
- Damage control (#5): `resolveDamageControl(system, repairs)` restores knocked-out systems in
  priority order (fcs → drive → weapon → screen → pds); a "Damage Control" GM tool rolls each
  ship's DCPs (damageControl count) and applies repairs + status sync.
- SSD tracks (#10 partial): prepareDerivedData computes hull/thrust/fcs/screens/pds "remaining/
  design" strings, shown on the sheet (next to the design inputs) and the hover panel.
- 800 tests passing.
- Commit: cb55de5.

## 2026-07-22 — Full Thrust: salvo missiles wired (roadmap P0 #4, completes all P0)
- combat/salvo.ts `resolveSalvoAtTarget`: a "salvo" launcher mount rolls 1d6 missiles-on-target,
  the target's remaining PDS intercepts (salvoIntercepted 4-5=1/6=2), survivors each roll a
  damage die (salvoDamage) -- screens do NOT reduce, armour absorbs via the shared armour→hull
  path; the launcher is marked spent. Added "salvo" to WEAPON_KINDS (fire.ts ignores it in the
  pooled path; it fires via its own tool) + SALVO_RANGE_MU=24. A "Fire Salvo" scene tool + chat
  report. SIMPLIFICATION: direct-target within range; the point-of-aim-counter + movement-
  prediction step is deferred (combat resolution is faithful).
- 806 tests passing. This completes roadmap P0 (#1 fire order, #2 PDS, #3 needle, #4 salvo,
  #5 damage control, #6 points).
- Commit: 7d47b8b.

## 2026-07-22 — Full Thrust: adopt engine rounds API for the fire phase (extraction finding #1)
- User green-lit engine-extraction finding #1. Deleted the module's own turn-order machine
  (round/fire-phase.ts createFirePhase + its test) and now consume the ENGINE's activation order
  via game.battleframe.rounds (default alternation = Full Thrust's strict alternation, the
  no-priority-tier case). round/fire-session.ts keeps only the ruleset-specific parts (side from
  disposition, ship collection, the d6 initiative roll-off) + thin glue: build units, call
  createActivationOrder/restoreActivationOrder, map canShipFire→activeSideId/eligible and
  advance→activate. round-control resolves game.battleframe.rounds and persists the engine's
  serialized state to the Document (same flag). Destroyed ships pass isResolved so the order can
  complete without them.
- Net: alternation logic + tests now live once, in the engine (activation.test.ts), not
  duplicated in the module. 799 tests (807 − 8 deleted fire-phase tests + new engine-glue tests).
  Live-verify the round trip in a real world (engine rounds is runtime-only).
- Commit: 4e4be59.

## 2026-07-22 — Full Thrust: game-icons.net artwork (CC BY 3.0) with attribution
- Added 11 icons from game-icons.net (Lorc + Delapouite) to
  packages/battleframe-full-thrust/icons/ under CC BY 3.0. Legally safe: CC BY 3.0 permits
  commercial + non-commercial use WITH attribution. Attribution shipped in three places:
  repo-root ATTRIBUTIONS.md (master per-icon table), the module's icons/CREDITS.txt (travels
  with the deployed module), and the module NOTICE.md. The "ships no artwork" claim is updated
  -- these are freely-licensed COMMUNITY icons, not copyrighted GZG/Full Thrust art (of which the
  module still ships none).
- Wired: the crippled + weapons-offline status effects now use icons/crippled.svg (despair) +
  icons/weapons-offline.svg (screen-impact) instead of core Foundry SVGs. The other icons (ship,
  beam, missiles, system, etc.) are shipped for future sheet/token use. Deploy includes icons/
  (not in the exclude list).
- Commit: this commit.

## 2026-07-22 — Full Thrust: independent (More Thrust) missiles (roadmap P2 #15)
- Independent missiles are one-shot AI CRAFT, distinct from the salvo-missile weapon already built
  (#4). Modelled as two pure, injected-service functions mirroring salvo.ts / path.ts:
  - `movement/missile-path.ts` `plotMissilePath(start, distance, turn)`: up to 18mu (MISSILE_MOVE_MU)
    with ONE 2-point (60°) course change (MISSILE_TURN_POINTS) taken WHOLLY at the mid-point —
    unlike a ship, whose turn `plotMovementPath` splits half-at-start/half-at-mid. Half the
    distance on the launch course, pivot, half on the new course; returns the mu displacement in
    screen space. Verified by hand (Course 12, 18mu, +2 → end (7.794, -13.5)). Rejects |turn|>2
    (`turn-cap`) and distance>18 (`over-range`).
  - `combat/missile.ts` `missileCanAttack(distanceMu, bearing)` (≤6mu AND target not in the
    missile's rear "A" arc, via arcForBearing) + orchestrator `resolveMissileAttack`: measure
    range → attackable check → target PDS fires first (REUSES `pdsKillsVsMissiles`; a 6 kills the
    one missile) → survivor detonates a Normal warhead through the shared `applyDamageAndThreshold`
    (armour absorbs, screens do NOT reduce).
- RULES ASSUMPTION resolved (not the task's 1d6 fallback): `Rules/Weapons/Missile Warheads.md`
  Normal = "roll 2 dice, the TOTAL is the damage (2-12), ignores screens" → MISSILE_NORMAL_WARHEAD_DICE=2
  summed. Unambiguous, so 2d6, not 1d6.
- Constants added: MISSILE_MOVE_MU=18, MISSILE_TURN_POINTS=2, MISSILE_LIFE_TURNS=3,
  MISSILE_ATTACK_RANGE_MU=6, MISSILE_REAR_ARC="A", MISSILE_NORMAL_WARHEAD_DICE=2.
- SCOPE: pure combat + movement only (the deliverable). The dedicated missile-phase launch, the
  per-turn craft-tracking + remove-after-3-turns (MISSILE_LIFE_TURNS) Foundry token orchestrator,
  and the EMP / Needle warhead variants are deferred (COVERAGE row marked 🟡). This also flips the
  "PDS vs missiles" coverage row to ✅ (pdsKillsVsMissiles now has a live consumer).
- +14 tests (missile-path.test.ts 5, missile.test.ts 9); 827 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: big spinal weapons (Nova Cannon + Wave Gun) pure math (roadmap P2 #20 subset)
- Added `combat/spinal.ts` (+ `tests/spinal.test.ts`, 22 tests) implementing the FT2 spinal-mount
  Nova Cannon and the More Thrust Wave Gun as PURE functions over range / turn-of-life / die
  faces, mirroring `combat/beam.ts` + `combat/weapons.ts`. Rules numbers appended to
  `constants.ts` (NOVA_CANNON_* / WAVE_GUN_*) with the note quotes in the "Sources:" headers.
- Both weapons deal damage = the ACTUAL die score (like pulse torpedoes) with NO screen (and for
  the Wave Gun, no armour) reduction, so the damage functions carry no screen parameter — a shared
  private `sumFaces` expresses "damage = die score" once. Nova sweep: 3-turn life, 6/4/2 D6,
  2"/4"/6" template. Wave Gun: 36mu, 4/3/2 D6, 2"/3"/4" by 12mu band, plus charge-then-fire
  (accumulate 1d6/turn, fire at 6+, discharge to 0) and knock-out feedback = stored charge.
- ASSUMPTION: the Nova note gives an explicit "24" total" distance only for turn 1 (6mu arming +
  18mu travel); turns 2 & 3 ("move it 24"" each) are modelled as a contiguous forward sweep
  continuing from the prior turn's end point (bow offsets 6→24, 24→48, 48→72mu), documented on
  `NOVA_CANNON_TRAVEL_MU_BY_TURN`.
- SCOPE: pure math only — template canvas geometry, arming/charging bookkeeping on a Document, and
  a scene tool are DEFERRED (glue, out of scope). Did NOT add a WEAPON_KIND (would be an unused
  token while unwired). COVERAGE.md Nova/Wave rows updated to 🟡 (math + tests; UI deferred).
- Full suite 835 passing; typecheck clean. Worktree branch worktree-agent-a7479a4b5a4b870cf.
- Commit: this commit.

## 2026-07-22 — Full Thrust: vector movement (optional FT2 mode) — roadmap P2 #17
- Added `movement/vector.ts`, a PURE geometry/vector library for the optional physics-accurate
  system that contrasts with the cinematic `movement/path.ts`. Velocity is a persistent `{vx,vy}`
  vector (mu, screen space y-down, same course->heading convention as path.ts). `advance` moves the
  position by the velocity FIRST; thrust then NUDGES the vector: `applyMainDrive` burns along
  FACING, `applyPush` (P/S/R) and `rotateFacing` are the manoeuvring thrusters. Facing and course
  of motion can therefore differ (the whole point of vector mode). `resolveTurn` folds parsed
  manoeuvres in written order (`TP2,MD6` != `MD6,TP2`). `parseVectorOrder` reads MDn/TPn/TSn/
  PPn/PSn/PRn; `checkManoeuvres` enforces main-drive<=thrust and thruster-spend<=half (rounded
  DOWN, the mirror of cinematic turningCap's UP), rotation flat 1pt, push 1pt/mu, <=1 rotation &
  <=1 push per turn.
- ASSUMPTIONS/SIMPLIFICATIONS: (1) velocity is kept as an EXACT vector; the tabletop's
  "re-measure with a ruler, round to nearest mu" step is a physical artefact, so rounding is
  exposed for DISPLAY only via `velocityMagnitude`/`nearestCourse` (marker realignment) rather
  than mutating state. (2) Manoeuvring-thruster rating = floor(thrust/2) per Fleet Book (rounds
  down); rotation costs a flat 1 point for any heading (spin distance irrelevant), push 1pt/mu.
  (3) The canvas glue (a Vector-mode scene tool / token advance+rotate) is OUT OF SCOPE / DEFERRED
  to an orchestrator, exactly as path.ts defers the token move to ui/round-control. New rules
  numbers appended to constants.ts (MANOEUVRING_THRUSTER_DIVISOR, PUSH_MU_PER_POINT,
  ROTATION_THRUSTER_COST). COVERAGE vector-movement row flipped from deferred to 🟡 (math built).
- +16 tests (tests/vector.test.ts); 843 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: pre-fire targeting preview (roadmap P1 #11)
- Added `combat/targeting.ts` `previewTargeting`: a PURE per-weapon preview (bears? / in-range? /
  dice or to-hit) computed WITHOUT rolling, so a player sees which weapons reach a target and in
  which range band BEFORE committing to fire, rather than learning "out of arc" only afterwards.
  The fire/no-fire precedence (destroyed → spent → out-of-arc → per-kind range) mirrors
  `combat/fire.ts` `resolveWeaponFire` exactly, so the preview can never disagree with the actual
  shot. Salvo (24mu) and needle (9mu) — which have their own tools — are previewed on their own
  ranges so the whole loadout's reach shows at once.
- Wired a "Check Targeting" scene tool (`checkTargetingAction`) — player-visible (it only reads
  the player's own ship's reach), whispering `buildTargetingReportHtml` to the acting user so the
  card does not clutter the shared log. Placed right after the Fire tool.
- +15 tests (targeting.test.ts 12, round-control buildTargetingReportHtml 3); 880 passing;
  typecheck clean. The pure core + HTML builder are unit-tested; the scene-tool click is
  live-unverified (P3 debt). COVERAGE Fire-Arcs section gains a preview row; roadmap #11 → ✅.
- Commit: this commit.

## 2026-07-22 — Full Thrust: multi-FCS fire-splitting (roadmap P2 #18)
- Added `combat/fcs-allocation.ts` (`allocateFcsFire` + `validateAllocation`): PURE logic that
  splits a ship's weapons across up to N distinct targets, where N = working FCS count (the caller
  passes `remainingFcs` from `ship/systems.ts`). Source "Fire Control System (FCS)": each working
  FCS directs fire at ONE target/turn; N FCS may split weapons "in any combination" among N
  targets; lose all FCS → cannot fire; one weapon's dice may not split across targets.
- Eligibility (bears + in range) is decided by REUSING `combat/targeting.ts` `previewTargeting`
  (a weapon can engage a target iff its row is `will-fire`) — arc/range logic is never re-derived.
  The caller supplies each candidate target's already-measured distance + bearing, mirroring
  `previewTargeting`'s pure contract. No new constants were needed (purely structural).
- Allocation STRATEGY: greedy, caller-priority-ordered. Targets consumed in caller order
  (index 0 = highest priority); each weapon goes to the highest-priority target it can engage that
  is ALREADY engaged (concentrate fire / conserve FCS slots), else opens a new FCS slot on the
  highest-priority eligible target while engaged < N; a weapon that bears but finds every FCS
  committed is left unassigned with reason `fcs-cap`. Valid, not optimal — priority order is the
  caller's lever. `validateAllocation` rejects: >N distinct targets, a non-bearing/out-of-range
  assignment (with the offending status), unknown target ids, and one weapon split across targets.
- +16 tests (fcs-allocation.test.ts); 896 passing; typecheck clean. Pure core is unit-tested; no
  Foundry glue added this commit (scene-tool wiring is later work). roadmap P2 #18 → core done.
- Commit: this commit.

## 2026-07-22 — Full Thrust: Fleet Book optional damage layers (roadmap P2 #19)
- Added `ship/fleet-book.ts`: three PURE, opt-in Fleet Book 1 damage variants layered ON TOP of
  the FT2 default combat path (beam.ts / damage.ts / threshold.ts unchanged). (1) Reroll /
  penetrating damage ("Reroll Damage Rules"): a rolled 6 scores its damage AND spawns a reroll
  die, cumulatively with NO cap on the chain of 6s — replacing FT2's "6 = 2, done". `poolPenetrating
  Damage(initialFaces, rerollFaces, screenLevel)` sums the initial dice (screened) plus, for each
  6, one unscreened reroll from the caller-supplied list, chaining while rerolls show 6s. The
  reroll die reuses `beamDamageForFace(face, 0)` (1-3=0, 4-5=1, 6=2) so the base table is never
  duplicated; screens downgrade only the initial dice (reroll "already penetrated the screen"), and
  a screened 6 still triggers a reroll (trigger is the physical face). Worked chain 6→6→3 = 2+2+0 =
  4. (2) Armour bypass ("Armour"): `applyDamageBypassingArmour` (all points straight to hull, armour
  untouched) plus `applyPenetratingDamageWithArmour({normalDamage, penetratingDamage})` (normal
  spends armour then overflows to hull; penetrating goes direct) — one hull application on the
  combined hull-bound total so a threshold sees it as one attack; penetratingDamage 0 reduces
  exactly to `applyDamageWithArmour`. (3) Core Systems +1 ("Core Systems"): `coreThresholdKillOn` =
  `thresholdKillOn` + 1 (1st threshold → 7 = immune on a d6), and `knockedOutIndicesWithCore` which
  applies the surface kill number to surface systems and +1 to core-flagged ones.
- Only new rules number: `CORE_SYSTEM_THRESHOLD_BONUS = 1` appended to constants.ts with a source
  quote; the reroll + armour-bypass layers introduce no new damage numbers (they reuse DIE_* and
  DIE_TWO_DAMAGE). DEFERRED per the notes: Needle-Beam immunity for core systems (a targeting-layer
  concern, not threshold survival); Enhanced Pulse Torpedo vs-armour half-split; Fleet Book PDS
  reroll-on-6 — none implemented here, only the three layers the notes describe for this ticket.
  ASSUMED: reroll faces are supplied by the caller (pure functions don't roll); "core" = the three
  named buried systems flagged by `isCore[]`, not derived here; armour bypass modelled as an
  application variant (weapon-agnostic), the per-weapon "is penetrating" flag living in the caller.
- +22 tests (tests/fleet-book.test.ts); 902 passing; typecheck clean. Default combat path untouched.
  COVERAGE.md / roadmap-full-thrust.md left for the main session on integration.
- Commit: this commit.

## 2026-07-22 — Fighter pilot quality + Fast/Torpedo types as pure math (roadmap P2 #14 subset)
- Added `combat/pilot.ts` (Ace/Turkey/standard pilot quality) and `combat/fighter-types.ts`
  (Fast move, Torpedo attack run, Attack/spent-Torpedo dogfight kill table) rather than
  editing `combat/fighters.ts`, keeping the change additive and collision-free with the
  existing Heavy/Interceptor/Long-Range logic. Pilot quality changes the die COUNT and
  morale; fighter TYPE changes the per-die face table — the two are orthogonal and stack.
- Modifiers taken verbatim from More Thrust notes: Ace = +1 attack die, -1 morale, +1
  initiative, and a 1-die specific-system snipe that diverts the extra die; Turkey = +1
  morale (rolls even at full strength), breaks after 2 consecutive fails (vs 3), -1 to
  every dogfight die. Fast = 18mu; Torpedo one-shot = 4+ to hit then re-roll for damage =
  the number rolled (no screen reduction stated, so none applied), then fights as an Attack
  fighter (dogfight kills only on a 6, ONE kill). Each rules number lives at the END of
  `constants.ts` with a source quote.
- Deferred (absent from or out of scope per the notes): the Foundry orchestration (who
  moves 18mu, when a torpedo is spent, when pilot dice are surfaced) and the ship-design
  points premiums — pure predicates/numbers only here. +25 tests (pilot 19, fighter-types
  6); 905 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: visual SSD clickable hull track (roadmap P1 #10)
- Symptom/gap: the ship sheet showed hull as a bare "damage / boxes" number input; the roadmap
  asked for a visual SSD with clickable damage boxes + threshold-row separators.
- Fix: `sheets/ship-sheet.ts` gains pure `prepareHullBoxes(boxes, damage, rows)` (view-model: one
  box per hull point, first `damage` crossed off, a separator flagged after each threshold row's
  last box via `ship/hull.ts` `rowBoundaries`, none after the final/destruction box) and an
  `onToggleHullBox` action (click an intact box → damage = its number; click a damaged box →
  damage = number−1, unfilling it and beyond). Rendered in `templates/ship-sheet.hbs` as
  `data-action="toggleHullBox"` buttons above the retained number inputs; styled in
  `styles/full-thrust.css`. The number inputs stay as an exact fallback.
- Surfaces: ship-sheet.ts, ship-sheet.hbs, full-thrust.css, lang/en.json (trackHint).
- Watch: ApplicationV2 `submitOnChange` + a `data-action` button — the click handler updates the
  actor directly (not via form submit), so it must live-verify in Foundry (sheet render + click →
  hull.damage persists). Arc/range diagram (the other half of #10) still deferred.
- +6 tests (ship-sheet-hull.test.ts); 949 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Wired pilot quality into the fighter fire + dogfight orchestrators (roadmap P2 #14)
- `combat/pilot.ts`'s pure modifiers existed and were tested but nothing read them. Threaded a
  new optional `pilotQuality` (`"standard"|"ace"|"turkey"`, default `"standard"`) field on the
  `fighter-group` DataModel through the group's `system` into `fire-fighters.ts` and
  `dogfight.ts`, applying the pilot helpers so the orchestrators stay pure over the injected
  dice service (no `game.*`/Foundry calls added).
- fire-fighters: attack pool count is now `pilotAttackDice(remaining, quality)` (Ace +1 die);
  the morale gate switched from `remaining < FIGHTER_GROUP_MAX` + `fighterMoralePasses` +
  `fails >= 3` to `pilotRequiresMoraleCheck` (Turkey rolls even at full strength) +
  `pilotMoralePasses` (Ace −1 / Turkey +1 on the die) + `pilotMoraleBreaks` (Turkey breaks at
  2 consecutive fails vs 3). dogfight: the per-die `dogfightFaces` now also applies
  `pilotDogfightFaces` (Turkey −1/die, stacking with Interceptor +1), and the dice COUNT uses
  `pilotAttackDice` so an Ace throws its extra die here too (the dogfight size-dice path does
  NOT already supply the Ace die — it rolls one die per fighter, so it had to be added; the
  Attack/Torpedo per-die kill-table and Heavy screen were already applied and are untouched).
- Sheet: added a `pilotQuality` datalist input to `fighter-sheet.hbs` mirroring the existing
  `fighterType` control (avoided an `eq` Handlebars helper Foundry doesn't register). No new
  constants — every pilot-quality rules number already lived at the end of `constants.ts`.
- +5 tests (fire-fighters 4, dogfight 1); 948 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Multi-FCS fire-splitting orchestrator (P2 #18): sub-list index remap
- Added `combat/fire-ship-split.ts` (`fireShipSplit`), the testable orchestrator that
  ties the existing allocator (`allocateFcsFire`) to the existing per-target pipeline
  (`resolveWeaponFire` + `applyDamageAndThreshold`). It mirrors `fireShipAtTarget` but
  fans one ship's weapons across up to N targets, one per working FCS. PURE over the
  injected `FireContext` (measure/facing/dice) — no Foundry/scene glue here (that is the
  main session's part).
- Key correctness point: `resolveWeaponFire` indexes its `shots[].index` and `spent[]`
  against the WEAPON SUB-LIST it is handed, not the attacker's real mounts. The
  orchestrator builds each target's sub-list from `assignment.weaponIndexes` and remaps
  both back through `weaponIndexes[...]` so every report shot and the spent-write carry
  the TRUE mount index. Spent one-shots are accumulated across all targets into ONE
  `attacker.update({...})`, keyed by real index, exactly like `fireShipAtTarget`.
- Edge decision: a target that ends up with zero assigned weapons is OMITTED from
  `perTarget` — the allocator never emits an empty assignment, so there is no empty report
  to surface; `perTarget` contains only engaged targets, in engage order. `fcsCount`
  follows `fireShipAtTarget`'s convention (missing `fcs` defaults to 1; `< 1` refuses with
  `refused: "no-fcs"` and empty perTarget/unassigned).
- Tests reuse fire-ship.test.ts's fake-ship/scripted-dice builder shape. +4 tests
  (split-by-arc, no-fcs refusal, spent-index remap, centre-to-centre measure); 947 passing;
  typecheck clean.
- Commit: this commit.

## 2026-07-22 — Independent missile EMP & Needle warheads as pure math (roadmap P2 #15 subset)
- Extended `combat/missile.ts` with a `warhead: "normal" | "emp" | "needle"` param on
  `resolveMissileAttack` (default "normal"), dispatching after the shared range/bearing/PDS
  prelude. The Normal path is byte-for-byte behaviour-compatible (existing missile.test.ts
  unchanged, still 9 passing); the interception step (`pdsKillsVsMissiles`) and the system
  knockout primitives (`enumerateSurvivingSystems` / `knockedOutIndices` / `applySystemKnockouts`
  / `syncShipStatuses`) are REUSED, not duplicated — the same machinery `combat/needle.ts` and
  the shared threshold check use.
- Rules taken VERBATIM from the user's "Missile Warheads.md" note (More Thrust):
  EMP = "Roll ONE die, subtracting 1 per level of the target's screens, then: 1-2 = no effect.
  3-4 = roll for EVERY system as a Threshold Check; systems knocked out on 5-6. 5-6 = ...
  knocked out on 4, 5 or 6." No hull damage. Needle = "Owner picks the target system and rolls
  a die: 1-3 = misses that system but does ONE die-score of normal damage (1-6 points). 4-6 =
  knocks out that specific system AND does 1 die of normal damage."
- ASSUMED (Needle die count): the note says "rolls a die" (singular) and both branches "do 1
  die of normal damage", so modelled as a SINGLE die whose face is the normal damage dealt AND,
  on 4-6, also knocks out the nominated system; the "(1-6 points)" parenthetical read as
  defining "one die-score". The two-dice reading (separate to-hit + damage die) is a one-line
  change if wrong — flagged at the MISSILE_NEEDLE_* constants.
- NOTED tension: the note header says "All three ignore Screens", yet the EMP rule explicitly
  subtracts screen level from its EFFECT die. EMP does no hull damage, so "damage bypasses
  screens" is vacuous for it; the screen subtraction on the effect die is implemented as the
  specific rule states.
- New rules numbers appended to the END of `constants.ts` (MISSILE_EMP_* and MISSILE_NEEDLE_*)
  with source-quote comments. +9 tests (tests/missile-warheads.test.ts); 952 passing; typecheck
  clean. COVERAGE.md / roadmap-full-thrust.md left untouched per task scope.
- Commit: this commit.

## 2026-07-22 — Full Thrust: Split Fire scene tool wires the multi-FCS orchestrator (P2 #18)
- Symptom/gap: `fireShipSplit` (the multi-FCS split orchestrator) + `allocateFcsFire` were pure +
  tested but had no way to invoke them in Foundry — a ship still fired all weapons at one target.
- Fix: added `splitFireAction` + a "Split Fire" GM scene tool. It reads the controlled attacker and
  EVERY targeted token (new `targetedTokens()` reads the whole `game.user.targets` Set, vs the
  single-target `targetedToken()`), runs `fireShipSplit`, and posts a per-target chat card via the
  new pure `buildSplitFireReportHtml`. Honors the same initiative/alternation gate as Fire and
  advances the fire order after.
- Surfaces: ui/round-control.ts (builder + action + tool registration + `targetedTokens`),
  lang/en.json (controls.splitFire), tests/round-control.test.ts.
- Watch: multi-target read depends on Foundry's `user.targets` being an iterable Set — live-verify
  targeting 2+ tokens then Split Fire produces one card with a block per engaged target. The
  target-priority order is currently the Set's iteration order (no explicit picker UI yet).
- +4 tests (buildSplitFireReportHtml 3, split-fire tool registration 1); 970 passing; typecheck
  clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: visible fire-phase turn tracker (roadmap P1 #12)
- Symptom/gap: whose-turn-it-is in the fire phase was a GM-only `ui.notifications` toast printing a
  raw disposition number ("side -1"); players had no visible tracker.
- Fix: pure `firePhaseStatusLine(order)` + `sideLabel(id)` in `round/fire-session.ts` (maps
  Foundry dispositions → Friendly/Hostile/Neutral/Secret; reports the active side + its remaining
  eligible ships, or completion). `round-control.ts` now posts this as a persistent chat card
  (`announceFirePhase`) visible to ALL players on fire-phase begin and after each activation
  (replacing the GM toast), plus a "Phase Status" GM scene tool (`phaseStatusAction`) to re-post
  the current tracker on demand.
- Surfaces: round/fire-session.ts (pure line + label), ui/round-control.ts (announce + tool),
  lang/en.json (controls.phaseStatus).
- Watch: the announcement fires on begin/advance — live-verify Begin Fire Phase posts a readable
  "Friendly/Hostile to fire" card and Phase Status re-posts it. The "New Battle" reset + fully
  localized chat cards (the other #12 sub-items) remain deferred.
- +5 tests (fire-phase-status.test.ts); 975 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: pure fighter-movement core (P2 #16)
- Gap: ship movement (path.ts cinematic pivot-move, vector.ts vector mode) existed, but there was
  no geometry for how a FIGHTER group moves — and fighters move differently: a flat distance in any
  direction each turn, no course/velocity tracked, ignoring ship turning caps.
- Fix: new pure `movement/fighter-move.ts` — `fighterMaxMove` (reuses `fighterMoveForType`: 12 mu
  standard / 18 mu Fast), `distance` (reuses vector.ts `velocityMagnitude` on the displacement, no
  hypot duplicated), `moveToward` (clamp to allowance, land on target if within reach), and
  `canReachToAttack` (can the group end within `FIGHTER_ATTACK_RANGE_MU` (6) of a ship this turn;
  closes only to the edge of strike range, returns the intercept). Same {x,y} mu screen-space
  convention (x right, y DOWN) as vector.ts / path.ts. No Foundry code — the token orchestrator
  (who/when) is deferred, matching path.ts / vector.ts.
- Notes wording vs assumptions: move/range/direction/Fast are taken verbatim from the user's
  "Fighter Groups" + "Specialised Fighter Types" notes ("up to 12 mu in any direction ... no
  orders, no course/velocity tracked"). ASSUMPTION — the "Fighter Attacks" note requires the target
  in the fighters' FORE arc, yet "Fighter Groups" tracks no facing; resolved as free orientation at
  end of move, so the fore-arc rule adds NO positional constraint and range alone gates the strike
  (documented in the file header). Move + strike in the same turn is the normal flow (notes give no
  "move OR attack" restriction), so nothing blocks it.
- No new constants needed (reused `FIGHTER_MOVE_MU` / `FIGHTER_MOVE_FAST_MU` / `FIGHTER_ATTACK_RANGE_MU`);
  `constants.ts` untouched. COVERAGE.md / roadmap-full-thrust.md left untouched per task scope.
- TDD: tests/fighter-move.test.ts first (hand-computed vectors), watched fail (missing module),
  then implemented. +11 tests; 981 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: Fleet Book conditional aft fire + variable hull (P2 #19, pure)
- Gap: two Fleet Book pure-math layers were unbuilt. (a) `combat/arcs.ts weaponBearsOn` had no
  notion of whether the firer thrusted, so the Fleet Book conditional aft-fire rule could not be
  expressed. (b) `ship/hull.ts`/`ship/design.ts` only modelled FT2's fixed hull-boxes-by-MASS,
  not the Fleet Book variable-hull design choice.
- Both rules are explicitly described in the user's notes (verified, not invented):
  - Conditional aft fire — "Fire Arcs" note: "Fleet Book optional aft-arc fire: all-round turret
    weapons may fire aft on a turn in which the ship applied no main-drive thrust (course changes /
    thruster use are fine; any accel/decel blocks aft fire that turn)."
  - Variable hull — "Variable Hull Strength" note: five grades taking 10/20/30/40/50% of MASS,
    "that same MASS figure becomes the ship's damage (hull) boxes ... Points cost of the hull
    integrity is always 2 x the MASS used on it ... split into 4 rows; if not divisible by 4,
    extra boxes go in the upper rows." Verified against the MASS-60 worked example.
- New PURE files, both OPT-IN (default paths untouched): `src/combat/aft-fire.ts` (isAllRoundTurret,
  aftFirePermitted, additive weaponBearsOnWithAftFire — reduces to weaponBearsOn when the ship
  thrusted or the target is not aft), `src/ship/variable-hull.ts` (hullBoxesForGrade,
  variableHullMassUsed, variableHullPointsCost, hullPointsForGrade, variableHullLayout reusing
  ship/hull.ts rowBoundaries).
- Modelling choices: an "all-round turret" = a mount covering all five non-aft arcs (the FTL aft
  blind spot blacks out A on every icon; the conditional rule reopens it). aftFirePermitted is the
  conditional GRANT only — a mount already listing "A" bears via weaponBearsOn, so the grant adds
  nothing there.
- ASSUMPTION (flagged in code): the note's cost = "2 x MASS used" and boxes == MASS used, so cost =
  2 x boxes, independent of total MASS (total MASS only bounds legal grades, 10-50%). Fractional box
  counts (non-MASS-60 ships) round to nearest integer (Math.round); floor/ceil would be a one-liner.
- New rules numbers appended to END of `constants.ts` (VARIABLE_HULL_GRADE_PERCENT,
  VARIABLE_HULL_POINTS_PER_MASS, VARIABLE_HULL_ROWS) with source-quote comments. Conditional aft
  fire needs no new number (reuses the existing "A" FireArc). +20 tests (aft-fire 12, variable-hull
  8); 990 passing; typecheck clean. COVERAGE.md / roadmap-full-thrust.md left untouched per scope.
- Commit: this commit.

## 2026-07-22 — Full Thrust: fire-arc ring overlay on ship tokens (user request)
- Ask: show the 6 fire arcs around a ship token (the GZG "FTring" firing-arc diagram) on the
  canvas — on hover, and pinnable — so players see their fleet's arcs at a glance ("and it looks
  cool").
- Fix: `ui/arc-overlay.ts`. PURE geometry (unit-tested): `arcRayAngles` (boundaries at
  facing+30/90/150/210/270/330, matching `arcForBearing`'s F-at-±30 bucketing), `arcLabelAngles`
  (F/FS/AS/A/AP/FP at sector midpoints), `polarToScreen` (clockwise-from-up → y-down screen point,
  the engine `facing` convention). Defensive PIXI glue (never throws): draws 3 beam range rings
  (12/24/36mu via grid scale), the 6 arc-boundary rays oriented to the token's facing, and arc
  labels. `registerArcOverlay` hooks `hoverToken` (draw/clear), `updateToken`/`refreshToken`
  (redraw pinned), `deleteToken` (cleanup); a player-visible "Fire Arcs" scene tool
  (`toggleArcsAction`) pins/unpins rings on the controlled ships (or all ships if none selected).
- Surfaces: ui/arc-overlay.ts (new), ui/round-control.ts (tool + `toggleArcsAction`), main.ts
  (registerArcOverlay), lang/en.json (controls.arcs).
- Watch: PIXI drawing is live-only — verify the ring renders oriented to the token's heading, the
  arcs match the fire math (F dead-ahead), hover shows/hides, and the tool pins. A drawing failure
  is swallowed so it can never break the canvas.
- +5 tests (arc-overlay.test.ts geometry); 1011 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: independent-missile PHASE orchestrator (roadmap P2 #15)
- Gap: EMP/Needle/Normal warhead math + `plotMissilePath` existed but there was no way to launch a
  missile or fly it — the whole "fire-and-forget craft" loop was unbuilt.
- Design choice: a missile is NOT a manually-moved token, so instead of a new Actor subtype + token
  CRUD, missiles are lightweight SCENE-FLAG state (`ACTIVE_MISSILES_FLAG`: {id,x,y,course,
  turnsLived,warhead,ownerDisposition}) drawn as PIXI arrowhead markers. The engine measure/facing
  duck-type on `{center}` + `{document.rotation}`, so a SYNTHETIC token-like object
  (`missileToken`) lets `resolveMissileAttack` measure a strike against a real ship token with no
  missile Actor. State on the Scene = persistent + synced per the turn-state rule.
- `combat/missile-phase.ts` (pure + tested): `advanceMissile` (fly 18mu along course with an
  optional ≤2-pt mid turn — illegal turn flown straight — via `plotMissilePath`, bump life) and
  `missileExpired` (≥3 turns). `ui/missile-overlay.ts` draws the markers (defensive PIXI; redrawn
  on `canvasReady` from the scene flag). `round-control.ts`: a "Launch Missile" tool (places a
  missile ahead of the controlled ship on its course) + a "Missile Phase" tool (advance each,
  strike the nearest eligible enemy ship ≤6mu not in the missile's rear arc via
  `resolveMissileAttack`, post `buildMissileReportHtml`, remove struck/burned-out). Normal warhead
  by default (EMP/Needle selection UI deferred).
- Surfaces: combat/missile-phase.ts (new), ui/missile-overlay.ts (new), ui/round-control.ts
  (launch/advance actions + builder + 2 tools + missile helpers), main.ts (registerMissileOverlay),
  constants.ts (ACTIVE_MISSILES_FLAG), lang/en.json.
- Watch: scene-flag persistence + PIXI markers + the synthetic-token measure are live-only —
  verify launch places a marker, the phase moves it 18mu + strikes a ship in range, and it vanishes
  after 3 turns. A per-missile turn/warhead picker is a future refinement.
- +10 tests (missile-phase 6, buildMissileReportHtml 4); 1021 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: clickable armour damage track (roadmap P1 #10, extends hull)
- Ask: extend the ship sheet's clickable-box SSD UI from the hull track to ARMOUR (and,
  if clean, the design-count systems), matching the established hull pattern exactly.
- Fix: `prepareArmourBoxes(boxes, damage)` (pure view-model — a `{number, damaged}[]`, no
  `rowEnd`, since armour has no threshold rows) + `onToggleArmourBox` (same fill/unfill
  semantics as the hull handler, writing `system.armour.damage`). Registered as the
  `toggleArmourBox` sheet action; `_prepareContext` now supplies `context.armourBoxes`.
  Template gains a `.ft-hull-track.ft-armour-track` block of `data-action="toggleArmourBox"
  buttons above the existing armour number inputs (kept as an exact fallback). CSS reuses
  `.ft-hull-box`/`.ft-damaged` with a cool `.ft-armour-box` intact tint (armour absorbs
  before the hull); damaged pips stay the shared red.
- Scope: ARMOUR ONLY. The design-count systems (FCS/PDS/screens) were SKIPPED as awkward,
  not clean: their damage counter is the combat-driven `…Lost` field, which — unlike hull
  `damage`/armour `damage` — has NO existing number-input fallback on the sheet (only the
  design count is an input; the track is a read-only `…Track` span). Adding pip editing would
  introduce a brand-new hand-edit surface for three systems plus their fallback inputs and
  risk divergence from combat-driven damage — beyond mirroring the hull pattern. Deferred.
- Surfaces: src/sheets/ship-sheet.ts, templates/ship-sheet.hbs, styles/full-thrust.css,
  lang/en.json (armour.trackHint), tests/ship-sheet-armour.test.ts (new).
- Watch: PIXI-free but Foundry-facing (sheet action wiring) — live-verify the armour row
  renders, clicks fill/unfill and persist, and the number inputs still work as fallback.
- +6 tests (ship-sheet-armour.test.ts); 1017 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: carrier fighter operations pure core (roadmap P2 #14)
- Ask: launch/recover + endurance-return for carriers holding fighter groups. PURE + tested, new
  file, no Foundry code.
- Fix: `combat/carrier.ts` (new). Pure functions, all unit-tested and hand-computed from the user's
  notes ("Carriers & Fighter Bays", "Fighter Endurance"): `bayCapacity(bays)` → {groups, fighters}
  (1 group / 6 fighters per bay, damage-aware — a knocked-out bay just lowers the count, matching
  the note's class table BDN 1/6, SDN 2/12, Light Carrier 4/24, Fleet 6/36); `launchLimit` (2 for a
  true carrier, 1 otherwise) + `canLaunch(carrierState)`; `carrierCanRecover` (1/turn, needs a free
  bay); `canRecover(groupPos, carrierPos, type?, dockRangeMu?)` — the end-of-move rendezvous, REUSES
  `movement/fighter-move.ts` `canReachToAttack` geometry (no distance re-derived); `enduranceAfterTurn`
  (spends 1 on an ACTIVE turn only, floors at 0, REUSES `fighters.ts` `enduranceAfterActiveTurn`);
  `mustReturn` (endurance 0, REUSES `enduranceExhausted`); `isLost` (More Thrust: lost ≥3 turns after
  exhaustion); `recover(group)` (rearm/refuel → endurance back to type max via `enduranceForType`).
- Notes wording vs assumptions:
  - Bay capacity IS fully specified in the note ("each bay holds one 6-fighter group", class table);
    modelled on functional bays rather than ship class so it stays damage-aware ("each lost bay
    reduces capacity by six").
  - Endurance numbers ARE specified (More Thrust: 3 turns, Long-Range 5; spent per active/combat
    turn, loitering free) and reuse the existing `fighters.ts` seeds — no new endurance number added.
  - ASSUMPTION: docking tolerance — the notes give no explicit dock distance, so `canRecover`
    defaults `dockRangeMu` to 0 (group must land within its move allowance of the carrier),
    caller-overridable for a later token-radius geometry layer.
  - ASSUMPTION: `isLost` boundary + edition — the More Thrust "within 3 turns of exhaustion" grace
    is read as lost once ≥3 completed turns elapse; Fleet Book 1 has NO such limit, so the predicate
    is More-Thrust-only (documented on the constant). `recover` restores endurance only — notes
    describe rearm/refuel, not a morale reset, so morale is left untouched.
- New rules numbers appended to END of `constants.ts` (FIGHTERS_PER_BAY, CARRIER_LAUNCH_PER_TURN,
  SHIP_LAUNCH_PER_TURN, FIGHTER_RECOVER_PER_TURN, FIGHTER_RETURN_GRACE_TURNS) with source quotes.
- +16 tests (carrier.test.ts); 1027 passing (was 1011); typecheck clean. COVERAGE.md /
  roadmap-full-thrust.md left untouched per scope. No Foundry glue, no round-control edits.
- Commit: this commit.

## 2026-07-22 — Full Thrust: Kra'Vak kinetic weapons pure math (roadmap P2 #20, xeno subset)
- Ask: build PURE, tested math for the Kra'Vak race's signature kinetic weapons (K-guns /
  railguns / scatterguns) and their armour-piercing damage rule; NEW file, no Foundry code.
  Verified every number against the user's notes (Factions & Ships/Xeno/K-guns.md,
  Scatterguns.md, Kra'Vak.md, Kra'Vak Armour.md).
- Fix: `combat/kravak.ts` (new). K-gun: `kgunToHit` (2+/3+/4+/5+/6 by 6mu band, max 30mu, shared by
  all classes — mirrors `torpedoToHit`), `kgunDamageForFace` (roll>class = class DP, roll<=class =
  class×2, natural 6 always = class — the cap that matters for K-6/K-6+), `applyKgunHit` (armour
  PIERCE: only the first DP hits armour, remainder straight to hull — reuses `applyDamageWithArmour`
  by routing the pierced remainder through a zero-armour ship), `kgunK1PointDefenceKills` (5-6, one
  kill per hit, via `countHits`). MKP pack: `mkpHits` (4-5=1, 6=2), each flat 4 DP via `applyKgunHit`.
  Scattergun (all-arc one-shot, no FC): `scattergunFighterKills` (1D6, halve round-up vs heavy),
  `scattergunPlasmaReduction` (4-5=−1, 6=−2), `scattergunShipDamageForFace` (4-5=1, 6=2 DP; NOT
  piercing — absorbed by armour normally), `scattergunFriendlyFireHit` (area-defence roll of 1).
  Screens are kinetically irrelevant throughout, so there is no screen parameter anywhere.
- Constants: Kra'Vak block appended at the END of `constants.ts`, each number with a source-quote
  comment. Per PDS precedent, the K-gun to-hit table keeps its own constants even though it
  coincides numerically with pulse torpedoes.
- Deferred (in the notes, not implemented — flagged, not invented): the More Thrust "railgun" edition
  variant (classes 1-3, "−1 per armour level" from the die) is a superseded edition layer, so FB2 is
  the baseline (mirrors beam.ts taking FT2 core); Phalon multi-layer-shell interaction ("one box per
  shell layer") is out of scope (Phalon/Sa'Vasku excluded); the More Thrust scattergun profile
  (12mu, FC-required, damage=die) likewise superseded by FB2. No engine glue / sheet / dice wiring
  (that is the orchestration layer's job).
- +18 tests (kravak.test.ts, hand-computed from the notes' worked examples); 1029 passing (was 1011);
  typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: spinal-weapon scene tools (Nova Cannon + Wave Gun) (roadmap P2 #20)
- Gap: `combat/spinal.ts` had the Nova/Wave damage math but no way to fire them.
- Fix: "Nova Cannon" + "Wave Gun" GM scene tools (`fireNovaCannonAction`/`fireWaveGunAction` over a
  shared `resolveSpinalWeapon`): roll the weapon's dice (Nova turn-1 = 6D6; Wave by range band via
  `waveGunDiceAtRange`), sum faces for damage (screens give no protection), apply via
  `applyDamageAndThreshold`, post `buildSpinalReportHtml`.
- SIMPLIFICATION (like the salvo tool): resolves directly against ONE chosen target rather than the
  swept/expanding MeasuredTemplate; the Nova's 3-turn sweep is fired as its turn-1 blast; the Wave
  Gun charge cycle is not yet tracked (assumes ready). Remaining #20 pieces + Wave Gun armour bypass.
- Surfaces: ui/round-control.ts (builder + 2 actions + shared resolver + 2 tools), lang/en.json.
- Watch: live-verify firing each at a targeted ship posts a damage/threshold card.
- +3 tests (buildSpinalReportHtml); 1064 passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: Sa'Vasku bio-ship pure math (roadmap P2 #20, xeno subset)
- Ask: build PURE, tested math for the Sa'Vasku living ships — their per-turn Power Point pool +
  four-pool (Move/Attack/Defence/Repair) allocation, bio-weapon resolution, and biomass
  regeneration/self-consumption; NEW file, no Foundry code. Verified every number against the user's
  notes (Factions & Ships/Xeno/Sa'Vasku.md, Sa'Vasku Power Points.md, Sa'Vasku Systems.md).
- Fix: `combat/savasku.ts` (new). Power: `powerPoolTotal` (sum of surviving generators' MASS; unspent
  lost = caller concern). Movement: `driveThrustCost` (2%×thrust×MASS ceil, damaged ×2),
  `ftlJumpCost` (= FTL node MASS). Defence: `screenNodeMass` (5% ship MASS ceil, min 3). Stinger beam:
  `stingerPowerPerDie` (1/2/4/8/16/32 doubling per 12mu band to 72mu, mirrors `torpedoToHit` null-out)
  + `stingerDiceForPower` (floor(power/perDie)); per-die DAMAGE reuses beam.ts `poolBeamDamage` (screens
  apply) — base die table NOT duplicated. Pods: `lancePodToHit` (3+/4+/5+/6 by 6mu, max 24mu) +
  `applyLancePodHit` (damage = die face, armour-pierce — reuses `applyKgunHit`, identical pierce rule);
  `leechPodClears` (Sa'Vasku spend 1-3 R-points; impact/ongoing 2 DP are non-penetrating via
  `applyDamageWithArmour`). Repair: `systemRepairCost` (= system MASS), `systemRepairSucceeds` (4+),
  `droneGrowthCost` (1 power + 1 biomass per drone). Biomass: `biomassRemaining` + `consumeBiomass`
  (consumes from far end, NEVER trips a threshold — the Sa'Vasku-specific rule — dead when consumed +
  damaged boxes meet). Interceptor Pod / Spicule reuse kravak.ts scattergun + shared PDS at the call
  site (constants + documented reuse, no wrapper).
- Constants: Sa'Vasku block appended at END of `constants.ts`, each number with a source-quote comment.
  ASSUMPTION flagged: the 5% screen-node MASS has no rounding stated in the notes — modelled round-UP
  (as the 2% thrust cost is) then floored at 3 MASS.
- Deferred (in the notes, flagged not invented): the Stinger's "6 = reroll" penetrating layer — dice use
  the FT2 base beam table, mirroring beam.ts's own reroll deferral; the More Thrust "Power Factor" model
  (5 dice/turn, up-to-PF storage) is a superseded edition layer (mirrors kravak.ts leaving the More
  Thrust railgun out of scope). Cortex needs no power (nothing to compute); drone COMBAT reuses standard
  fighter mechanics. No engine glue / sheet / dice wiring (orchestration layer's job); Phalon is a
  separate task and not built.
- +25 tests (savasku.test.ts, hand-computed from the notes); 1086 passing (was 1061); typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: Phalon plasma bolts + multi-layer shell pure math (roadmap P2 #20, xeno subset)
- Scope: second of the FB2 Xeno races (after Kra'Vak). New pure file
  `packages/battleframe-full-thrust/src/combat/phalon.ts` + `tests/phalon.test.ts`
  (27 tests, hand-computed from the notes' worked wording). No engine/sheet/dice glue.
- Plasma Bolt Launcher (placed-marker area weapon). Interception wears the bolt down
  BEFORE it bursts: `plasmaBoltPdsReduction` (PDS 6 = -1), `plasmaBoltInterceptReduction`
  (scattergun/interceptor "roll like a beam die": 4-5 = -1, 6 = -2), `plasmaBoltStrength`
  (reduced size = launched size - all reductions, floored at 0). Burst is "full dice"
  (DP = die score) — NOT the beam 4-5/6 table — so `plasmaBoltDamageForFace` returns the
  face itself and screens/shrouds NEGATE high faces outright (level-1 kills 6s; level-2 /
  vapour shroud kills 5s and 6s); `poolPlasmaBoltDamage` sums. Shroud = level-2 screen vs
  energy, so level 2 is the strongest plasma entry (`PLASMA_BOLT_SCREEN_MAX_LEVEL`).
- Multi-layer shell armour, layers ordered OUTERMOST-first (inner "layer 1" last):
  `applyShellHit` (normal/non-piercing — outermost layer spent first, then inward, overflow
  to hull), `applyKgunShellHit` (Kra'Vak rule confirmed in the K-guns note: "takes one box
  from each shell layer, remainder to hull" — one box per still-boxed layer, capped by DP,
  rest to hull), `applyHalfArmourShellHit` (half to outer / half to next layer). All route
  their overflow through the shared `applyDamageWithArmour` (zero-armour ship) so hull
  thresholds/destruction stay consistent with the rest of the system.
- Constants: Phalon block appended at the END of `constants.ts`, each with a source-quote
  comment. Per the Kra'Vak/PDS precedent the interceptor 4/5/6 thresholds keep their own
  constants even though they coincide with the scattergun-vs-plasma numbers; the negated
  plasma faces reuse existing DIE_ONE_DAMAGE_MAX (5) / DIE_TWO_DAMAGE (6).
- Assumed (notes silent — flagged, not invented): half-armour odd-DP rounding puts the extra
  point on the OUTER layer (ceil outer / floor next), and each half that exceeds its target
  layer overflows inward then to hull.
- Deferred (in the notes, not implemented): pulsers (an energy/beam variant — reuse beam.ts,
  full dice over whole range, config L/M/C; belongs to the beam + design layer, not re-modelled
  here); vapour shroud own-fire/launch penalties, MASS/points costs, ADFC lend-PDS, and PBL
  recharge/every-other-turn cadence (orchestration/design state, not pure damage math); the
  shell "reroll steps down one layer per reroll" rule (rerolls are a deferred optional layer
  throughout beam.ts / ship/damage.ts, and nothing here rerolls).
- +27 tests (phalon.test.ts); 1088 passing (was 1061); typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: fighter-movement token tool (roadmap P2 #16)
- Gap: `movement/fighter-move.ts` (`canReachToAttack`) was pure + tested but nothing moved a
  fighter-group token.
- Fix: a "Move Fighters" tool (`fighterMoveAction`, player-usable) advances the controlled fighter
  group toward the targeted ship up to its move allowance (12mu / 18mu Fast), stopping at the edge
  of its 6mu strike range (never overshooting). Reuses `canReachToAttack`; converts token centres
  px→mu for the reach math and back to px for the token `update`. The group then fires with the
  normal Fire tool.
- Surfaces: ui/round-control.ts (action + tool), lang/en.json (controls.fighterMove).
- Watch: token px↔mu conversion + the top-left vs centre offset — live-verify a group moves toward
  a ship and stops in range.
- No new tests (thin token glue over the tested reach core; tool registration asserted); 1116
  passing; typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: wire the Kra'Vak K-gun as a fireable weapon kind (roadmap P2 #20)
- Gap: `combat/kravak.ts` had the tested K-gun math (`kgunToHit`, `kgunDamageForFace`,
  `applyKgunHit`) but no `WEAPON_KINDS` entry, so a ship mount could not actually fire a K-gun
  through `resolveWeaponFire` / the fire orchestrators.
- Design issue: the K-gun pierces armour PER HIT (only the first DP of each single hit is stopped
  by armour, the rest goes straight to hull), which does NOT fit `resolveWeaponFire`'s "sum all
  weapon damage, apply armour once downstream" pool. Chose **option (b)**: the K-gun is its own
  damage stream, NOT added to the armour-eligible `totalDamage`. `resolveWeaponFire` rolls one
  to-hit die by band (`kgunToHit`, kinetic so screens never apply) and, on a hit, a penetration
  die (`kgunDamageForFace`), and returns the per-hit DP in a new `piercingHits: number[]` (a LIST,
  never pre-summed, precisely because the pierce is per-hit). Downstream `applyDamageToShip` applies
  the pooled beam damage through armour first, then folds each K-gun hit on via `applyKgunHit`
  (1 DP to armour, remainder to hull) onto the same running state — ONE persisted write, one
  destruction toggle, thresholds unioned. So the existing single armour step is genuinely a no-op
  for the K-gun stream. Beam/torpedo/submunition are byte-for-byte unchanged (their pool and tests
  are untouched; `piercingHits` is `[]` for every non-K-gun ship).
- Also added a `kgun` case to `previewTargeting` (per-band to-hit; classless = `no-class`) so the
  FCS allocator engages it in split fire and the pre-fire preview shows its reach — otherwise it fell
  into `default: out-of-range` and was silently un-allocatable.
- Sheet: the weapon-kind `<select>` iterates `WEAPON_KINDS` (ship-sheet.ts builds `kinds`, the
  template `{{#each weapon.kinds}}`), and the schema `choices` is `[...WEAPON_KINDS]`, so adding
  "kgun" makes it selectable AND a valid stored value with NO template/schema change. Verified.
- Surfaces: constants.ts (`WEAPON_KINDS` += "kgun"; no new constants — the KGUN_* set already
  existed), combat/fire.ts (`resolveKgun` + `piercingHits`), data/ship-state.ts (`applyDamageToShip`
  piercing fold), combat/apply-damage.ts (thread `piercingHits`), combat/fire-ship.ts +
  fire-ship-split.ts (pass `fire.piercingHits`), combat/targeting.ts (`kgun` preview case).
- +11 tests (fire.test.ts K-gun path, apply-damage.test.ts pierce integration, targeting.test.ts
  K-gun preview); 1127 passing (was 1116); typecheck clean.
- Commit: this commit.

## 2026-07-22 — Full Thrust: clickable design-count pips for FCS/PDS/screens (roadmap P1 #10 remainder)
- Finished the visual SSD: FCS, PDS, and screens now render a small row of clickable pips on the
  ship sheet, matching the hull + armour tracks already there. Design count = total pips, first
  `…Lost` of them crossed off (same "first N damaged" reading as the hull track, so all four tracks
  tell one story). The fallback number inputs stay put.
- ONE pure helper `prepareSystemPips(design, lost)` → `{ index, lost }[]` is reused for all three
  systems (mirrors `prepareArmourBoxes`). ONE click handler `onToggleSystemPip` reads `data-system`
  (fcs/pds/screens) + `data-number`, maps it through `SYSTEM_PIP_FIELDS` to the matching
  `system.fcsLost`/`pdsLost`/`screensLost` path, and fills/unfills exactly like `onToggleHullBox`
  (click intact → lost through N; click lost → lost = N-1). Unknown system or bad number → no-op.
- The write lands on the actor Document (`actor.update({ "system.…Lost": next })`), never a JS
  variable — persists + syncs like hull/armour. State stays on the design/`…Lost` NumberFields that
  already existed in ship/systems.ts; no new model surface.
- Surfaces: sheets/ship-sheet.ts (`prepareSystemPips`, `onToggleSystemPip`, `SYSTEM_PIP_FIELDS`,
  wired into `DEFAULT_OPTIONS.actions.toggleSystemPip` + `_prepareContext` as
  `fcsPips`/`pdsPips`/`screenPips`), templates/ship-sheet.hbs (three labelled `.ft-pip-track` rows),
  styles/full-thrust.css (`.ft-pip`/`.ft-pip-track`, reusing `.ft-hull-box`/`.ft-damaged` with a
  warm tint), lang/en.json (`systems.pipHint`).
- TDD: tests/ship-sheet-systems.test.ts written first, watched fail, then implemented. +8 tests;
  1149 passing (was 1141); typecheck clean.
- Sheet render + click persistence want live-verify in a real world (the fill/unfill and the actor
  write are Foundry-facing) — the pure helper + the handler's field mapping are what these unit
  tests lock down.
- Commit: this commit.

## 2026-07-22 — Full Thrust chat report cards routed through i18n (roadmap P1 #12)
- The `build*ReportHtml` builders in `packages/battleframe-full-thrust/src/ui/round-control.ts`
  emitted hardcoded English ("damage.", "destroyed.", "Threshold check (row ...)",
  "No strike", "Out of range.", "point defence", "Fire phase:", etc.). Routed them
  through a new local `tr(key, fallback, data?)` helper that prefers
  `game.i18n.format`/`localize` and falls back to `fallback` when `game.i18n` is
  absent. Added matching `battleframe-full-thrust.report.*` keys to `lang/en.json`
  whose English values equal the old literals, using Foundry `{placeholder}` style
  for interpolated counts/rows/names.
- KEY CONSTRAINT that shaped the design: `round-control.test.ts` never stubs
  `game.i18n`, so `tr` always returns `fallback` under unit test. The fallback is
  therefore passed as the **already-interpolated** current English template literal
  (e.g. `` `<strong>${report.totalDamage}</strong> damage.` ``) while the en.json value
  carries the `{n}` token for the live-Foundry `format` path. Values in two places,
  but it keeps the 34 round-control assertions (substrings "damage", "destroyed",
  "threshold", "out of range", "point defence", "no strike", "fighters", "2 FCS", ...)
  green with ZERO test changes. HTML structure (including `<strong>` wrappers and the
  `ft-destroyed`/`ft-unassigned` classes) is byte-identical; ship/target names still go
  through `escapeHtml` and are injected as placeholders, never localized.
- Surfaces: round-control.ts (`tr` + `REPORT` prefix + `GlobalScope.game.i18n` type;
  `reportBodyLines`, `buildFire/Fighter/Needle/Salvo/Dogfight/Targeting/SplitFire/Missile/
  Spinal ReportHtml`, `announceFirePhase`), lang/en.json (+33 `report.*` keys).
- 1141 tests pass (unchanged count); typecheck clean. Live-verification in a Foundry
  world still pending (i18n-present path exercised only in production).
- Commit: this commit.

## 2026-07-22 — GREATHELM wired to the engine's GM-less player-driven round advance
- The engine's `game.battleframe.advance` service (packages/battleframe/src/rounds/
  ready-advance.ts) lets a table with no GM advance the round: every active player
  marks "ready", and when all are ready a host client runs a countdown and calls a
  ruleset-registered callback. GREATHELM had no wiring to it. Added it following the
  Full Thrust template.
- GREATHELM's round-advance action is `onRoundControlActivated` in
  `packages/battleframe-greathelm/src/ui/round-control.ts` — it rolls initiative and
  opens the pool panel for the round, and `resolveRoundEnd` recursively starts the
  next round after the victory check. It was GM-gated (`isGM()` guard up top). GREATHELM
  DOES have a round to advance (it is a round-based game), so this is a real wiring, not
  a no-op. Extracted the ungated body into `advanceRoundCore(roundNumber)`;
  `onRoundControlActivated` keeps the GM gate for the manual "Run Round" tool and delegates
  to it. `resolveRoundEnd`'s recursive next-round now calls `advanceRoundCore` directly —
  in GM-less play the host resolving the round end is a trusted player, not the GM, so
  routing it back through the gated entry would stall the loop. Registered
  `() => void advanceRoundCore()` via `registerGreathelmAdvance()` in main.ts init.
- UI: added a player-visible "Ready to Advance" toggle scene tool (`greathelm-ready`),
  FIRST in the tools list, `toggle: true`, `visible: true`, `active: currentUserReady()`,
  `onChange: () => void readyAction()`, where `readyAction` calls
  `game.battleframe.advance.toggleReady()`. This forced the parent scene control's
  `visible` from `isGM()` to `true` (a control hidden from players hides the Ready tool
  with it); the GM-only run-round/new-battle tools keep their own `visible: isGM()` and
  `onRoundControlActivated` re-checks `isGM`, so a hidden button was never the access
  control anyway. Updated the one existing test that asserted the control was invisible to
  players to assert the new split (control visible; run-round tool still GM-gated), and
  added Ready-tool-registered + `registerGreathelmAdvance` tests. Added
  `battleframe-greathelm.controls.ready.*` lang keys.
- 1162 tests pass (was 1158; +3 scene-control assertions changed/added, +3 advance-registration,
  net +4); typecheck clean. Engine, Full Thrust, and the other modules untouched.
  Live-verification in a Foundry world still pending (the ready-flag sync + countdown path
  runs only against a real synced Document).
- Commit: this commit.

## 2026-07-22 — InCountry wired to the engine's player-driven, GM-less round advance
- InCountry's round advance is **"Run Round"** (`runRoundControl` in
  `packages/battleframe-incountry/src/ui/round-control.ts`): it rolls the d10
  initiative roll-off and opens a fresh activation round for the table to play unit
  by unit. That WAS the advance action, but it was GM-gated (`isGM()`) and its whole
  scene-control group was `visible: gm`, so players could neither advance nor even
  see the control. InCountry therefore *did* have a round to advance — it just had
  no GM-less path to it.
- Followed the Full Thrust template exactly: extracted the ungated body into
  `advanceRoundCore()` (initiative + open next round, still refusing while a round
  is in progress); `runRoundControl()` now just does the `isGM()` gate then calls it.
  Registered `advanceRoundCore` as the engine advance callback in `main.ts`
  (`game.battleframe.advance.registerAdvance(() => advanceRoundCore())`), so when all
  active non-GM players mark ready the engine's host-side countdown runs it and clears
  the ready flags — no GM click needed.
- Added a player-visible **Ready** toggle scene tool (`incountry-ready`, first in the
  tools array, `toggle: true`, `visible: true`, `onChange: readyAction`), whose
  `readyAction` calls `game.battleframe.advance.toggleReady()` and reports the
  ready/total count. KEY FIX: the InCountry control group was `visible: gm`, which
  would have hidden the Ready tool from the very players it is for — changed the group
  to `visible: true` (matching Full Thrust) while the Run/Activate tools keep their own
  `visible: gm`. `activeTool` now points at the always-visible Ready tool.
- Added `battleframe-incountry.controls.ready.{tool,status}` i18n keys (the i18n
  completeness test scans the `.tool` literal). Added an `addSceneControl` test
  asserting the Ready toggle is registered first, is player-visible, and that the GM
  tools stay hidden from a non-GM under both payload shapes.
- Engine (`packages/battleframe/src/rounds/ready-advance.ts`), Full Thrust, and the
  other modules were NOT touched. 1160 tests pass (1158 + 2 new); typecheck clean.
  Live-verification in a Foundry world still pending (the countdown/host wiring is
  engine glue exercised only in production).
- Commit: this commit.


## 2026-07-22 — Simple Skirmish wired to the engine's GM-less player-ready round advance
- Change: Registered SS with `game.battleframe.advance.registerAdvance(...)` and
  added a player-visible "Ready to Advance" scene-control toggle, mirroring the
  Full Thrust wiring so a GM-less table can advance the game itself.
- What "advance the round" means for SS: opening the NEXT round (roll initiative +
  seat combatants on the Combat document). Extracted the ungated `advanceRoundCore`
  out of `runRoundControl` — `runRoundControl` is now just the `isGM()` gate calling
  it — and registered that core as the engine's advance callback in `main.ts` init.
  The in-progress guard stays inside the core, so a player-driven advance opens a
  fresh round only once the current round's every unit has acted (a no-op warning
  otherwise); this matches `performAdvance`'s "start a fresh round for everyone".
- KEY VISIBILITY CHANGE: the SS scene control was `visible: gm`, which would have
  hidden the Ready toggle from players. Changed the control to `visible: true`
  (mirroring Full Thrust) while keeping the Run Round / Activate tools individually
  `visible: gm`. Updated the scene-control test accordingly: the control is visible
  to a non-GM, the `simple-skirmish-ready` toggle is `visible: true`/`toggle: true`,
  and Run/Activate stay `visible: false`; added a case asserting the toggle's
  `active` flag reflects `advance.isReady()`.
- Lang: added `controls.ready.tool`/`noApi`/`status` to `lang/en.json`; only
  `.tool` is a literal key (referenced by the tool title), the others build at
  runtime via `localize`/`format`, so the i18n-completeness test is satisfied.
- CAVEAT (shared with Full Thrust, not introduced here): the ready countdown runs
  `advanceCallback` on the deterministic host client, which in GM-less play is a
  player; `advanceRoundCore` creates/updates the Combat + Combatants, operations
  Foundry normally reserves for a GM. Live-verification in a real world (a player
  host actually advancing the round) is still pending.
- Surfaces: packages/battleframe-simple-skirmish/src/ui/round-control.ts
  (`advanceRoundCore`, `readyAction`, `currentUserReady`, `readyTool`, control
  visibility), src/main.ts (registerAdvance at init), lang/en.json (+3 keys),
  tests/round-control.test.ts (scene-control assertions).
- 1159 tests pass; typecheck clean.
- Commit: this commit.

## 2026-07-22 — GM-less advance delegates the privileged write to a GM via socketlib
- Context: the player-driven round advance runs on a *player* host, but advancing
  writes shared docs (Scene/Combat/units). Foundry forbids a plain Player from those
  writes, so the original design required the players to be **Assistant GMs**. The
  Foundry-ecosystem sweep (`internal-docs/foundry-ecosystem-research.md`) found the
  ecosystem-standard fix: **socketlib** (`executeAsGM`).
- Change: `performAdvance` now consults a new pure `advanceStrategy({socketlibReady,
  gmConnected})` → `"delegate" | "local"`. When socketlib is registered AND a GM is
  connected (`gmConnected(users)` — any active `isGM`), the host calls
  `socket.executeAsGM("performAdvance")` and a real GM runs the privileged half
  (`privilegedAdvance` = unsetFlag ready map + advanceCallback). Otherwise it runs
  locally (the pre-socketlib Assistant-GM path). Registration is in a
  `Hooks.once("socketlib.ready")` listener added at init; absent socketlib the hook
  never fires and `socket` stays undefined, so the local path is used — no behaviour
  change for existing worlds.
- Why the two-witness/native rules are satisfied: socketlib is the standard library
  for GM-delegated actions (not a reinvented `game.socket` protocol), declared as a
  **soft** `relationships.recommends` in system.json (offered, never required —
  graceful degradation). This EXTENDS GM-less play from "Assistant-GM players" to
  "plain players + one connected GM"; the truly GM-absent Assistant-GM path is
  untouched.
- Surfaces: src/rounds/ready-advance.ts (`gmConnected`, `advanceStrategy`,
  `privilegedAdvance`, `registerAdvanceSocket`, socket routing), system.json
  (recommends socketlib), docs/gm-less-play.md (both permission paths).
- Tests: +6 (gmConnected ×3, advanceStrategy ×3); 1180 pass, typecheck clean. The
  socketlib delegate path itself is Foundry-facing and **not yet live-verified**
  (needs a 2-player + idle-GM world with socketlib installed).
- Commit: this commit.

## 2026-07-22 — GREATHELM QoL audit DO-NOWs: engine measure dedup + wiring the dormant attack-target prompt
- Context: the GREATHELM QoL/engine-alignment audit (internal-docs/greathelm-qol-audit.md)
  named three DO-NOW findings. All three landed here.
- #1 (measure.pxPerUnit): `combat/clash.ts` `pxPerSceneUnit` was a verbatim copy
  of the engine's ratio (its own comment admitted it). The value is consumed
  *inside* the pure, unit-tested `baseContactToleranceUnits(token)` -- not at a
  single runtime glue site -- so option (a) "lift to the caller" did not fit; took
  option (b): delegate to `game.battleframe.measure.pxPerUnit(token.scene)` when
  the engine surface is present, keep the local formula as the fallback ONLY for
  the no-engine (test) path and the scene-less token (which must still resolve to
  `DEFAULT_PX_PER_SCENE_UNIT = 100`, a value the engine's degenerate-grid default
  of 1 would break -- but a real canvas token never has a degenerate grid, so the
  numbers agree everywhere they can actually meet).
- #2 (measure.fromPlaceable): `ui/round-control.ts` `gatherKnightsFromCanvas`
  hand-built the `MeasurableToken` literal per placeable. Replaced with
  `game.battleframe.measure.fromPlaceable(placeable)` when the engine is present,
  same hand-built shape as fallback for the no-engine path. The engine adapter
  reads the same centre/scene/base fields (and additionally carries `document`),
  so base-to-base measures identically.
- #3 (dormant `promptAttackTarget` -- the latent bug): traced the real defender
  selection to `round/session.ts` `spendDie` (NOT the caller-less
  `round-control.ts findDefenderInBaseContact`): it took `choices.defenderKnightId`
  or silently fell to the nearest touching enemy, so the registered, defaulted-ON
  `SETTING_PROMPT_ATTACK_TARGET` did nothing. Added `enemiesInBaseContact`
  (all touching enemies, nearest-first -- `candidates[0]` equals the old nearest,
  so behaviour is unchanged when nothing is injected) and an injectable
  `chooseAttackTarget` seam on `CreateRoundSessionOptions` (default: nearest, no
  prompt -- keeps the pure session UI-free). The glue layer (`beginRoundFromControl`
  / `resumeRoundFromControl`, both reached from `advanceRoundCore`) injects
  `promptAttackTarget` bound to the world `settings`, so 2+ touching enemies now
  raise the picker. An explicit declared defender still bypasses the prompt.
- Files: src/combat/clash.ts, src/ui/round-control.ts, src/round/session.ts;
  tests/base-contact.test.ts (+2), tests/session.test.ts (+3).
- 1172 tests pass (was 1167); typecheck clean. Foundry-facing wiring (#3) still
  needs live-verify in a world.
- Commit: this commit.

## 2026-07-22 — Neutral chat-card builder (chat.card/postCard); do NOT build a templating engine
- Question raised: build our own chat-card module with a templating system? The
  Foundry-ecosystem sweep (internal-docs/foundry-ecosystem-research.md, finding #5)
  answered it: Foundry already ships the templating system (Handlebars .hbs +
  `foundry.applications.handlebars.renderTemplate`). Building our own would be the
  exact reinvention CLAUDE.md forbids.
- What WAS missing: a shared card CONTAINER. Every FT report hand-concatenated
  `<div class="ft-fire-report"><h3>…`; the other three rulesets post no cards at
  all. `ui/chat.ts` had deferred `card()` for a second witness — the "chat cards in
  all games" directive is that witness.
- Change: `chat.card({title, lines, cssClass})` returns the neutral
  `<div class="battleframe-card [cssClass]">` container (optional h3 + body joined
  VERBATIM). Deliberately NOT a sanitizer — a card mixes safe markup (`<strong>`,
  `&rarr;`) with dynamic text, so the CALLER escapes dynamic parts, same contract as
  the hand-built wrappers. `postCard` is thin glue (render + ChatMessage.create,
  default speaker via getSpeaker, conditional rolls). Base `.battleframe-card` CSS
  lives in the engine stylesheet so one look themes all rulesets.
- FT adoption (witness 1): `wrapReport` delegates to `api()?.chat?.card()` when the
  runtime engine is present, inlining the identical markup as the no-engine unit
  path — the same live/fallback split `tr()` uses. `ft-fire-report` rides along as a
  second class so FT's accent CSS still matches. FT report tests use `toContain`, so
  the container change did not touch a single assertion.
- Pending: GREATHELM / InCountry / Simple Skirmish have no cards yet — the "all
  games" rollout adds outcome cards there via this primitive (witnesses 2-4). Those
  are Foundry-facing and need live-verify.
- Surfaces: packages/battleframe/src/ui/chat.ts (card, postCard), styles/battleframe.css
  (.battleframe-card), packages/battleframe-full-thrust/src/ui/round-control.ts
  (RoundControlApi.chat, wrapReport). +8 tests; 1193 pass.
- Commit: this commit.

## 2026-07-22 — InCountry adopts the engine chat-card primitive (witness 2)
- Context: the "chat cards in all games" rollout (see the entry above) — InCountry
  resolved attacks but only surfaced the outcome as a transient `ui.notifications`
  toast (GM-only, lost on reload, never synced). CLAUDE.md mandates a persistent
  ChatMessage card as the result surface.
- Change: added a persistent attack-outcome card, posted whenever an attack
  resolves in `resolveActivation` — attacker → target heading, hits/damage, the
  armor check, model-down / models-left, the suppression check + result, and a
  wipe notice. The toast stays (transient convenience); the card is added ALONGSIDE.
- Purity + seam: content is built by a pure, unit-tested `buildAttackReportHtml`
  (and its shared `attackReportParts`) that renders the engine card's markup —
  delegating to `game.battleframe.chat.card()` when the runtime engine is present,
  inlining the identical `battleframe-card incountry-attack-report` fallback markup
  for the no-Foundry unit path (the same live/fallback split FT's `wrapReport` and
  `tr()` use). The pure flow gets an injected `postCard?` seam (default no-op,
  mirroring the existing `notify?` seam); the Foundry glue (`activateSelectedControl`)
  wires the real `game.battleframe.chat.postCard`. Unit names are HTML-escaped via a
  local `escapeHtml` (InCountry had none; mirrors the engine's + FT's) before landing
  in markup — a unit-named `<script>` must not inject.
- CSS: only `.incountry-attack-report` ACCENTS (amber left border, stencil title,
  amber suppression / danger wipe lines) — the base card frame comes from the engine
  stylesheet.
- Surfaces: packages/battleframe-incountry/src/ui/round-control.ts (buildAttackReportHtml,
  attackReportParts, escapeHtml, wrapCard, ResolveActivationParams.postCard seam,
  glue wiring), styles/incountry.css (.incountry-attack-report accents),
  tests/attack-report.test.ts (+7), tests/round-control.test.ts (+2 seam). 1202 pass.
- Live-verify: DEFERRED — the parent batch-deploys; the card render + escaping in a
  live world is the outstanding check.
- Commit: this commit.

## 2026-07-22 — Simple Skirmish adopts persistent chat cards (chat-card witness 2)
- Context: SS resolved combat in `resolveActivation` but only surfaced the result as
  transient GM-only `ui.notifications` toasts (via the `notify` seam) — a refused
  attack, the per-attack hit/casualty line, and the round-over line. None survived a
  reload or reached the players. This is the "all games get outcome cards" rollout of
  the engine's `chat` primitive (see the prior entry), the second witness after FT.
- Change: two PURE, unit-tested card builders in `src/ui/round-control.ts` —
  `buildCombatReportHtml(result, names)` (`ss-combat-report`: attacker/type/defender
  title, hits + models removed, a kill line when destroyed) and
  `buildVictoryHtml(victory)` (`ss-victory`: winner / draw / play-on). Both go
  through a local `renderCard()` that delegates to `game.battleframe.chat.card()`
  when the engine is present and inlines the identical `battleframe-card` markup for
  the no-engine unit path — the same live/fallback split `tr()`/FT's `wrapReport`
  use. Dynamic unit names are escaped with a local `escapeHtml` (SS had none; the
  engine's copy is unreachable in pure tests, so the builders own a local one, as FT
  does).
- Seam: `resolveActivation` gained a `postCard?` seam (default no-op) alongside
  `notify`, kept the toasts, and now posts the combat card after an applied attack
  and the round-over card when the round ends. The real
  `game.battleframe.chat.postCard` is wired ONLY in the `activateSelectedControl`
  glue, next to `notify` — passing the SPEC (title/lines/cssClass) so postCard wraps
  exactly once (no double card). The pure resolution stays UI-free and canvas-free.
- CSS: `styles/simple-skirmish.css` adds accents only — a gules edge on the combat
  report, a gilt edge on the round-over card, the kill line inked in gules. The base
  `.battleframe-card` box comes from the engine stylesheet.
- Live-verify: DEFERRED — this is Foundry-facing (real card render + speaker +
  persistence in a live chat log), batched into the parent's deploy.
- Surfaces: packages/battleframe-simple-skirmish/src/ui/round-control.ts
  (escapeHtml, buildCombatReportHtml, buildVictoryHtml, renderCard, postCard seam +
  glue), styles/simple-skirmish.css (.ss-combat-report/.ss-victory),
  tests/chat-cards.test.ts. +11 tests; 1193 → 1204 pass; typecheck green.
- Commit: this commit.

## 2026-07-22 — GREATHELM adopts the chat-card primitive (clash-outcome card, witness 2)
- Directive: chat cards across ALL rulesets. GREATHELM (witness 2) surfaced clash
  resolution only through transient `notify` toasts — GM-only, gone on refresh, the
  exact anti-pattern CLAUDE.md's dice/results rule names ("not GM-only toasts").
- Problem the seam solves: a clash resolves INSIDE the pure `round/session.ts`
  `spendDie` (via `resolveDieAction`), and its `ClashResult` was dropped on the
  floor — the round-control glue (where `notify` is wired) never saw it, so there
  was nothing to render. Re-deriving the roll-off in the glue is impossible (dice
  already rolled).
- Change: added an `onClashResolved(outcome)` seam to `CreateRoundSessionOptions`
  (default no-op, so every headless caller + unit test is byte-for-byte unchanged —
  it parallels the existing `chooseAttackTarget`/`notify` seams). `spendDie` now
  captures the `ClashResult` and, for a real clash, hands out a `ClashResolvedOutcome`
  (attacker/defender ids+names, roll-off, damage, defender's post-clash wound total,
  removed?). The total + removal are read AFTER `resolveDieAction` applied the damage.
- Glue: `buildClashReportHtml(outcome)` is a PURE, unit-tested builder — same
  live/fallback split as Full Thrust's `wrapReport` (delegates to `chat.card` when
  the engine is present, inlines identical `battleframe-card gh-clash-report` markup
  for the no-engine test path). `clashReportParts` is shared by the builder and the
  live poster so they cannot drift. `beginRoundFromControl`/`resumeRoundFromControl`
  gained a `postClashCard` option; `advanceRoundCore` wires it to the real
  `game.battleframe.chat.postCard` (both fresh + resumed branches).
- Escaping: knight names go through a LOCAL `escapeHtml` (copy of the engine's), the
  same reason FT keeps its own — the pure builder must escape with no runtime engine.
- CSS: `.gh-clash-report` is accent-only (heraldic gules edge + reddened, bolded
  "removed" line); the base card look stays in the engine stylesheet. Colour is not
  the only signal (the removal line is bold and says "removed").
- Live-verification DEFERRED — parent batch-deploys; this is Foundry-facing (postCard
  + a live round) and must be checked in a world before it counts as done.
- Surfaces: packages/battleframe-greathelm/src/round/session.ts (ClashResolvedOutcome,
  onClashResolved seam), src/ui/round-control.ts (buildClashReportHtml, clashReportParts,
  escapeHtml, postClashCardToChat, postClashCard wiring), styles/greathelm.css
  (.gh-clash-report). +5 tests; 1198 pass. Engine (packages/battleframe/src) untouched.
- Commit: this commit.
