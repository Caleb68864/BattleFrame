---
type: phase-spec
master_spec: "docs/specs/2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 4
title: "Measurement service — base-to-base distance"
date: 2026-07-16
depends_on: ["SS-03"]
---

# Sub-Spec 4: Measurement service — base-to-base distance

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

The engine's reason to exist. Base-to-base distance for gridless, square and hex scenes, with
fixtures that prove it.

**Why this sub-spec exists at all:** Foundry measures **centre-to-centre**. Miniature rules
measure **base-to-base**. Every game researched needs base-to-base; no precedent system has
solved it. That gap is the product — the rules are not.

**Gate — read this before anything else:**

This sub-spec is **gated on `vault/foundry-systems/spike-results-measurement.md`**, produced by
SS-01 (`dispatch: manual`). At the time this phase spec was written, **that file does not
exist**. SS-01 requires a human with a licensed Foundry, a live world, and eyes on a console.
Its absence means the gate **has not been run** — it does not mean the gate passed.

**If the file is absent when you start: STOP and escalate. Do not proceed. Do not guess.**
Guessing here produces silently wrong ranges in every game Battleframe will ever host — the
single worst failure mode in this project. See Step 1.

**Research status — respect the confidence levels:**

- `vault/foundry-systems/custom-distance-measurement-has-no-clean-override-seam.md` is
  `confidence: partial`. It establishes that `BaseGrid#measurePath` is the canonical method and
  that **its `cost` callback is the only real extension point**. Core issue
  [foundryvtt#11428](https://github.com/foundryvtt/foundryvtt/issues/11428) is **open, no
  milestone, no staff response**. The requester's own workaround was maintaining custom
  measurement in their module.
- The same note records that **v13 moved computation out of the Ruler** — the v13/v14 Ruler
  renders measurement, it no longer computes it. Target the grid layer, not the ruler.
  `CONFIG.Canvas.rulerClass` is marked **not found / unverified**. Do not rely on it.
- `vault/foundry-systems/gridless-is-a-first-class-grid-class.md` is `confidence: partial`. It
  confirms gridless honours the same `measurePath` contract as square and hex, `units` is a
  free-form string so `"in"` works, and `GridlessGrid` never consults `diagonals`. It also
  states plainly: **nothing in the official docs covers true edge-to-edge (base-to-base) token
  measurement.** Foundry measures centre-to-centre by default.
- `vault/foundry-systems/grid-types-and-diagonal-rules-constants.md` is `confidence: confirmed`.
  `CONST.GRID_TYPES`: GRIDLESS 0, SQUARE 1, HEXODDR 2, HEXEVENR 3, HEXODDQ 4, HEXEVENQ 5. All
  four hex orientations are native. Grid classes live under `foundry.grid`, with accessors
  `isGridless()`, `isHexagonal()`, `isSquare()`.

**Measurement has no natural oracle.** There is no error state for a wrong distance — there is
just a number that is quietly incorrect, and a player who trusts it. Known-distance fixtures are
the only way to know it is right. This is why the fixture file is a first-class deliverable and
not a test detail.

**Boundary:** if the SS-01 gate showed `cost` cannot express base-to-base, implement measurement
directly on `canvas.dimensions` + the SS-03 base model, and **stop before replacing the ruler**.
Ruler replacement is a separate, larger piece of work needing a human decision.

## Interface Contracts

### Provides

- `packages/battleframe/src/measurement/measure.ts` — exports `between(tokenA, tokenB)`, the
  base-to-base distance function. Consumed by SS-11 (GREATHELM Sprint = 5") via
  `game.battleframe.measure.between`, and by SS-12's full-round integration test.
- `packages/battleframe/src/measurement/types.ts` — exports the `MeasurementResult` type
  (`{distance: number, units: string, mode: "base-to-base"}`) and the measure-service interface
  shape that SS-12 attaches to the namespace.
- `packages/battleframe/tests/fixtures/known-distances.ts` — exports the known-distance fixture
  table. The oracle. Reusable by SS-12's integration tests.

### Requires

- `packages/battleframe/src/base/base-model.ts` — **from SS-03.** `getBase(token)` returning
  `{shape, widthMm, heightMm}`, and `radiusPx(token, scene)` converting mm → pixels via the
  scene's grid size and distance. Measurement is meaningless without this and must not
  reimplement it.
- `packages/battleframe/src/base/types.ts` — **from SS-03.** Base shape types.
- **From SS-02:** the TypeScript/Vite/Vitest scaffold, npm workspaces `["packages/*"]`, and
  `packages/battleframe/system.json` declaring `grid: {type: 0, distance: 1, units: "in"}`.
- **From SS-01 (`dispatch: manual`, human-only):**
  `vault/foundry-systems/spike-results-measurement.md`. **A hard gate.** It determines whether
  `measurePath`'s `cost` callback suffices or whether core must measure directly. It does not
  exist yet.
- **From SS-12:** the `game.battleframe` namespace object. **SS-12 owns and constructs it** —
  this sub-spec does **not** create `game.battleframe`, does not assign to it, and does not
  assume it exists at import time. Export a plain module; SS-12 wires it to
  `game.battleframe.measure` at `init`. Unit tests here call the exported function directly and
  must not depend on a global.

### Shared State

- `game.battleframe.measure` — the namespace slot this service occupies. Constructed by SS-12,
  shared with SS-05 (`api`), SS-07 (`dice`). This sub-spec supplies the object; it does not own
  the namespace.
- `token.flags.battleframe.base` — read via SS-03's `getBase()`. **Read-only here.** Measurement
  never writes a base flag.
- `vault/foundry-systems/spike-results-measurement.md` — an input artifact shared with SS-01,
  which produces it. Read-only here.
- Scene grid configuration (`type`, `distance`, `units`) — read from the scene, never mutated.

## Implementation Steps

### Step 1: Check the gate — STOP if it is not there

- **File:** `vault/foundry-systems/spike-results-measurement.md` (read-only; produced by SS-01)
- **Run:** `test -f vault/foundry-systems/spike-results-measurement.md && echo GATE-PRESENT || echo GATE-ABSENT`
- **If `GATE-ABSENT`:** **STOP. Escalate to a human. Write no code.** Do not create the file. Do
  not infer its contents from the other vault notes. Do not proceed to Step 2. SS-01 is
  `dispatch: manual` because it needs a licensed Foundry and a live console; an absent file means
  the probe was never run.
- **If `GATE-PRESENT`:** read it in full. Confirm its frontmatter says `confidence: confirmed`
  and that it cites observed console output rather than inference. Then extract two answers
  before writing anything:
  1. **Can `measurePath`'s `cost` callback express base-to-base?** If **no**, take the fallback
     path recorded in Decisions: measure directly on `canvas.dimensions` + the SS-03 base model,
     and **stop before replacing the ruler**.
  2. **What units does a gridless scene actually report?** Verbatim from the probe output.
- **Also read:** `vault/foundry-systems/custom-distance-measurement-has-no-clean-override-seam.md`
  and `vault/foundry-systems/gridless-is-a-first-class-grid-class.md`. Both are
  `confidence: partial`. **Where the spike results contradict either note, the spike wins** —
  correct the note explicitly and continue (master spec, Escalation triggers: "Real Foundry
  contradicts a vault note → stop, correct the note, continue").
- **Expected:** either a written escalation, or a recorded decision on the `cost`-vs-direct path
  with a citation to the spike note.

### Step 2: Write the known-distance fixtures

- **File:** `packages/battleframe/tests/fixtures/known-distances.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. All 63 files in this spec are new.
- **Changes:** Export a table of hand-computed cases. Each entry carries scene config
  (`gridType`, `gridSize` in px, `distance`, `units`), both tokens' centre positions and base
  dimensions in mm, and the **hand-computed expected base-to-base distance** with a comment
  showing the arithmetic. This file is the oracle — every number in it must be derivable by a
  human with a calculator, never by running the code under test.
- **Cover, at minimum:** gridless / square / hex; equal base sizes; unequal base sizes; bases
  exactly touching (expect `0`); bases overlapping (expect `0`); a base larger than its token.
- **Do not** import `measure.ts` into this file. A fixture that calls the implementation proves
  nothing.

### Step 3: Write failing tests

- **File:** `packages/battleframe/tests/measure.test.ts`
- **Test names:**
  - `between() returns {distance, units, mode: "base-to-base"} for two Tokens`
  - `between() matches known-distance fixtures on gridless scenes`
  - `between() matches known-distance fixtures on square scenes`
  - `between() matches known-distance fixtures on hex scenes`
  - `between() matches fixtures for unequal base sizes`
  - `between() returns exactly 0 when bases touch`
  - `between() returns 0 when bases overlap, never negative`
  - `between(a, b) === between(b, a) (property)`
  - `base-to-base equals centre-to-centre minus the sum of base radii for non-overlapping tokens`
  - `between() debug-logs centre-to-centre, both base radii, and the base-to-base result`
- **Asserts:** every fixture row; symmetry across the fixture table; the touching case is `=== 0`
  and not `toBeCloseTo(0)`; the overlap case is `>= 0`; the debug log fires with all four values.
- **Run:** `npm test -- measure`
- **Expected:** FAIL — `Cannot find module '../src/measurement/measure'`.

### Step 4: Implement the measurement types

- **File:** `packages/battleframe/src/measurement/types.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Mirror the field naming SS-03 established in
  `packages/battleframe/src/base/types.ts` (mm-suffixed lengths, px-suffixed pixels).
- **Changes:** Export `MeasurementResult` = `{distance: number, units: string, mode: "base-to-base"}`.
  `mode` is a literal type, not `string` — there is exactly one mode and a centre-to-centre
  distance anywhere in the codebase is a bug, not a variant. Export the service interface shape
  that SS-12 will attach to `game.battleframe.measure`.

### Step 5: Implement the measurement service

- **File:** `packages/battleframe/src/measurement/measure.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. The authority is
  `vault/foundry-systems/spike-results-measurement.md` (read in Step 1), backed by
  `custom-distance-measurement-has-no-clean-override-seam.md` (`partial`) and
  `gridless-is-a-first-class-grid-class.md` (`partial`).
- **Changes:**
  - `between(tokenA, tokenB): MeasurementResult`. **Takes Tokens, not points** — a point has no
    base, and the whole point of this service is that bases have size.
  - Obtain centre-to-centre via the path the spike results endorse. Per the vault, the canonical
    method is `BaseGrid#measurePath` and its `cost` callback is the only extension point; if the
    spike showed `cost` cannot express base-to-base, measure directly on `canvas.dimensions` +
    the base model instead. **Stop before replacing the ruler** either way.
  - Subtract both base radii, obtained from SS-03's `radiusPx(token, scene)`. Do not recompute
    radii here.
  - **Clamp at zero.** `Math.max(0, ...)`. Touching returns exactly `0`; overlapping returns `0`;
    never negative.
  - Take `units` from the scene, not from a constant. Per
    `gridless-is-a-first-class-grid-class.md`, `units` is free-form and `distance` defines what
    one grid space represents — that is how scale is set with no grid drawn.
  - **Measurement is inspectable, not implicit.** Debug-log centre-to-centre, both base radii,
    and the resulting base-to-base value on every call. A wrong distance is otherwise
    undebuggable: there is no error, just a quietly incorrect number.
  - Do not branch on ruleset. Core stays ignorant of any specific game.

### Step 6: Verify tests pass

- **Run:** `npm test -- measure`
- **Expected:** PASS — every fixture row, both symmetry and radii-subtraction property tests, and
  the touching/overlap edge cases.

### Step 7: Verify measurement is not reimplemented elsewhere

- **Run:** `grep -rn "measurePath" packages/battleframe/src/ | grep -v "measurement/"`
- **Expected:** no output. Measurement lives in one place.
- **Run:** `npm run build`
- **Expected:** exits 0.

### Step 8: Commit

- **Stage:** `git add packages/battleframe/src/measurement/measure.ts packages/battleframe/src/measurement/types.ts packages/battleframe/tests/measure.test.ts packages/battleframe/tests/fixtures/known-distances.ts`
- **Message:** `feat: measurement service — base-to-base distance`

## Acceptance Criteria

- `[STRUCTURAL]` `game.battleframe.measure.between(tokenA, tokenB)` returns `{distance: number, units: string, mode: "base-to-base"}` and takes **Tokens, not points**.
- `[MECHANICAL]` `npm test -- measure` passes against known-distance fixtures covering: gridless, square, and hex; equal and unequal base sizes.
- `[BEHAVIORAL]` Two tokens whose bases touch return **exactly 0**, not a small positive number.
- `[BEHAVIORAL]` Two tokens whose bases **overlap** return 0 — never negative.
- `[STRUCTURAL]` A property test asserts `between(a,b) === between(b,a)`.
- `[STRUCTURAL]` A test asserts base-to-base equals centre-to-centre **minus the sum of base radii**, for non-overlapping tokens.
- `[MECHANICAL]` `grep -rn "measurePath" packages/battleframe/src/ | grep -v "measurement/"` returns nothing — measurement is not reimplemented anywhere else.
- `[HUMAN REVIEW]` The on-screen ruler and `measure.between()` agree. If they diverge, players trust the ruler and the game is silently wrong.
- `[STRUCTURAL]` **Measurement is inspectable, not implicit.** The returned object carries enough to explain itself — at minimum `{distance, units, mode}` — and a debug-level log records centre-to-centre, both base radii, and the resulting base-to-base value. A wrong distance is otherwise undebuggable: there is no error, just a number that is quietly incorrect.

<!--
Note, not a change: the first criterion is written against `game.battleframe.measure.between`,
but SS-12 owns and constructs the `game.battleframe` namespace — it does not exist during SS-04.
Preserved verbatim per the red-team hardening. Satisfy it by exporting `between` with the
specified signature and return shape; SS-12 binds it to the namespace slot. Unit tests call the
export directly.
-->

## Completeness Checklist

`MeasurementResult` — returned by `between()`:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `distance` | `number` | required | SS-11 Sprint range check; SS-12 full-round test; ruler comparison |
| `units` | `string` | required | Chat/UI display; read from the scene, never a constant |
| `mode` | `"base-to-base"` (literal) | required | Self-description; asserts a centre-to-centre value never escapes |

Fixture row — each entry in `known-distances.ts`:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `name` | `string` | required | Test case label |
| `gridType` | `0 \| 1 \| 2 \| 3 \| 4 \| 5` | required | Scene setup (`CONST.GRID_TYPES`) |
| `gridSize` | `number` (px) | required | mm → px conversion via SS-03 `radiusPx` |
| `distance` | `number` | required | Scene scale — what one grid space represents |
| `units` | `string` | required | Expected `units` passthrough |
| `tokenA` | `{x, y, base: {shape, widthMm, heightMm}}` | required | Input token |
| `tokenB` | `{x, y, base: {shape, widthMm, heightMm}}` | required | Input token |
| `expectedDistance` | `number` | required | The oracle — hand-computed, never generated |
| `note` | `string` | required | The arithmetic, written out, so a human can re-check it |

Boundaries and limits:

- Minimum returned distance: **exactly `0`** — enforced by a `Math.max(0, ...)` clamp in
  `measure.ts`. Touching is `0`; overlapping is `0`; negative is never returned.
- Base unit: **millimetres**, always (master spec, Committed decisions). Convert at the boundary.
  Never store inches or pixels in the base model.
- Grid types covered: **all six** in `CONST.GRID_TYPES` — GRIDLESS 0, SQUARE 1, HEXODDR 2,
  HEXEVENR 3, HEXODDQ 4, HEXEVENQ 5. Fixtures must include at least one of each family
  (gridless, square, hex).
- Debug log fields: **exactly four** — centre-to-centre, radius A, radius B, base-to-base result.
- Measurement implementations in `packages/battleframe/src/`: **exactly one**, under
  `measurement/`.

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test -- measure`
- **Acceptance:**
  - Gate: `test -f vault/foundry-systems/spike-results-measurement.md` — must pass **before any
    other step**. Failure is an escalation, not a test failure.
  - Fixtures: `npm test -- measure` covers gridless/square/hex and equal/unequal bases.
  - Single implementation: `grep -rn "measurePath" packages/battleframe/src/ | grep -v "measurement/"` returns nothing.
  - `[HUMAN REVIEW]` Ruler agreement: on a live Foundry v14 world, drag the ruler between two
    tokens and compare with `game.battleframe.measure.between()`. Cannot be asserted by a worker.

## Checks

| Criterion | Type | Command |
|---|---|---|
| SS-01 gate present before any work | STRUCTURAL | `test -f vault/foundry-systems/spike-results-measurement.md \|\| { echo "GATE: spike-results-measurement.md absent — SS-01 has not run. STOP and escalate."; exit 1; }` |
| `between()` returns `{distance, units, mode}` and takes Tokens | STRUCTURAL | `grep -qE "mode: *['\"]base-to-base['\"]\|MeasurementResult" packages/battleframe/src/measurement/measure.ts && grep -q "tokenA" packages/battleframe/src/measurement/measure.ts \|\| { echo "measure.between does not expose {distance,units,mode} over Token args"; exit 1; }` |
| `npm test -- measure` passes against fixtures | MECHANICAL | `npm test -- measure \|\| { echo "measure tests failed against known-distance fixtures"; exit 1; }` |
| Symmetry property test exists | STRUCTURAL | `grep -q "between(b, *a)" packages/battleframe/tests/measure.test.ts \|\| { echo "no property test asserting between(a,b) === between(b,a)"; exit 1; }` |
| Radii-subtraction test exists | STRUCTURAL | `grep -qiE "centre-to-centre\|center-to-center" packages/battleframe/tests/measure.test.ts \|\| { echo "no test asserting base-to-base == centre-to-centre minus sum of radii"; exit 1; }` |
| Measurement not reimplemented elsewhere | MECHANICAL | `! grep -rn "measurePath" packages/battleframe/src/ \| grep -v "measurement/" \| grep -q . \|\| { echo "measurePath used outside packages/battleframe/src/measurement/"; exit 1; }` |
| Debug log records ccentre + both radii + result | STRUCTURAL | `grep -qiE "debug" packages/battleframe/src/measurement/measure.ts && grep -qi "radi" packages/battleframe/src/measurement/measure.ts \|\| { echo "measure.ts does not debug-log centre-to-centre, radii and result"; exit 1; }` |
| Fixtures do not import the code under test | STRUCTURAL | `! grep -q "measure" packages/battleframe/tests/fixtures/known-distances.ts \|\| { echo "fixture file imports measure.ts — the oracle must be independent"; exit 1; }` |
| Build succeeds | MECHANICAL | `npm run build \|\| { echo "build failed"; exit 1; }` |

## Patterns to Follow

**No existing pattern — greenfield.** There is no codebase. All files in this spec are new, so
there is no prior art in-repo to match. The authorities are the research notes:

- `vault/foundry-systems/spike-results-measurement.md`: **the gate and the authority.** Produced
  by SS-01. Does not exist yet — its absence is a STOP, not a pass. Determines `cost`-callback
  vs. direct measurement.
- `vault/foundry-systems/custom-distance-measurement-has-no-clean-override-seam.md`
  (`confidence: partial`): `BaseGrid#measurePath` is canonical; the `cost` callback is the only
  real extension point; `SquareGrid#diagonals` is read-only; core issue #11428 is **open and
  unanswered**. v13 moved computation out of the Ruler — target the grid layer, not the ruler.
  `CONFIG.Canvas.rulerClass` and `GridLayer.measureDistances` are **not found / unverified** —
  do not use them.
- `vault/foundry-systems/gridless-is-a-first-class-grid-class.md` (`confidence: partial`):
  gridless honours the same `measurePath` contract; `units` is free-form so `"in"` works;
  `distance` sets scale with no grid drawn; `GridlessGrid` never consults `diagonals`. Explicitly
  records that base-to-base token measurement is **not found** in the official docs.
- `vault/foundry-systems/grid-types-and-diagonal-rules-constants.md` (`confidence: confirmed`):
  `CONST.GRID_TYPES` values; all four hex orientations are native; `foundry.grid` accessors
  `isGridless()` / `isHexagonal()` / `isSquare()`.
- `packages/battleframe/src/base/base-model.ts` (**from SS-03, will exist**): call `getBase()`
  and `radiusPx()`. Do not reimplement mm → px conversion — SS-03 owns it and unit-tests it.

**Do not invent Foundry API details.** If a needed fact is not in the notes or the spike results,
it is `not found` — escalate. A confidently-wrong API detail here sends implementation down a
dead end, and the failure is silent.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe/src/measurement/measure.ts` | Create | `between(tokenA, tokenB)` — base-to-base distance; clamps at 0; debug-logs its own arithmetic |
| `will-create: packages/battleframe/src/measurement/types.ts` | Create | `MeasurementResult` and the service interface SS-12 attaches to the namespace |
| `will-create: packages/battleframe/tests/measure.test.ts` | Create | Fixture-driven tests, symmetry property, radii-subtraction property, touch/overlap edges |
| `will-create: packages/battleframe/tests/fixtures/known-distances.ts` | Create | The oracle — hand-computed known distances across gridless/square/hex, equal and unequal bases |
