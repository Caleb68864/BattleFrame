---
type: phase-spec
master_spec: "docs/specs/2026-07-17-greathelm-player-layer.md"
sub_spec_number: 3
title: "Canvas highlighting — show what is touching"
date: 2026-07-17
depends_on: ["SS-01"]
---

# Sub-Spec 3: Canvas highlighting — show what is touching

Refined from [2026-07-17-greathelm-player-layer.md](../2026-07-17-greathelm-player-layer.md).

## Scope

Make contact and legality **visible on the board**, not just in a panel. When a die is
selected in the pool panel (SS-02), the knights the **session** (SS-01) reports as legal for
that die are visibly distinguished on the canvas, and base-contact pairs are indicated.

**This module decides nothing.** It is a renderer for an answer SS-01 already computed.
`legalTargetsFor(dieId)` returns, per knight, whether the die may activate it and a
machine-readable reason when it may not; `highlight.ts` reads that array and paints. It does
**not** call `measure.between`, does not import `isBaseContactDistance`, and does not contain
a distance comparison of any kind. Base-contact pairs are indicated from the session's own
reason codes (a knight whose reason is `no-enemy-in-base-contact` is not in contact; one the
session reports as a legal clash target is). Two copies of a legality predicate is how the
`=== 0` base-contact bug survived in **three** places in this package — see the
`BASE_CONTACT_TOLERANCE_PX` block in `packages/battleframe-greathelm/src/combat/clash.ts`,
which exists solely because Foundry stores token x/y as **integer pixels** and exact contact
is therefore a measure-zero event that fires essentially never.

**The v14 token-tinting API is `not found` in `vault/` at any confidence.** There is no note
on it — not `confirmed`, not `unverified`, none. This sub-spec therefore **feature-detects and
degrades**: every candidate is probed with a `typeof`/property check inside a `try`/`catch`,
nothing is asserted, and if no tinting surface resolves, highlighting is skipped, **one**
debug line is logged, and **the round remains fully playable through the panel**. No throw.
The precedent is `addRoundSceneControl` in `src/ui/round-control.ts`: it had zero vault notes
and worked in a live v14 world precisely *because* it accommodated both payload shapes and
asserted nothing. The counter-precedent is any code that assumed a shape and failed silently.

**Canvas object shapes are a known trap** (`vault/foundry-systems/real-tokens-keep-their-flags-on-the-document.md`,
`confirmed`): a canvas `Token` placeable has **no `.flags`** — flags live on
`token.document.flags` — and `placeable.width` is **PIXI bounds in pixels**, not grid units.
Test fixtures must reflect that split (see `gatherKnightsFromCanvas` in `round-control.ts`,
which merges placeable and document fields for exactly this reason). A convenient double
manufactures confidence.

**Lifecycle is load-bearing.** Every tint this module applies must be removable, and must be
removed when the die is deselected, when the round ends, and when the panel closes. Track what
was tinted and what its prior value was; restore rather than assume a default. A leaked tint
outlives the round and looks like a corrupted scene.

## Interface Contracts

### Provides

- `applyHighlight(knights, legality, options?)`: paints the legal/illegal distinction and
  base-contact indication for the currently selected die. Returns a handle/void; never throws.
- `clearHighlight()`: restores every token this module touched to its pre-highlight state.
  Idempotent — safe to call when nothing is highlighted.
- `isTintingAvailable(scope?)`: the feature-detection probe, exported so it is directly
  testable without a canvas.
- A single injectable seam for the tinting surface and the token source, so the whole module
  is unit-testable headless with plain-object doubles.

### Requires

- **From SS-01:** `createRoundSession(...)` and its `legalTargetsFor(dieId)` return shape —
  per-knight `{ knightId, legal, reason? }` where `reason` is machine-readable (e.g.
  `no-enemy-in-base-contact`). This module consumes that array and never recomputes it.

### Shared State

- The canvas tokens themselves (shared with SS-02's selection state and with SS-05's round
  lifecycle). SS-05 wires `clearHighlight()` to round end and panel close.
