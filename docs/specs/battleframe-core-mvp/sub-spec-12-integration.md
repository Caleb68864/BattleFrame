---
type: phase-spec
master_spec: "../2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 12
title: "Integration — wire it up and prove neutrality"
date: 2026-07-16
depends_on: ["SS-09", "SS-11"]
---

# Sub-Spec 12: Integration — Wire It Up and Prove Neutrality

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

Wire every core service into the system entry point, prove the whole flow works end to end,
and **prove the neutrality claim mechanically rather than by assertion**.

This is the last sub-spec, and it is the one that decides whether the project succeeded. Not
because it writes the most code — it writes very little — but because it is where the central
claim gets tested. Everything before this built two packages. This one asks whether they are
actually independent, or whether they only look that way.

### Three jobs

**1. Wire the services.** All core services — base model, measurement, registry, combat
shell, dice, generic actor, settings, wizard — are imported and initialised from
`packages/battleframe/src/battleframe.ts` at `init`, in an order that lets rulesets register
afterwards.

**2. Construct the `game.battleframe` namespace.** This file **constructs the namespace
object that SS-04, SS-05 and SS-07 all attach to.** Those sub-specs *define* services and
*export* them; this sub-spec *assembles* them into `game.battleframe`. Their unit tests
import the modules directly and do not depend on the global, which is why the apparent
inversion is not one. There is **no official API mechanism for Foundry systems** —
`game.system.api` is pure convention — so this namespace is ours to define.

**3. Prove neutrality.** `npm test -- neutrality` makes requirement 9 executable. See below.

### Note on `battleframe.ts`

SS-02 creates it as a bare skeleton that only logs readiness. **This sub-spec rewrites it in
full.** Both sub-specs legitimately declare the file — **SS-02 owns its existence, SS-12 owns
its content.** This is not a conflict and not an accident. Do not treat the skeleton as
something to preserve; replace it.

### The neutrality test is the point of the project

**`npm test -- neutrality` is not a lint rule. It is the thesis.**

From the master spec's Outcome: "Core contains **zero** GREATHELM-specific code, and the core
test suite imports **no** ruleset package." From its Intent, the trade-off hierarchy, item 1:
"**Core neutrality over convenience.** If core needs to know what a round is, the design has
failed. A ruleset writing more code is the correct outcome."

The purpose of Battleframe is to measure a table correctly **once, rather than once per
game**. Every game researched needs base-to-base distance and circular bases; Foundry
provides neither; no precedent system has solved it. *That gap is the product. The rules are
not.* A core that has learned what a knight is has stopped being that product and become one
more game system — of which there are already many, and which nobody needs another of.

So this test does not verify a coding standard. It verifies that the thing was built at all.
Write it as the load-bearing test it is: it must be difficult to defeat by accident, and
impossible to defeat by accident *quietly*. If it ever fails, the correct response is never
to relax the test.

### The `[HUMAN REVIEW]` criterion carries equal weight

**"Did core need any change to host GREATHELM?"**

This question is not paperwork, and it is not satisfied by the neutrality test passing. The
neutrality test proves core does not *import* a ruleset. It cannot prove core did not
*learn* something game-shaped — a hook that exists because GREATHELM needed it, a flag whose
name only makes sense if you know about dice pools, a signature widened for one caller. Those
changes leave no import to grep for. They are exactly the failure the design is trying to
avoid, and they are invisible to every mechanical check in this document.

The master spec makes this an escalation trigger in three separate places:

- Intent, decision boundaries: "A ruleset requires a core change → **stop and record it.**
  That is the neutrality claim failing."
- Escalation triggers: "Core needs game-specific knowledge to make GREATHELM work →
  **stop.** The design is breaking."
- Verification step 12: "**Answer honestly: did core need any change to host GREATHELM?** If
  yes, the design has failed and that belongs in `docs/plans/`, not in a quiet commit."

**If the answer is yes, that is a design failure to be written up in `docs/plans/`, not
quietly absorbed.** A design failure recorded is a project that learned something. A design
failure absorbed into a commit message is a project that will discover it again at Phase 4,
with an OPR ruleset, when it is expensive.

The honest answer may well be yes. GREATHELM is the *easy* case — the real neutrality proof
is Phase 4.5's Alpha Strike, which is phase-based with no per-unit activation. If core needed
changes for the easy case, that is important information and it is worth more than a clean
report. **Report it.**

### Greenfield

**There is no existing codebase.** Every file here is new. `battleframe.ts` exists only as
SS-02's skeleton from earlier in this same build. There are no in-repo patterns to detect and
none to imitate — the references in **Patterns to Follow** are research notes in `vault/`,
not source files.

## Interface Contracts

### Provides

- `game.battleframe` — the namespace object, assembled here and bound at `init`. Carries
  `measure` (SS-04), `dice` (SS-07), `api` (SS-05), `base` (SS-03), `settings` (SS-09), and
  the system version.
