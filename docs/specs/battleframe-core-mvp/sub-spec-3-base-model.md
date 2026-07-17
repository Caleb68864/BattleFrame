---
type: phase-spec
master_spec: "docs/specs/2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 3
title: "Base model — miniature bases as circles"
date: 2026-07-16
depends_on: ["SS-02"]
dispatch: factory
---

# Sub-Spec 3: Base Model — Miniature Bases as Circles

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

Model a miniature base as a **circle or oval sized in millimetres**, and map it onto Foundry's
**rectangular** token footprint. Measurement is meaningless without this, so it lands first.

**The mismatch this sub-spec exists to resolve.** A miniature base is a circle or an oval,
physically measured in millimetres — that is what bases are sold as and what OPR's API returns
(`bases: {round: "120x92"}`). A Foundry token is an axis-aligned rectangle sized in **grid
units**, rendered in **pixels**. Nothing in Foundry knows what a base is. SS-04 cannot compute
base-to-base distance until something can answer "what is this token's base radius, in pixels,
on this scene?" — this sub-spec is that something, and nothing more.

**Millimetres, always. Convert at the boundary.** The base model **never** stores inches or
pixels. `widthMm`/`heightMm` are the only stored dimensions; `radiusPx(token, scene)` is the
single conversion boundary, and it is a **derivation**, not a field.