- No settings, no lang keys are owned by this sub-spec. Any user-visible string it introduces
  must be an i18n key present in `packages/battleframe-greathelm/lang/en.json`; the degrade
  path logs to `console.debug`, which is not user-facing and needs no key.

## Implementation Steps

### Step 1: Write failing test — legality comes from the session

- **File:** `packages/battleframe-greathelm/tests/highlight.test.ts`
- **Test name:** `applyHighlight tints only the knights the session reports as legal`
- **Asserts:** Given a stub legality array `[{knightId:"a",legal:true},{knightId:"b",legal:false,reason:"no-enemy-in-base-contact"}]`
  and a stub tinting surface, knight `a` receives the legal tint and knight `b` does not.
  The test passes **no** `measure` API at all — if the implementation needed one, it could not run.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight`
- **Expected:** FAILS — `Cannot find module '../src/ui/highlight'`.

### Step 2: Write failing test — base-contact pairs are indicated

- **File:** `packages/battleframe-greathelm/tests/highlight.test.ts`
- **Test name:** `applyHighlight indicates base-contact pairs from the session's reasons`
- **Asserts:** A knight the session reports as a legal clash target is given the
  contact indication; a knight whose reason is `no-enemy-in-base-contact` is not.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight`
- **Expected:** FAILS.

### Step 3: Write failing test — the API-absent path

- **File:** `packages/battleframe-greathelm/tests/highlight.test.ts`
- **Test name:** `applyHighlight skips silently and logs once when no tinting API resolves`
- **Asserts:** With a scope carrying **no** tinting surface, `applyHighlight` does not throw,
  returns normally, and `console.debug` is called **exactly once** across two consecutive
  calls (log once, not once per die). This is the criterion that keeps the round playable.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight`
- **Expected:** FAILS.

### Step 4: Write failing test — no leaked tints

- **File:** `packages/battleframe-greathelm/tests/highlight.test.ts`
- **Test name:** `clearHighlight restores every token it touched, and is idempotent`
- **Asserts:** After `applyHighlight` then `clearHighlight`, every stub token's tint value
  equals its pre-highlight value (captured, not assumed). A second `clearHighlight()` is a
  no-op and does not throw. A second `applyHighlight` with a different die clears the first
  die's tints before painting.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight`
- **Expected:** FAILS.

### Step 5: Write failing test — realistic token fixtures

- **File:** `packages/battleframe-greathelm/tests/highlight.test.ts`
- **Test name:** `applyHighlight reads flags from token.document, never from the placeable`
- **Asserts:** Fixture tokens carry `document.flags` and a **pixel** `document.width`, with
  **no** `.flags` on the placeable — matching
  `vault/foundry-systems/real-tokens-keep-their-flags-on-the-document.md` (`confirmed`).
  Highlighting still resolves the right knights.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight`
- **Expected:** FAILS.

### Step 6: Implement the feature-detection probe

- **File:** `packages/battleframe-greathelm/src/ui/highlight.ts`
- **Action:** create
- **Pattern:** Follow `resolveConversionPrompt` in
  `packages/battleframe/src/rulesets/orphan-check.ts` — probe each candidate with `typeof x === "function"`
  / a property check, wrap the call in `try`/`catch`, and **return `null` when nothing
  resolves**. Also follow `addRoundSceneControl` in `src/ui/round-control.ts`: accommodate
  more than one shape, assert none.
- **Changes:** `isTintingAvailable(scope)` reads `globalThis` structurally (never asserts a
  type onto it) and returns a small `{ set(token, value), get(token) }` adapter or `null`.
  Carry a module-level `hasLoggedUnavailable` flag so the debug line fires **once**, not once
  per die. Document, in a comment at the top of the file, that the vault has **no note on
  token tinting at any confidence** and that this branch set is unverified — and instruct the
  live reviewer to record the real shape in `vault/foundry-systems/` and delete the wrong
  branch. Do not leave the comment standing as an excuse.

### Step 7: Implement `applyHighlight` / `clearHighlight`

- **File:** `packages/battleframe-greathelm/src/ui/highlight.ts`
- **Action:** create
- **Pattern:** Follow the injectable-seam discipline of `runRoundFromControl` in
  `src/ui/round-control.ts` — the pure part takes its dependencies as arguments so it is
  testable without a canvas; the Foundry glue sits at the bottom of the file.
- **Changes:** `applyHighlight` takes the session's `legalTargetsFor(dieId)` output plus a
  token lookup, resolves the tinting adapter, and returns immediately (logging once) if it is
  `null`. It records each touched token's prior value in a `Map` before writing, and calls
  `clearHighlight()` first so a re-select never stacks. `clearHighlight` drains the `Map`,
  restoring prior values, and is idempotent. **No distance maths, no `measure` import, no
  `=== 0`, no `isBaseContactDistance` import** — legality and contact both arrive as data.

### Step 8: Verify tests pass

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight`
- **Expected:** PASS, including the API-absent path.