- `globalThis.battleframe` — the same object, built at **module top level** so it exists
  before *any* package's `init` hook runs, regardless of load order.
- `scripts/deploy-local.mjs` — copies both packages into a Foundry data directory.
- `docs/DEPLOY.md` — how to deploy and verify by hand.
- The neutrality test — the executable form of requirement 9.

### Requires

- **From SS-03:** the base model — `getBase(token)`, `radiusPx(token, scene)`.
- **From SS-04:** `measure.between(tokenA, tokenB)` → `{distance, units, mode:
  "base-to-base"}`.
- **From SS-05:** the registry — `registerRuleset`, `activateRuleset`, `getActiveRuleset` —
  and the hooks `battleframe.ready`, `battleframe.rulesetRegistered`,
  `battleframe.rulesetActivated`, named exactly so.
- **From SS-06:** the combat shell and its tracker, registered via `CONFIG.ui.combat`.
- **From SS-07:** `dice.roll(formula, data?)` → a standard Foundry `Roll`.
- **From SS-08:** `GenericActorData` (registered via `CONFIG.Actor.dataModels.generic`), the
  Actor document class, the generic sheet, and the orphan check.
- **From SS-09:** the settings (`activeRulesetId`, `setupCompleted`, `defaultGridUnit`) and
  the setup wizard.
- **From SS-11 (and SS-10):** the complete `battleframe-greathelm` module — as a **test
  subject only**. Core imports none of it, ever. That is the whole point.

### Shared State

- **`game.battleframe` is the seam the entire design rests on.** Rulesets bind to it and
  nothing else. It is built at module top level and merged onto `game.system` at `init`:

  ```js
  globalThis.battleframe = { base, measure, api, dice, settings, version };
  Hooks.once("init", () => {
    globalThis.battleframe = game.battleframe =
      Object.assign(game.system, globalThis.battleframe);
    // ... service initialisation ...
  });
  ```

  **The load-order trick is the point** — confirmed against dnd5e's shipping v14 source in
  `vault/foundry-systems/settings-and-api-namespace-conventions.md`. Because the namespace is
  assigned at top-level evaluation rather than in a hook, a ruleset module calling
  `game.battleframe.api.registerRuleset(...)` from **its own `init`** works no matter which
  package Foundry loads first. This removes the load-order uncertainty that would otherwise
  make SS-10's registration a coin flip.
- `CONFIG.Actor.dataModels` — core writes `generic` here; the ruleset writes
  `battleframe-greathelm.knight`. Neither knows about the other's entry.
- `CONFIG.ui.combat` — the tracker (SS-06).
- `combat.flags.battleframe.order` — read by core, written by rulesets. The turn-order seam.

## Implementation Steps

### Step 1: Write failing test — the neutrality test

**Write this one first. It is the sub-spec's reason to exist, and writing it first means it
cannot be shaped to fit whatever `battleframe.ts` turns out to be.**

- **File:** `packages/battleframe/tests/integration/neutrality.test.ts`
- **Test name:** `no file under packages/battleframe/src imports from a ruleset package` and
  `the core test suite imports no ruleset package`
- **Asserts:**
  - Walk **every** file under `packages/battleframe/src/` recursively — `.ts`, `.js`,
    `.mjs`, `.hbs`. Not a sampled subset, not a hard-coded list.
  - Extract **every** module specifier: static `import`, `import type`, `export … from`,
    dynamic `import()`, and `require()`. A type-only import is still an import — it couples
    core to a ruleset's shape, which is exactly the coupling requirement 9 forbids.
  - Assert **no** specifier resolves into `packages/battleframe-greathelm/`, whether by
    package name (`battleframe-greathelm`), by workspace name, or by a **relative path that
    escapes the package** (`../../battleframe-greathelm/...`). A `..` escape is the likeliest
    real-world violation in a monorepo and the easiest to miss in review.
  - Assert the same for every file under `packages/battleframe/tests/` — "the core test suite
    imports **no** ruleset package."
  - Assert `packages/battleframe/package.json` lists no ruleset in `dependencies`,
    `devDependencies`, or `peerDependencies`.
  - **Assert the walker found files.** A neutrality test that silently walks zero files
    passes forever and proves nothing. Assert a non-zero, plausible file count. This is the
    single most important line in the test: it is the difference between "core is neutral"
    and "the test is broken", and those two states look identical from the outside.
  - On failure, name **the file, the line, and the offending specifier**. This test failing
    means the design is breaking; whoever reads that output needs to find the import in
    seconds, not go looking.
- **Run:** `npm test -- neutrality`
- **Expected:** FAILS — the test file's imports do not resolve yet.

### Step 2: Make the neutrality test pass against the current tree

- **Run:** `npm test -- neutrality`
- **Expected:** PASSES. At this point core genuinely imports no ruleset, so it should pass
  immediately and for real.

  **Verify the test can fail.** Temporarily add
  `import { GREATHELM } from "../../../battleframe-greathelm/src/constants";` to any core
  source file, re-run, and confirm the test **fails** and names that file, line, and
  specifier. **Then revert the import.** An always-green assertion is not a test, and this is
  the one test in the project that must never be a rubber stamp. Do not skip this step
  because it feels ceremonial — the whole design rides on this assertion being real.

