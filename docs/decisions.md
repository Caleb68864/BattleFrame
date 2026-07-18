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