### Step 9: Verify the no-rules-logic gate

- **Run:** `[ -z "$(grep -rnE "measure\.between|=== 0" packages/battleframe-greathelm/src/ui/highlight.ts)" ]`
- **Expected:** exits 0.

### Step 10: Full build and suite

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1; echo $?`
  then `cd "$(git rev-parse --show-toplevel)" && npm test`
- **Expected:** build exits 0 (it typechecks first); the suite passes with **no regression**
  from the 218 currently-passing tests. Redirect build output to a file — piping vite to
  `tail`/`head` produces an EPIPE and a false non-zero. Never run two vitest processes at once.

### Step 11: Commit

- **Stage:** `git add packages/battleframe-greathelm/src/ui/highlight.ts packages/battleframe-greathelm/tests/highlight.test.ts`
- **Message:** `feat: canvas highlighting — show what is touching`

## Acceptance Criteria

- `[BEHAVIORAL]` With a die selected, knights the session reports as legal are visibly
  distinguished from those that are not.
- `[BEHAVIORAL]` Base-contact pairs are indicated.
- `[STRUCTURAL]` Legality comes from the session. `highlight.ts` contains no contact maths —
  `[ -z "$(grep -rnE "measure\.between|=== 0" packages/battleframe-greathelm/src/ui/highlight.ts)" ]`
  exits 0.
- `[BEHAVIORAL]` If the tinting API is unavailable, highlighting is skipped, a single debug
  line is logged, and **the round remains fully playable**. No throw.
- `[STRUCTURAL]` Highlighting is cleared when the die is deselected, when the round ends,
  and when the panel closes — no leaked tints.
- `[MECHANICAL]` `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight` passes,
  including the API-absent path.
- `[HUMAN REVIEW]` On a live v14 canvas, selecting a die visibly highlights the right
  knights. **Record the tinting API's real shape in `vault/foundry-systems/` afterwards** —
  it is currently unrecorded.

## Checks

Mechanical and structural criteria only, as runnable commands from the repo root.

| # | Criterion | Command | Passes when |
|---|---|---|---|
| C1 | No contact maths in `highlight.ts` | `[ -z "$(grep -rnE "measure\.between\|=== 0" packages/battleframe-greathelm/src/ui/highlight.ts)" ]` | exit 0 |
| C2 | Highlight tests pass, API-absent path included | `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight` | exit 0 |
| C3 | No clash-predicate import (one source of truth) | `[ -z "$(grep -rn "isBaseContactDistance\|baseContactToleranceUnits\|BASE_CONTACT_TOLERANCE_PX" packages/battleframe-greathelm/src/ui/highlight.ts)" ]` | exit 0 |
| C4 | Clear path exists and is exported | `[ -n "$(grep -rn "export function clearHighlight" packages/battleframe-greathelm/src/ui/highlight.ts)" ]` | exit 0 |
| C5 | Degrade path logs, never throws | `[ -z "$(grep -rnE "^\s*throw new" packages/battleframe-greathelm/src/ui/highlight.ts)" ]` | exit 0 |
| C6 | Build typechecks | `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1` | exit 0 |

`[ -z "$(...)" ]` is mandatory for every negative check. `grep -c X` **exits 1 when it matches
nothing** — i.e. it fails exactly when the criterion is satisfied. That inversion has already
deferred a sub-spec in this project once.

## Completeness Checklist

`HighlightLegality` — the per-knight input this module consumes (produced by SS-01, not
redefined here):

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `knightId` | `string` | required | token lookup — which placeable to tint |
| `legal` | `boolean` | required | legal vs. illegal visual distinction |
| `reason` | `string \| undefined` | optional (present iff `legal === false`) | base-contact indication; the panel renders the human text, not this module |

`TintAdapter` — the feature-detected surface:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `set` | `(token: unknown, value: unknown) => void` | required | `applyHighlight` |
| `get` | `(token: unknown) => unknown` | required | prior-value capture for `clearHighlight` |

`HighlightState` — module-internal:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `priorByToken` | `Map<string, unknown>` | required | `clearHighlight` restore |
| `hasLoggedUnavailable` | `boolean` | required | the log-**once** guarantee |

Limits and boundaries:

- **Debug lines when tinting is unavailable: exactly 1** — enforced by `hasLoggedUnavailable`
  in `highlight.ts`, asserted by the Step 3 test across two consecutive calls.
- **Throws from this module: 0** — enforced by check C5 and the API-absent test.
- **Leaked tints after `clearHighlight`: 0** — enforced by the Step 4 test, which compares
  against *captured* prior values, not an assumed default.
- **Contact tolerance: not owned here.** It is `BASE_CONTACT_TOLERANCE_PX = 2` in
  `src/combat/clash.ts` and this module must not reference, re-derive, or duplicate it.

## Verification Commands

- **Build:** `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1; echo $?`
  (redirect — do **not** pipe to `tail`/`head`; vite EPIPEs and reports a false non-zero)
- **Tests:** `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight`
- **Full suite (no regression):** `cd "$(git rev-parse --show-toplevel)" && npm test` — ≥218 passing
- **Acceptance:**
  - No contact maths: `[ -z "$(grep -rnE "measure\.between|=== 0" packages/battleframe-greathelm/src/ui/highlight.ts)" ]`
  - No duplicated predicate: `[ -z "$(grep -rn "isBaseContactDistance|BASE_CONTACT_TOLERANCE_PX" packages/battleframe-greathelm/src/ui/highlight.ts)" ]`
  - Degrade path: `npm test -- highlight` includes the API-absent case
  - `[HUMAN REVIEW]` Deploy to a live v14 world, **hard-reload** (Foundry caches system JS for
    4 hours — you will otherwise debug the old bundle), select a die, confirm the right knights
    light up, then **write the vault note** in `vault/foundry-systems/` recording the real
    tinting API shape and delete the branch that turned out to be wrong.

## Patterns to Follow

- `packages/battleframe/src/rulesets/orphan-check.ts` — `resolveConversionPrompt` is the
  canonical feature-detection precedent in this repo: it probes `DialogV2`, falls back to v1
  `Dialog`, returns `null` if neither resolves, wraps every call in `try`/`catch`, and the
  caller degrades rather than failing. Copy this structure for the tinting probe. It even
  documents *why* in a comment: "confirmed research beats recollection".
- `packages/battleframe-greathelm/src/ui/round-control.ts` — `addRoundSceneControl` shows how
  to ship against an API with **no vault note**: accommodate both payload shapes, assert
  nothing, and leave a comment naming the evidence gap and the review that closes it. Its
  `gatherKnightsFromCanvas` shows the placeable/document split (`placeable.document.flags`,
  `placeable.document.width`, `placeable.center`) that fixtures must mirror.
- `packages/battleframe-greathelm/src/combat/clash.ts` — read
  `BASE_CONTACT_TOLERANCE_PX`'s comment block once, to understand why this module must **not**
  do distance maths. It is the one definition of "touching" in the ruleset; there must not be
  a second.
- `packages/battleframe/src/applications/setup-wizard.ts` — `resolveFoundryApplicationApi`
  shows the structural, non-asserting read of `globalThis.foundry.*` this module should use.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe-greathelm/src/ui/highlight.ts` | Create | Feature-detected canvas tinting; paints the session's legality answer; clears without leaking |
| `will-create: packages/battleframe-greathelm/tests/highlight.test.ts` | Create | Headless tests: legality from session, contact pairs, API-absent degrade, clear/idempotency, realistic token fixtures |