### Step 3: Write failing test — the namespace is assembled

- **File:** `packages/battleframe/tests/integration/full-round.test.ts`
- **Test name:** `the battleframe namespace exposes every core service`
- **Asserts:** The namespace object built at module top level carries `base`, `measure`,
  `api`, `dice`, `settings`, and `version`. `measure.between` is a function; `dice.roll` is a
  function; `api.registerRuleset` is a function. Crucially: **the namespace exists before any
  `init` hook fires** — it is built at top-level evaluation, not inside a hook — so a ruleset
  can call `api.registerRuleset` from its own `init` regardless of package load order.
- **Run:** `npm test -- full-round`
- **Expected:** FAILS.

### Step 4: Rewrite `battleframe.ts` in full

- **File:** `packages/battleframe/src/battleframe.ts`
- **Action:** modify — **rewrite in full.** SS-02 created this as a bare skeleton that only
  logs readiness. Replace it. SS-02 owns the file's existence; this sub-spec owns its
  content.
- **Pattern:** `vault/foundry-systems/settings-and-api-namespace-conventions.md`
  (`confirmed`) — dnd5e's shipping v14 pattern, verbatim from `dnd5e.mjs`:
  namespace at module top level, then `Object.assign(game.system, ...)` at `init`.
- **Changes:**

  **At module top level** (before any hook): construct `globalThis.battleframe` from the
  imported services. This is the load-order fix and it must not move into a hook.

  **At `init`**, in this order:
  1. Bind the namespace: `globalThis.battleframe = game.battleframe =
     Object.assign(game.system, globalThis.battleframe)`.
  2. Register settings (SS-09) — everything downstream may read them.
  3. `CONFIG.Actor.dataModels.generic = GenericActorData` (SS-08).
  4. `CONFIG.Actor.documentClass` and the generic sheet, via
     `foundry.applications.apps.DocumentSheetConfig` (SS-08).
  5. `CONFIG.Combat.documentClass` and `CONFIG.ui.combat` (SS-06).
  6. Initialise the base model (SS-03), measurement (SS-04), and dice (SS-07) services.
  7. Initialise the registry (SS-05).

  **Rulesets register in their own `init`, after this.** The namespace was assigned at
  top-level evaluation, so their `init` finds it regardless of load order.

  **At `ready`:**
  - Run the orphan check (SS-08) — warn loudly, name the module and the count, offer
    conversion, **never auto-convert**.
  - Activate the ruleset from the `activeRulesetId` setting (SS-05/SS-09).
  - Open the wizard if setup is incomplete — **GM only, never a player** (SS-09).
  - Fire the `battleframe.ready` hook.
  - Check for a ruleset upgraded to an incompatible version after the world exists: warn,
    name the ruleset and **both** versions, and **do not silently deactivate**. A world
    mid-campaign must not lose its ruleset without the GM being told.

  **Contain ruleset failures.** If a ruleset throws during registration or in its own loop:
  contain it, surface the **ruleset id**, and keep the world usable. Core cannot fix a
  ruleset's bug and must not try.

  **This file must not learn anything game-specific.** No hook that exists because GREATHELM
  wanted it. No flag named after a dice pool. If wiring GREATHELM seems to require one,
  **stop** — that is the master spec's escalation trigger, not a detail to work around.

### Step 5: Verify tests pass

- **Run:** `npm test -- full-round && npm test -- neutrality`
- **Expected:** Both PASS. Neutrality must still pass after the rewrite — **especially**
  after the rewrite. This is the moment the whole build has been heading toward.

### Step 6: Write failing test — the full round, end to end

- **File:** `packages/battleframe/tests/integration/full-round.test.ts`
- **Test name:** `a full GREATHELM round resolves end to end`
- **Asserts:** The whole flow, in order: a world loads → GREATHELM registers → the wizard
  activates it → two forces of six knights deploy → a dice pool is rolled → initiative
  resolves on 6s → actions resolve **6→1** → a Sprint moves **5"** base-to-base → a clash
  test posts to chat → a wound persists across reload.

  **The neutrality constraint applies to this test too.** It lives in `packages/battleframe/tests/`
  and therefore **must not import the ruleset** — the neutrality test asserts exactly that,
  and it walks `tests/` as well as `src/`. Drive the flow through the **public seams only**:
  `game.battleframe.api.registerRuleset` with a registration def, and the hooks. Do not
  `import` anything from `packages/battleframe-greathelm/`.

  <!-- Raised during phase-spec refinement, flagged rather than resolved. The two
       [INTEGRATION] criteria are in tension with the [MECHANICAL] neutrality criterion as
       written: a full-round test that literally exercises GREATHELM from inside
       packages/battleframe/tests/ would import the ruleset and trip the very test that
       makes requirement 9 executable. The resolution here — drive the flow through the
       public API seams with a registration def, never an import — satisfies both, and is
       arguably a better test: it proves the seams are sufficient for a real ruleset, which
       is the actual claim. But note that this makes the in-repo full-round test a test of
       the *seams*, and the genuine end-to-end round remains the live-Foundry verification
       (master spec Verification steps 3-9). Do not let the unit test's green tick be
       mistaken for the live round having been played. If the reviewer intended a true
       cross-package integration test, it belongs in a third location that is not
       packages/battleframe/tests/ — escalate rather than weakening neutrality. -->
