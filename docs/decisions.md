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
  container via Portainer's Docker archive API, created a world, enabled the module, and
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