**Scope boundary — this sub-spec does not measure anything.** It provides base geometry.
Distance between two tokens is SS-04's, which reads
`vault/foundry-systems/spike-results-measurement.md` (SS-01's gate artifact) before writing a
line. **Do not compute a distance here**, do not import or reference `measurePath`, and do not
anticipate SS-04's interface beyond exporting `radiusPx`.

**No Foundry runtime in tests.** Vitest runs in `node` (SS-02). There is no `canvas`, no
`game`, no real `Token`. Every test constructs a **plain-object stub** shaped like the parts of
a Token/Scene actually read: `token.flags`, the token's footprint fields, and
`scene.grid.{size, distance, units}`. This is a constraint on the design, and a good one:
**`getBase` and `radiusPx` must be pure functions of their arguments**, reaching for no global.
That is what makes them testable and what makes SS-04's fixtures possible.

**Loud failure over plausible output.** A wrong base radius produces a wrong range in every
game Battleframe will ever host, with no error — just a number that is quietly incorrect. The
zero-size case is the sharp edge: a zero or negative `widthMm` must **not** silently become a
plausible default. Follow the master spec's Edge Cases disambiguation — **"handles invalid
input" → strict. Reject anything non-conforming with a specific error. Never coerce.**

**Debug-log once, not per call.** The missing-flag path is the common path (every token without
an explicit base), and it runs inside measurement, which runs on every ruler drag. A per-call
log floods the console and buries the real signal. Module-level `Set` of already-warned token
ids; log on first sight only.

## Interface Contracts

### Provides

- **`getBase(token): BaseShape`** — from `packages/battleframe/src/base/base-model.ts`. Reads
  `token.flags.battleframe.base`; derives a circle from the token footprint when the flag is
  absent. **Consumed by SS-04** (`measure.between`) to obtain both tokens' base geometry.
- **`radiusPx(token, scene): number`** — from `packages/battleframe/src/base/base-model.ts`.
  The **single mm → pixel conversion boundary**, using the scene's grid `size` and `distance`.
  **Consumed by SS-04** to subtract base radii from a centre-to-centre distance.
- **`BaseShape`** and the `"circle" | "oval"` shape union — from
  `packages/battleframe/src/base/types.ts`. The flag payload contract:
  `{shape, widthMm, heightMm}`.
- **The flag path `flags.battleframe.base`** — the contract a ruleset writes to in order to
  give a token a real base. SS-10's `knight` is the first consumer.

### Requires

- **From SS-02:** the repo scaffold. Specifically:
  - `npm test` (Vitest) and `npm test -- base-model` filtering to one file.
  - `tsconfig.json` and the TypeScript toolchain.
  - `packages/battleframe/src/constants.ts` → `SYSTEM_ID` (`"battleframe"`, the flag scope) and
    `LOG_PREFIX` (the debug line).
  - The `packages/battleframe/` package and its workspace entry.
- **Nothing from SS-01.** SS-01's gate governs SS-04, not this sub-spec. Base geometry is
  correct regardless of how measurement is ultimately implemented — which is precisely why this
  work can land while the gate result is still being digested.
- **No Foundry runtime.** Do not require one at test time.

### Shared State

- **`flags.battleframe.base` on a Token** — a **cross-package contract**. Core reads it here;
  ruleset modules (SS-10 onward) write it. Both sides depend on the exact shape in the
  Completeness Checklist. Changing it later breaks every ruleset silently.
- **`packages/battleframe/src/base/types.ts`** — imported by SS-04's
  `packages/battleframe/src/measurement/types.ts`.
- **`packages/battleframe/src/constants.ts`** — read-only here. Do not add a base-specific
  constant to it; base constants belong in `base/types.ts` or `base/base-model.ts`.
- **`packages/battleframe/src/battleframe.ts`** — **do not touch.** SS-02 owns its existence;
  **SS-12** rewrites it and wires this service into `game.battleframe`. This sub-spec exports
  functions and stops. Wiring here would be overwritten and would collide with SS-12.

## Implementation Steps

### Step 1: Write failing test

- **File:** `packages/battleframe/tests/base-model.test.ts`
- **Test name:** `getBase > reads an explicit circle base from the token flag`
- **Asserts:** For a stub token with
  `flags.battleframe.base = {shape: "circle", widthMm: 32, heightMm: 32}`, `getBase(token)`
  returns exactly that shape — `shape === "circle"`, `widthMm === 32`, `heightMm === 32`.
- **Run:** `npm test -- base-model`
- **Expected:** **FAIL** — `Cannot find module '../src/base/base-model'`.

### Step 2: Define the base types

- **File:** `packages/battleframe/src/base/types.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. See **Patterns to Follow**.
- **Changes:** Export `BaseShapeKind = "circle" | "oval"` and
  `BaseShape = {shape: BaseShapeKind, widthMm: number, heightMm: number}`. Also export the
  minimal structural stubs this module reads from a Token and a Scene — **not** Foundry's full
  types. Keep the read surface as narrow as it can be: it is the entire testability story.

### Step 3: Implement `getBase` for the explicit-flag case

- **File:** `packages/battleframe/src/base/base-model.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield.
- **Changes:** `getBase(token)` reads `token.flags?.[SYSTEM_ID]?.base` (with `SYSTEM_ID`
  imported from `../constants`, not hardcoded) and returns it when present. **The flag wins over
  the footprint** — always, unconditionally. Validate strictly: a present-but-malformed flag is
  an **error**, not a fallback to derivation. Silently deriving from a typo'd flag is exactly
  the plausible-output failure the Intent forbids.

### Step 4: Verify test passes

- **Run:** `npm test -- base-model`
- **Expected:** **PASS** — `getBase > reads an explicit circle base from the token flag`.

### Step 5: Write failing test — oval bases

- **File:** `packages/battleframe/tests/base-model.test.ts`
- **Test name:** `getBase > reads an explicit oval base with unequal width and height`
- **Asserts:** `{shape: "oval", widthMm: 120, heightMm: 92}` (OPR's real
  `bases: {round: "120x92"}` value) round-trips through `getBase` with width and height
  distinct and **not** normalised, averaged, or swapped.
- **Run:** `npm test -- base-model`
- **Expected:** **PASS** if Step 3 stores the flag faithfully; **FAIL** if it collapses an oval
  to a circle. Either outcome is informative — an oval must survive.

### Step 6: Write failing test — missing flag derives a circle

- **File:** `packages/battleframe/tests/base-model.test.ts`
- **Test name:** `getBase > derives a circle from the token footprint when the flag is absent`
- **Asserts:** For a stub token with **no** `flags.battleframe.base`, `getBase` returns
  `shape === "circle"`, `widthMm === heightMm` (a derived base is **always** circular — a
  rectangle carries no information about ovality), and both are `> 0`.
- **Run:** `npm test -- base-model`
- **Expected:** **FAIL** — derivation is not implemented.

### Step 7: Implement footprint derivation

- **File:** `packages/battleframe/src/base/base-model.ts`
- **Action:** modify
- **Changes:** When the flag is absent, derive a circle from the token footprint. Convert the
  footprint through the scene's grid `distance` and `units` to millimetres. **Document the
  conversion constant and its direction in a comment** — `1 in = 25.4 mm` exactly. A derived
  circle is inscribed in the footprint: use the **smaller** of the footprint's two dimensions,
  so a base never protrudes past its own token. Note the asymmetry honestly in a comment: the
  derived value is a **guess**, the flag is **data**, and only the flag is trustworthy.

### Step 8: Write failing test — the log fires once, not per call

- **File:** `packages/battleframe/tests/base-model.test.ts`
- **Test name:** `getBase > debug-logs the derived-base fallback once, not per call`
- **Asserts:** With the console/logger spied, call `getBase` **three times** on the same
  flagless token; the debug line is emitted **exactly once**. Then call it on a **different**
  flagless token and assert the count is **2** — the guard must be per token, not a global
  once-ever latch that hides every subsequent token.
- **Run:** `npm test -- base-model`
- **Expected:** **FAIL** — the log fires three times (or not at all).

### Step 9: Implement the once-only debug log

- **File:** `packages/battleframe/src/base/base-model.ts`
- **Action:** modify
- **Changes:** Module-level `Set<string>` of token ids already warned about. On the first
  derivation for a given id, log **one** debug line via `LOG_PREFIX` naming the token and the
  derived dimensions; add the id to the set. **Export a reset for tests** (or accept an injected
  logger) — module state that no test can clear makes test order significant, which is its own
  silent-failure mode. Guard against a token with **no id** — do not key the set on `undefined`
  and thereby silence every unidentified token at once.

### Step 10: Verify tests pass

- **Run:** `npm test -- base-model`
- **Expected:** **PASS** — all of: explicit circle, oval, missing flag, log-once.

### Step 11: Write failing test — zero-size

- **File:** `packages/battleframe/tests/base-model.test.ts`
- **Test name:** `getBase > rejects a zero-size base rather than coercing it`
- **Asserts:** A flag of `{shape: "circle", widthMm: 0, heightMm: 0}` **throws a specific
  error** naming the token and the offending value. Same for a **negative** `widthMm`. It must
  **not** silently substitute a default, and must **not** return `0`: a zero-radius base makes
  base-to-base silently equal centre-to-centre — the exact bug this project exists to prevent.
  Also assert the **derivation** path rejects a zero-size footprint rather than producing a
  zero-radius base.
- **Run:** `npm test -- base-model`
- **Expected:** **FAIL** — no validation exists.

### Step 12: Implement strict validation

- **File:** `packages/battleframe/src/base/base-model.ts`
- **Action:** modify
- **Changes:** Reject, with a specific and actionable error naming the token id and the bad
  value: `widthMm`/`heightMm` that are not finite numbers, are `<= 0`, or are `NaN`; a `shape`
  outside `"circle" | "oval"`; a flag present but not an object. **Never coerce.** Per the
  master spec's Edge Cases: *"handles invalid input" → strict. Imports and registrations reject
  anything non-conforming with a specific error. Never coerce.*

### Step 13: Write failing test — a base larger than its token

- **File:** `packages/battleframe/tests/base-model.test.ts`
- **Test name:** `getBase > honours a base larger than its token footprint`
- **Asserts:** An explicit flag whose `widthMm` exceeds the footprint's mm-equivalent is
  returned **unchanged** — not clamped, not warned into submission. This is legitimate and
  common: a 120×92 mm oval on a 1×1 token is how a monster is usually configured. **The flag
  wins over the footprint** is unconditional, and this test is what stops a future contributor
  adding a "sanity" clamp that silently shrinks real bases.
- **Run:** `npm test -- base-model`
- **Expected:** **FAIL** if any clamping crept in; **PASS** if Step 3 is faithful. Keep the test
  either way — it is a regression guard.

### Step 14: Write failing test — `radiusPx` against a known scene

- **File:** `packages/battleframe/tests/base-model.test.ts`
- **Test name:** `radiusPx > converts millimetres to pixels against a known scene configuration`
- **Asserts:** Against an explicit, commented, hand-computed fixture — a scene stub of
  `{grid: {size: 100, distance: 1, units: "in"}}` (100 px per 1 inch) and a token with a 25.4 mm
  circular base: `radiusPx` returns **50**. Derivation, stated in the test as a comment:
  25.4 mm = 1 in; 1 in × 100 px/in = 100 px **diameter**; radius = **50 px**. Add a second case
  with a different grid `size` proving the result scales linearly. For an **oval**, assert the
  documented convention (below) explicitly rather than leaving it to inference.
- **Run:** `npm test -- base-model`
- **Expected:** **FAIL** — `radiusPx` is not exported.

### Step 15: Implement `radiusPx`

- **File:** `packages/battleframe/src/base/base-model.ts`
- **Action:** modify
- **Changes:** `radiusPx(token, scene)` = `getBase(token)` → mm → scene units → pixels, using
  `scene.grid.size` (pixels per grid space) and `scene.grid.distance` (scene units per grid
  space). **This is the only place mm leaves the model.** Requirements:
  - Read the grid **from the scene argument**, never from a `canvas` global. The scene is
    per-Scene and gridless is not guaranteed
    (`vault/foundry-systems/system-json-grid-is-a-default-not-a-lock.md`, `confidence: confirmed`
    — a user can always make a square scene in a gridless system).
  - Handle `scene.grid.units` other than `"in"`. `units` is a **free-form string**
    (`vault/foundry-systems/gridless-is-a-first-class-grid-class.md`) — a scene can say `"m"`.
    Support at minimum `"in"` and `"mm"`; for an unrecognised unit string, **throw a specific
    error naming the unit**. Do not assume inches. A silently-assumed unit is a silently wrong
    range on every scene that disagrees.
  - **Oval convention:** an oval has no single radius. Return the radius derived from
    `widthMm` and **document the choice in a comment**, noting it is an approximation SS-04 may
    need to revisit for orientation-aware base-to-base. Do **not** solve oval orientation here —
    it needs the SS-01 gate answer and belongs to SS-04.
  - Reject a `grid.size` or `grid.distance` that is zero, negative, or non-finite with a
    specific error — a divide-by-zero here yields `Infinity` or `NaN`, and `NaN` compares false
    against every threshold, so **every range check silently passes**.

### Step 16: Verify all tests pass

- **Run:** `npm test -- base-model`
- **Expected:** **PASS** — all cases: circle, oval, missing flag, zero-size, base larger than
  its token, `radiusPx` against a known scene, log-once, unknown units, bad grid.

### Step 17: Verify the build and the full suite

- **Run:** `npm run build && npm test`
- **Expected:** Both exit 0. No regression in SS-02's scaffold test.

### Step 18: Run every mechanical check

- **Run:** each command in the **Checks** table below, from the repo root.
- **Expected:** every one exits 0.

### Step 19: Commit

- **Stage:** `git add packages/battleframe/src/base/base-model.ts packages/battleframe/src/base/types.ts packages/battleframe/tests/base-model.test.ts`
- **Message:** `feat: base model — miniature bases as circles sized in millimetres`

## Acceptance Criteria

Preserved verbatim from the master spec.

- `[STRUCTURAL]` `getBase(token)` reads `token.flags.battleframe.base` shaped
  `{shape: "circle"|"oval", widthMm: number, heightMm: number}`.
- `[STRUCTURAL]` When the flag is **absent**, a circle is derived from the token footprint
  and a debug line is logged once — not per call.
- `[STRUCTURAL]` When the flag is **present**, it wins over the footprint.
- `[MECHANICAL]` `npm test -- base-model` passes with cases for: circle, oval, missing
  flag, zero-size, and a base larger than its token.
- `[STRUCTURAL]` `radiusPx(token, scene)` converts mm → pixels using the scene's grid
  size and distance, and is unit-tested against a known scene configuration.

<!-- The five criteria do not state the zero-size *behaviour* — only that a case exists. This
     phase spec resolves it to "throw a specific error, never coerce", per the master spec's
     Edge Cases disambiguation ("handles invalid input" → strict) and trade-off hierarchy #2
     (loud failure over plausible output). Flagging the inference rather than silently reading
     it into the criterion. -->

## Completeness Checklist

**`BaseShape`** — the `flags.battleframe.base` payload. Every field required; no silent
omissions.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `shape` | `"circle" \| "oval"` | required | `radiusPx` (oval convention); SS-04's base-to-base geometry. Any other value is an error |
| `widthMm` | `number` (finite, `> 0`) | required | `radiusPx`; SS-04. **Millimetres only** — never inches, never pixels |
| `heightMm` | `number` (finite, `> 0`) | required | SS-04's oval handling. Equals `widthMm` for a circle and for every derived base |

**Exports from `packages/battleframe/src/base/base-model.ts`**

| Export | Signature | Required | Used By |
|--------|-----------|----------|---------|
| `getBase` | `(token) => BaseShape` | required | SS-04 `measure.between`; `radiusPx` |
| `radiusPx` | `(token, scene) => number` | required | SS-04 — subtracts base radii from centre-to-centre |
| (test reset for the warn-once `Set`) | `() => void` | required | `base-model.test.ts` — keeps test order insignificant |

**Exports from `packages/battleframe/src/base/types.ts`**

| Export | Type | Required | Used By |
|--------|------|----------|---------|
| `BaseShape` | interface | required | SS-04's `measurement/types.ts` |
| `BaseShapeKind` | `"circle" \| "oval"` | required | `BaseShape.shape`; validation |
| Token read-stub | structural type | required | Narrow: `id`, `flags`, footprint fields only |
| Scene read-stub | structural type | required | Narrow: `grid.{size, distance, units}` only |

**Read surface — the only Foundry fields this sub-spec may touch**

| Path | Read by | Note |
|------|---------|------|
| `token.flags.battleframe.base` | `getBase` | Scope key comes from `SYSTEM_ID`, never hardcoded |
| `token.id` | warn-once guard | May be absent — must not key the `Set` on `undefined` |
| token footprint dimensions | derivation | Only when the flag is absent |
| `scene.grid.size` | `radiusPx` | Pixels per grid space. Reject `<= 0` / non-finite |
| `scene.grid.distance` | `radiusPx` | Scene units per grid space. Reject `<= 0` / non-finite |
| `scene.grid.units` | `radiusPx` | Free-form string. Support `"in"`, `"mm"`; **throw** on unrecognised |

Boundaries and exact values:

- **Unit of storage:** millimetres. **Always.** Never store inches or pixels in the base model.
- **mm ↔ in conversion:** `1 in = 25.4 mm`, exactly. One constant, commented, one place.
- `widthMm` / `heightMm`: **finite and `> 0`**. Zero, negative, `NaN`, `Infinity` → **throw a
  specific error**. Never coerce, never default.
- `shape`: exactly `"circle"` or `"oval"`. Any other value → **throw**.
- Derived base (flag absent): **always `shape: "circle"`**, `widthMm === heightMm`, inscribed in
  the footprint's **smaller** dimension.
- Debug log on derivation: **exactly once per token id**, never per call.
- `radiusPx` known-scene fixture: `grid.size = 100`, `grid.distance = 1`, `units = "in"`,
  base `widthMm = 25.4` → **exactly `50`**.
- `scene.grid.size` / `scene.grid.distance`: **finite and `> 0`** → else **throw**. Never divide
  by zero into `NaN`.
- Required test cases (the `[MECHANICAL]` criterion names five): **circle, oval, missing flag,
  zero-size, base larger than token** — plus `radiusPx` against a known scene (its own
  `[STRUCTURAL]` criterion) and log-once.
- Distances computed in this sub-spec: **zero**. That is SS-04.
- Files created: **exactly 3**.

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test -- base-model`
- **Acceptance:**
  - Full suite, no regression: `npm run build && npm test` — both exit 0.
  - `[MECHANICAL]` and `[STRUCTURAL]` — see **Checks** below; every command exits 0.
  - There is **no** `[BEHAVIORAL]` or `[HUMAN REVIEW]` criterion in this sub-spec: it is fully
    machine-checkable, which is why it can land unattended.

## Checks

Auto-generated from `[MECHANICAL]` and `[STRUCTURAL]` criteria only. There are no
`[BEHAVIORAL]` or `[HUMAN REVIEW]` criteria in this sub-spec. Each command exits 0 on pass, or
exits 1 printing a one-line summary on fail. Run from the repo root. The `-t` filters must match
the test names in **Implementation Steps**.

| Criterion | Type | Command |
|---|---|---|
| `getBase(token)` reads `token.flags.battleframe.base` shaped `{shape, widthMm, heightMm}` | STRUCTURAL | `grep -q 'flags' packages/battleframe/src/base/base-model.ts && grep -qE 'widthMm' packages/battleframe/src/base/types.ts && grep -qE 'heightMm' packages/battleframe/src/base/types.ts && grep -qE '"circle"' packages/battleframe/src/base/types.ts && grep -qE '"oval"' packages/battleframe/src/base/types.ts && npm test -- base-model -t "reads an explicit circle base from the token flag" >/dev/null 2>&1 \|\| { echo "FAIL: getBase does not read flags.battleframe.base shaped {shape,widthMm,heightMm}"; exit 1; }` |
| When the flag is absent, a circle is derived from the footprint and a debug line is logged once — not per call | STRUCTURAL | `npm test -- base-model -t "derives a circle from the token footprint when the flag is absent" >/dev/null 2>&1 && npm test -- base-model -t "debug-logs the derived-base fallback once, not per call" >/dev/null 2>&1 \|\| { echo "FAIL: missing-flag derivation or the once-only debug log is not satisfied"; exit 1; }` |
| When the flag is present, it wins over the footprint | STRUCTURAL | `npm test -- base-model -t "honours a base larger than its token footprint" >/dev/null 2>&1 && npm test -- base-model -t "reads an explicit circle base from the token flag" >/dev/null 2>&1 \|\| { echo "FAIL: the explicit base flag does not win over the token footprint"; exit 1; }` |
| `npm test -- base-model` passes with cases for circle, oval, missing flag, zero-size, and a base larger than its token | MECHANICAL | `npm test -- base-model >/dev/null 2>&1 \|\| { echo "FAIL: npm test -- base-model did not exit 0"; exit 1; }; for t in "reads an explicit circle base from the token flag" "reads an explicit oval base with unequal width and height" "derives a circle from the token footprint when the flag is absent" "rejects a zero-size base rather than coercing it" "honours a base larger than its token footprint"; do npm test -- base-model -t "$t" >/dev/null 2>&1 \|\| { echo "FAIL: required base-model case missing or failing: $t"; exit 1; }; done` |
| `radiusPx(token, scene)` converts mm → pixels using the scene's grid size and distance, and is unit-tested against a known scene configuration | STRUCTURAL | `grep -qE 'export (function \|const )radiusPx' packages/battleframe/src/base/base-model.ts \|\| { echo "FAIL: radiusPx is not exported from base-model.ts"; exit 1; }; grep -qE 'grid' packages/battleframe/src/base/base-model.ts \|\| { echo "FAIL: radiusPx does not read the scene grid"; exit 1; }; npm test -- base-model -t "converts millimetres to pixels against a known scene configuration" >/dev/null 2>&1 \|\| { echo "FAIL: radiusPx has no passing known-scene unit test"; exit 1; }` |

<!-- These checks bind test names to criteria via `-t`. If a worker renames a test, the check
     fails loudly rather than passing vacuously — which is the intended behaviour. Vitest's `-t`
     exits non-zero when a filter matches nothing only if `--passWithNoTests` is not set; SS-02
     must not set it in vitest.config.ts, or every `-t` check here silently passes. -->

## Patterns to Follow

**No existing pattern — greenfield.** BattleFrame has no codebase: only `vault/`, `spike/`,
`docs/`, and `.gitignore`. At the time this sub-spec runs, the only source files that exist are
SS-02's scaffold (`constants.ts` and the `battleframe.ts` skeleton). **There is no prior base,
geometry, or measurement code anywhere to imitate, and no precedent system has solved this** —
the master spec's Intent is explicit that base-to-base and circular bases are the gap that *is*
the product. The references below are **research notes**, not code.

- `vault/foundry-systems/gridless-is-a-first-class-grid-class.md` (`confidence: partial`):
  the grid facts `radiusPx` depends on. **`units` is a free-form string**, so `"in"` works as
  `"ft"` does — and a scene may say something else entirely, which is why an unrecognised unit
  must throw. **`distance` still defines what one grid space (pixel `size`) represents** — this
  is the mm → px conversion's whole basis. Note its `Not found / unverified`: **base-to-base
  token measurement is not in the official docs and Foundry measures centre-to-centre.** That is
  the gap; this sub-spec supplies the geometry, SS-04 supplies the distance.
- `vault/foundry-systems/system-json-grid-is-a-default-not-a-lock.md` (`confidence: confirmed`):
  **grid varies per Scene; the manifest only sets a default, and a system cannot force it.**
  Read the grid from the `scene` argument. Never assume gridless, never assume `"in"`, never
  reach for a `canvas` global.
- `vault/foundry-systems/grid-types-and-diagonal-rules-constants.md`: the grid-type constants,
  should `radiusPx` need to branch. Prefer not to — a base radius is a length in millimetres and
  should not care what grid it is drawn on.
- `vault/foundry-systems/custom-distance-measurement-has-no-clean-override-seam.md`: **read for
  context, do not act on it here.** The `cost`-callback seam is SS-04's problem, gated on SS-01.
  Referenced only to mark the boundary: **do not reference `measurePath` in this sub-spec** —
  SS-04 carries a criterion that greps for exactly that leaking outside `measurement/`.
- **Master spec, Edge Cases table** — the behavioural contract this sub-spec implements verbatim:
  *"Token has no base flag → Derive a circle from the footprint; debug-log **once**, not per
  call"*, and *"handles invalid input" → strict … Never coerce.*
- **Master spec, Intent, trade-off #2** — *loud failure over plausible output*. The zero-size and
  bad-grid cases are where this sub-spec earns it. A wrong base radius has no error and no
  oracle: just a quietly incorrect number in every game Battleframe will ever host.
- **Do not read or import from `spike/`.** `spike/README.md` is explicit: throwaway,
  unverified, "do not import from it, do not promote it, do not treat its structure as a
  scaffold." It contains no base model regardless.

## Files

Every path in this sub-spec is new. Paths prefixed `will-create:` do not yet exist on disk; the
spec-reality-gate skips existence checks for them.

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe/src/base/base-model.ts` | Create | `getBase(token)` and `radiusPx(token, scene)`. Reads `flags.battleframe.base`; derives an inscribed circle from the footprint when absent, debug-logging once per token id; strict validation with specific errors; the single mm → px conversion boundary. |
| `will-create: packages/battleframe/src/base/types.ts` | Create | `BaseShape {shape: "circle"\|"oval", widthMm, heightMm}`, `BaseShapeKind`, and the narrow structural Token/Scene read-stubs. Imported by SS-04's `measurement/types.ts`. |
| `will-create: packages/battleframe/tests/base-model.test.ts` | Create | Vitest cases: circle, oval, missing flag, zero-size, base larger than token, `radiusPx` against a known scene, log-once, unknown units, bad grid. Plain-object stubs — no Foundry runtime. |
| `packages/battleframe/src/constants.ts` | **Do not modify** | Read-only. Import `SYSTEM_ID` (the flag scope) and `LOG_PREFIX` (the debug line). Base constants belong in `base/`. |
| `packages/battleframe/src/battleframe.ts` | **Do not modify** | SS-02 owns its existence; **SS-12** rewrites it and wires this service into `game.battleframe`. Wiring here would be overwritten and would collide. |