- **Run:** `npm test -- full-round`
- **Expected:** FAILS.

### Step 7: Implement the full-round test harness

- **File:** `packages/battleframe/tests/integration/full-round.test.ts`
- **Action:** modify
- **Pattern:** No existing pattern — greenfield.
- **Changes:** Stub the Foundry globals the flow needs. Register a **synthetic** ruleset def
  through the public API — one that exercises the seams the way GREATHELM does, without
  importing it. Assert the seams hold: registration returns `{ok: true}`, activation fires
  `battleframe.rulesetActivated`, `measure.between` returns `mode: "base-to-base"`,
  `dice.roll` returns a standard `Roll`, `combat.flags.battleframe.order` is read but never
  written by core.

  **Zero third-party modules.** That is the default test environment and a requirement:
  Battleframe works with **zero** optional third-party modules installed. Dice So Nice is
  optional, always.

### Step 8: Verify test passes

- **Run:** `npm test -- full-round`
- **Expected:** PASSES.

### Step 9: Implement the deploy script

- **File:** `scripts/deploy-local.mjs`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. The master spec's committed deployment
  model: "deployed by copying each into Foundry's `Data/systems/` and `Data/modules/`."
- **Changes:** `node scripts/deploy-local.mjs --dest <foundry-data-dir>` copies
  `packages/battleframe/` → `<dest>/Data/systems/battleframe/` and
  `packages/battleframe-greathelm/` → `<dest>/Data/modules/battleframe-greathelm/`, and
  exits **0**.

  Copy the built output plus the manifest, `lang/`, `templates/`, and `styles/`. Do not copy
  `node_modules/`, `src/`, or `tests/`. Build first, or fail loudly if `dist/` is missing —
  silently deploying a stale build is a wrong-number-class failure: everything looks fine and
  the behaviour is from last week.

  Exit non-zero with a clear message if `--dest` is absent or is not a Foundry data
  directory. **Never** write outside `<dest>/Data/`.

### Step 10: Write the deploy documentation

- **File:** `docs/DEPLOY.md`
- **Action:** create
- **Changes:** The deploy command, where each package lands, and the **live verification
  sequence** from the master spec's Verification section — the parts a worker cannot assert:
  create a v14 world on Battleframe; the wizard opens for the GM; enable
  `battleframe-greathelm` and select it as primary; deploy two forces of six; roll the pool
  and confirm models + 1, most 6s takes initiative, actions resolve 6→1; Sprint and confirm
  **5"** *and that the ruler agrees with the engine*; **physically verify one measurement
  against a fixture — measurement has no natural oracle and this step is not optional**; run
  a clash and confirm chat + wound persistence across reload; disable the GREATHELM module
  and confirm the world still loads with the orphan warning naming the module.

  End with the question, stated plainly: **did core need any change to host GREATHELM?**

### Step 11: Verify the full sub-spec

- **Run:** `npm install && npm run build && npm test`
- **Expected:** All exit 0. Then run every command in **Checks** and confirm each exits 0.

### Step 12: Answer the human-review question

- **File:** `docs/plans/2026-07-16-core-changes-required-by-greathelm.md` — **only if the
  answer is yes.**
- **Action:** create, conditionally
- **Changes:** **Answer honestly: did core need any change to host GREATHELM?**

  Review the actual diff to `packages/battleframe/` across SS-10, SS-11 and SS-12. For each
  change, ask: *would this change exist if GREATHELM did not?* Look specifically for what the
  neutrality test cannot see — a hook added because a ruleset needed it, a flag whose name
  presumes a dice pool, a signature widened for one caller, a type loosened to fit one shape.

  **If the answer is yes for anything:** write it up in `docs/plans/` as a design failure —
  what core learned, why, and what it means for Phase 4 and Phase 4.5. Name it. Do not absorb
  it into a commit message.

  **If the answer is no:** say so explicitly in the run report, and say what was checked. "No
  findings" and "did not look" produce identical output otherwise, and one of them is a lie.

  This is `[HUMAN REVIEW]`. A worker may prepare the evidence — the diff, the analysis, the
  candidate findings — but **a human decides.** Do not self-certify this one.

### Step 13: Commit

- **Stage:** `git add packages/battleframe/src/battleframe.ts packages/battleframe/tests/integration/ scripts/deploy-local.mjs docs/DEPLOY.md`
- **Message:** `feat: integration — wire core services and prove neutrality`

## Acceptance Criteria

Preserved verbatim from the master spec.

- `[INTEGRATION]` All core services (base model, measurement, registry, combat shell,
  dice, generic actor, settings, wizard) are imported and initialised from
  `packages/battleframe/src/battleframe.ts` at `init`, in an order that lets rulesets
  register afterwards.
- `[INTEGRATION]` **Full round, end to end:** a world loads → GREATHELM registers → the
  wizard activates it → two forces of six knights deploy → a dice pool is rolled →
  initiative resolves on 6s → actions resolve 6→1 → a Sprint moves 5" base-to-base → a
  clash test posts to chat → a wound persists across reload.
- `[MECHANICAL]` **The neutrality test:** `npm test -- neutrality` asserts that no file
  under `packages/battleframe/src/` imports from `packages/battleframe-greathelm/`, and
  that the core test suite imports no ruleset package. This is requirement 9, made
  executable.
- `[MECHANICAL]` `grep -rniE "greathelm|knight|sprint|encircle|clash" packages/battleframe/src/`
  returns nothing.
- `[BEHAVIORAL]` Disabling `battleframe-greathelm` leaves the world loadable, with the
  orphan warning from SS-08 firing rather than a crash.
- `[BEHAVIORAL]` With **no** ruleset installed at all, the system still loads, the wizard
  explains itself, and the ruler measures.
- `[MECHANICAL]` `node scripts/deploy-local.mjs --dest <foundry-data-dir>` copies both
  packages into `Data/systems/` and `Data/modules/` and exits 0.
- `[HUMAN REVIEW]` **Did core need any change to host GREATHELM?** If yes, that is a design
  failure — record it in `docs/plans/` rather than quietly absorbing it.

<!-- Preserved verbatim per instruction; hazards noted rather than corrected.

     (1) `grep -rniE "greathelm|knight|sprint|encircle|clash" packages/battleframe/src/` is
     case-insensitive and substring-matching, and two of its terms are ordinary English that
     could legitimately appear in neutral core prose: "clash" (as in "ids clash" — and note
     the master spec's own Edge Cases section uses "ruleset conflict" for precisely this
     concept, so the collision is live) and "knight" (substring of nothing common, but
     "sprint" is a substring of nothing either — the real risk is "clash" in a comment about
     conflicting ruleset ids). If this fires on a legitimately neutral comment, the correct
     fix is to REWORD THE COMMENT, not to weaken the grep. The criterion is a blunt
     instrument on purpose: core must not contain these words even incidentally, because the
     cost of a false positive is a reworded comment and the cost of a false negative is the
     entire design claim.

     (2) The `--dest <foundry-data-dir>` criterion cannot run in CI without a Foundry data
     directory. The Checks command below runs it against a temporary directory, which
     verifies the script's mechanics (copies both packages, exits 0) but not a real Foundry
     install. The live deploy remains a human step — see docs/DEPLOY.md. -->

## Completeness Checklist

### The `game.battleframe` namespace — every member

Constructed in `packages/battleframe/src/battleframe.ts` at module top level, bound at
`init`. **This is the entire public surface rulesets bind to.** Every member must exist —
a missing one is a ruleset that cannot be written.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `base` | `{getBase(token), radiusPx(token, scene)}` | required | SS-03 → SS-04. Bases as circles/ovals in **millimetres** |
| `measure` | `{between(tokenA, tokenB)}` | required | SS-04 → SS-11 (Sprint, base contact). **The reason the project exists** |
| `api` | `{registerRuleset(def), activateRuleset(id), getActiveRuleset()}` | required | SS-05 → SS-10 (registration), SS-09 (activation) |
| `dice` | `{roll(formula, data?)}` | required | SS-07 → SS-11 (clash, armour table, courage). Returns a **standard Foundry `Roll`**, not a wrapper |
| `settings` | `{activeRulesetId, setupCompleted, defaultGridUnit}` accessors | required | SS-09 → the wizard |
| `version` | `string` | required | SS-05 compatibility checks against `battleframeCompatibility.minimum` |

**Absent by design — adding any of these is the design failing:**

| Absent | Why |
|-------|------|
| `nextTurn` / `advanceActivation` | Core provides **no** turn model. Five researched games gave five incompatible turn structures; no shared primitive exists. A ruleset writes its own loop |
| any round semantics | "If core needs to know what a round is, the design has failed" |
| activation, objective, condition, or campaign models | Master spec: **never in scope, in core. Ever** |
| `Math.random` anywhere | Defeats Dice So Nice. All randomness goes through Foundry `Roll` |
| numeric `initiative` on any Combatant | `initiative: null`, permanently |
| type-name collision detection | Foundry namespaces subtypes by package id — collisions are structurally impossible |

### `init` order — every step

`packages/battleframe/src/battleframe.ts`. Order matters: **rulesets must be able to register
afterwards.**

| # | Step | Source | Why here |
|-------|------|----------|----------|
| 0 | Construct `globalThis.battleframe` | SS-12 | **Module top level, not a hook.** Exists before *any* package's `init`, so ruleset registration is load-order-independent |
| 1 | Bind: `game.battleframe = Object.assign(game.system, globalThis.battleframe)` | SS-12 | Binds `globalThis.battleframe`, `game.battleframe`, and `game.system` to one object |
| 2 | Register settings | SS-09 | Everything downstream may read them |
| 3 | `CONFIG.Actor.dataModels.generic` | SS-08 | Must precede document class registration |
| 4 | `CONFIG.Actor.documentClass` + generic sheet via `DocumentSheetConfig` | SS-08 | ApplicationV2 |
| 5 | `CONFIG.Combat.documentClass` + `CONFIG.ui.combat` | SS-06 | The tracker replaces core's |
| 6 | Initialise base model, measurement, dice | SS-03/04/07 | Pure services; no Foundry state needed |
| 7 | Initialise the registry | SS-05 | Ready to receive registrations |
| — | *Rulesets register in their own `init`* | SS-10 | Works regardless of load order, thanks to step 0 |

### `ready` order — every step

| # | Step | Source | Constraint |
|-------|------|----------|----------|
| 1 | Orphan check | SS-08 | Warn loudly, name the module **and the count**, offer conversion, preserve the payload. **Never auto-convert** — the GM decides |
| 2 | Incompatible-upgrade check | SS-05 | Warn, name the ruleset and **both** versions, **do not silently deactivate** |
| 3 | Activate from `activeRulesetId` | SS-05/SS-09 | Two `primary: true` rulesets → warn, name both, **refuse to activate either** until resolved |
| 4 | Open the wizard if `setupCompleted` is false | SS-09 | **GM only. Never a player.** Zero rulesets is a real product state — a table and a ruler — not an error |
| 5 | Fire `battleframe.ready` | SS-05 | Named exactly so |

### The neutrality test — every assertion

`packages/battleframe/tests/integration/neutrality.test.ts`. **Requirement 9, made
executable.** No omissions — each line closes a real hole.

| # | Assertion | Why it exists |
|-------|------|----------|
| 1 | Walks **every** file under `packages/battleframe/src/` recursively | A sampled or hard-coded list rots the moment someone adds a file |
| 2 | Extracts **every** specifier: static `import`, `import type`, `export … from`, dynamic `import()`, `require()` | A type-only import still couples core to a ruleset's shape. A dynamic import is the obvious way to sneak past a naive check |
| 3 | No specifier resolves into `packages/battleframe-greathelm/` — by package name, workspace name, **or relative `..` escape** | The `..` escape is the likeliest real violation in a monorepo and the easiest to miss in review |
| 4 | The same walk over `packages/battleframe/tests/` | "The core test suite imports **no** ruleset package" — master spec Outcome |
| 5 | `packages/battleframe/package.json` lists no ruleset in `dependencies`, `devDependencies`, or `peerDependencies` | A declared dependency is coupling even with no import today |
| 6 | **The walker found a non-zero, plausible file count** | **The most important line.** A walker that silently finds zero files passes forever and proves nothing. "Core is neutral" and "the test is broken" are indistinguishable without this |
| 7 | Failure output names the **file, line, and specifier** | This test failing means the design is breaking. The reader needs the import in seconds |

**Standing rule: if this test fails, the correct response is never to relax the test.** It is
to stop, and to ask why core learned about a ruleset.

### Deploy script — the contract

| Behaviour | Requirement |
|-------|------|
| `--dest <foundry-data-dir>` | Required. Exit non-zero with a clear message if absent or invalid |
| `packages/battleframe/` → `<dest>/Data/systems/battleframe/` | The system |
| `packages/battleframe-greathelm/` → `<dest>/Data/modules/battleframe-greathelm/` | The module |
| Copies | Manifest, `dist/`, `lang/`, `templates/`, `styles/` |
| Never copies | `node_modules/`, `src/`, `tests/` |
| Missing `dist/` | **Fail loudly.** A stale build deploys silently and behaves like last week |
| Never writes outside `<dest>/Data/` | Safety |
| Exit code | **0** on success |

### Limits and boundaries

- Optional third-party modules required: **zero**. Dice So Nice is optional, always.
- Ruleset packages imported by core: **zero**. Enforced by the neutrality test.
- `primary: true` rulesets active at once: **exactly one**. Two → warn, name both, refuse to
  activate either.
- Rulesets installed for the system to load: **zero** is a valid, supported state.
- `initiative` on any Combatant: **`null`**, permanently.

## Verification Commands

- **Build:** `npm install && npm run build`
- **Tests:** `npm test`
- **Acceptance:** Run every command in **Checks** below; each exits 0. The remaining criteria
  cannot be asserted by a worker:
  - `[INTEGRATION]` service wiring at `init` and the live full round — the unit tests cover
    the seams; the real round needs a licensed Foundry v14 world. See `docs/DEPLOY.md` and
    the master spec's Verification steps 3–9.
  - `[BEHAVIORAL]` *disabling the module leaves the world loadable with the orphan warning* —
    needs a live world and a module toggle.
  - `[BEHAVIORAL]` *with no ruleset installed, the system loads and the ruler measures* —
    needs a live world.
  - `[HUMAN REVIEW]` **did core need any change to host GREATHELM?** — **a human decides.**
    A worker may prepare the diff and the candidate findings; it may not self-certify. See
    Step 12. This criterion is not satisfied by the neutrality test passing: the neutrality
    test proves core does not *import* a ruleset, and cannot prove core did not *learn*
    something game-shaped.

## Checks

Commands drawn from `[MECHANICAL]` and `[STRUCTURAL]` criteria only. `[BEHAVIORAL]`,
`[HUMAN REVIEW]` and `[INTEGRATION]` criteria are excluded — none can be asserted by a shell
command. Each command exits 0 on pass, or 1 with a one-line summary on fail. Run from the
repo root.

| Criterion | Type | Command |
|---|---|---|
| **The neutrality test** — requirement 9, made executable | MECHANICAL | `npm test -- neutrality` |
| Core source contains no game-specific vocabulary | MECHANICAL | `! grep -rniE "greathelm\|knight\|sprint\|encircle\|clash" packages/battleframe/src/ \|\| { echo "core contains game-specific vocabulary — requirement 9 violated; reword the comment or remove the code, do not weaken this check"; exit 1; }` |
| Core imports no ruleset package (belt-and-braces grep behind the test) | MECHANICAL | `! grep -rnE "from ['\"].*battleframe-greathelm\|require\(['\"].*battleframe-greathelm\|import\(['\"].*battleframe-greathelm" packages/battleframe/src/ packages/battleframe/tests/ \|\| { echo "core imports a ruleset package — the neutrality claim is failing"; exit 1; }` |
| Core declares no dependency on a ruleset package | MECHANICAL | `node -e "const p=require('./packages/battleframe/package.json');const d={...p.dependencies,...p.devDependencies,...p.peerDependencies};const bad=Object.keys(d).filter(k=>/greathelm/i.test(k));if(bad.length){console.error('packages/battleframe/package.json declares ruleset dependency: '+bad.join(', '));process.exit(1)}"` |
| The deploy script copies both packages and exits 0 | MECHANICAL | `d=$(mktemp -d) && mkdir -p "$d/Data" && node scripts/deploy-local.mjs --dest "$d" && [ -f "$d/Data/systems/battleframe/system.json" ] && [ -f "$d/Data/modules/battleframe-greathelm/module.json" ] \|\| { echo "deploy-local.mjs: did not place both packages under Data/systems/ and Data/modules/, or exited non-zero"; exit 1; }` |
| The deploy script fails loudly without `--dest` | MECHANICAL | `! node scripts/deploy-local.mjs >/dev/null 2>&1 \|\| { echo "deploy-local.mjs: must exit non-zero when --dest is absent"; exit 1; }` |
| `battleframe.ts` builds the namespace at module top level, not in a hook | STRUCTURAL | `node -e "const s=require('fs').readFileSync('packages/battleframe/src/battleframe.ts','utf8');const i=s.indexOf('globalThis.battleframe');const h=s.search(/Hooks\.(once\|on)\s*\(\s*['\\\"]init/);if(i<0\|\|(h>=0&&i>h)){console.error('battleframe.ts: globalThis.battleframe must be constructed at module top level, BEFORE the init hook — that is what makes ruleset registration load-order-independent');process.exit(1)}"` |
| Every core service is wired in | STRUCTURAL | `node -e "const s=require('fs').readFileSync('packages/battleframe/src/battleframe.ts','utf8');const m=['base','measure','api','dice','settings'].filter(k=>!new RegExp('\\\\b'+k+'\\\\b').test(s));if(m.length){console.error('battleframe.ts: namespace missing service(s): '+m.join(', '));process.exit(1)}"` |
| Core provides no turn model | STRUCTURAL | `! grep -rnE '\b(nextTurn\|advanceActivation\|rollInitiative\|_sortCombatants)\b' packages/battleframe/src/ \|\| { echo "core provides turn semantics — 'if core needs to know what a round is, the design has failed'"; exit 1; }` |
| No `Math.random` in core | MECHANICAL | `! grep -rn 'Math\.random' packages/battleframe/src/ \|\| { echo "Math.random found in core — all randomness must go through Foundry Roll or Dice So Nice breaks"; exit 1; }` |
| No copyrighted source document tracked | MECHANICAL | `[ -z "$(git ls-files \| grep -iE '\.(pdf\|epub\|mobi\|cbz\|cbr)$')" ] \|\| { echo "a rulebook or source document is tracked in git — it must never be redistributed"; exit 1; }` |
| Build and full test suite pass | MECHANICAL | `npm install && npm run build && npm test` |

## Patterns to Follow

**There is no existing codebase — this project is greenfield.** Every file here is new;
`battleframe.ts` exists only as SS-02's skeleton from earlier in this same build, and this
sub-spec replaces it. There are no in-repo source patterns to detect and none to cite. What
follows are **research notes in `vault/`**, which the master spec ranks above recollection:
"Foundry's API changed heavily v10→v14; remembered idioms are usually stale."

**Foundry API — `vault/foundry-systems/`:**

- `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confirmed`): **the most
  important note for this sub-spec.** dnd5e's shipping v14 namespace pattern, verbatim.
  Confirms by *absence* that there is no official API mechanism — no `api` field in either
  manifest schema, no `api` property on `foundry.packages.System`, no documented
  `game.system.api`. The entire public-API story is convention, so the namespace is ours to
  define. And the load-order trick — namespace at module top level, merged onto `game.system`
  at `init` — is what makes SS-10's registration work regardless of package load order.
- `vault/foundry-systems/registering-a-typedatamodel-at-init.md` (`confirmed`): the `init`
  registration idiom for `CONFIG.Actor.dataModels`.
- `vault/foundry-systems/v13-v14-sheet-registration-namespaces.md` (`confirmed`): the v14
  namespaced registration calls — `foundry.documents.collections.Actors`,
  `foundry.applications.apps.DocumentSheetConfig`. The globals moved; older tutorials are
  wrong.
- `vault/foundry-systems/combat-tracker-is-replaceable-via-config-ui-combat.md`
  (`confirmed`): the `CONFIG.ui.combat` wiring.
- `vault/foundry-systems/lancer-activation-based-combat-precedent.md` (`confirmed`): why core
  provides no `nextTurn`. `turn: null` is the trick.
- `vault/foundry-systems/module-subtypes-vanish-when-the-module-is-disabled.md`
  (`confirmed`): why the orphan check exists, and why a disabled module looks exactly like
  data loss without it.
- `vault/foundry-systems/foundry-v14-is-current-as-of-july-2026.md` (`confirmed`): 14.363 on
  the target server. ApplicationV2 only, no `template.json`.
- `vault/foundry-systems/battleframe-architecture-implications.md`: the architecture this
  sub-spec assembles.

**Design authority:**

- `docs/plans/2026-07-16-battleframe-foundry-skirmish-engine-design.md` (status: evaluated):
  the source design. Open Question 7 covers naming and publishing — **human-only decisions**.
- `vault/candidate-rulesets/activation-model-comparison.md`: **why activation is not in
  core.** Five games, five incompatible turn structures, no shared primitive. Read this if
  wiring GREATHELM ever tempts you to add a turn helper to core.

**The spike results — read before trusting anything about measurement:**

- `vault/foundry-systems/spike-results-measurement.md`, `spike-results-regions.md`,
  `spike-results-module-subtypes.md` (produced by SS-01, `dispatch: manual`, `confidence:
  confirmed`, citing observed console output). **Real Foundry beats the vault; the vault beats
  recollection.** If real Foundry contradicts a note: stop, correct the note, continue.

## Files

Prefix any path a sub-spec will CREATE (not yet present on disk) with `will-create:`.

`packages/battleframe/src/battleframe.ts` is listed as `will-create:` because it is new to
this build — SS-02 creates it as a bare skeleton earlier in the same run and this sub-spec
**rewrites it in full**. **SS-02 owns its existence; SS-12 owns its content.** Both sub-specs
legitimately declare it. The path is new to the repository either way — the repo currently
contains no `packages/` directory at all.

| File | Action | Purpose |
|------|--------|---------|
| will-create: packages/battleframe/src/battleframe.ts | Create | **Rewritten in full.** Constructs the `game.battleframe` namespace at module top level; imports and initialises every core service at `init` in an order that lets rulesets register afterwards; runs the orphan check, activation, and wizard at `ready` |
| will-create: packages/battleframe/tests/integration/neutrality.test.ts | Create | **The neutrality test — requirement 9, made executable.** Asserts no file under `packages/battleframe/src/` (or `tests/`) imports from `packages/battleframe-greathelm/`, by name or by relative escape; asserts the walker found files |
| will-create: packages/battleframe/tests/integration/full-round.test.ts | Create | Drives the full flow through the **public seams only** — never importing the ruleset, because the neutrality test walks this directory too |
| will-create: scripts/deploy-local.mjs | Create | `--dest <foundry-data-dir>` → copies both packages into `Data/systems/` and `Data/modules/`, exits 0. Fails loudly on a missing build |
| will-create: docs/DEPLOY.md | Create | Deploy steps plus the live verification sequence a worker cannot assert — including the physical fixture measurement, which is not optional, and the honest question about core changes |
| will-create: docs/plans/2026-07-16-core-changes-required-by-greathelm.md | Create | **Conditional.** Written only if the answer to "did core need any change to host GREATHELM?" is yes. A design failure recorded, not absorbed |
