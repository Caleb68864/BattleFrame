---
type: phase-spec
master_spec: "docs/specs/2026-07-17-greathelm-player-layer.md"
sub_spec_number: 5
title: "Integration — kill round-robin, wire the panel"
date: 2026-07-17
depends_on: ["SS-02", "SS-03", "SS-04"]
---

# Sub-Spec 5: Integration — kill round-robin, wire the panel

Refined from [2026-07-17-greathelm-player-layer.md](../2026-07-17-greathelm-player-layer.md).

## Scope

Replace the auto-battler with the game. Three jobs, all inside
`packages/battleframe-greathelm/`:

1. **Kill round-robin.** `onRoundControlActivated` in `src/ui/round-control.ts` currently
   calls `runRoundFromControl`, which builds `roundDice` by handing every rolled face to the
   round-robin assigner and then resolves all 14 dice in one atomic `runRound` call. The
   assigner loses its last production caller. Its own doc comment already says what it is:
   *"ENGINE DEFAULT, not a rule… Round-robin is a placeholder… it is not an AI and does not
   claim to be a good one."* This is the increment it named.
2. **Wire the panel.** The scene control's click handler opens the SS-02 pool panel instead of
   resolving the round. It keeps its **GM-only** gate (checked in the handler, not just on the
   button's `visible` — a hidden button is not access control, and a round mutates shared
   state: it rolls dice, writes wounds to Actors, and writes turn order to the Combat
   document). It keeps its `!dice || !measure` and `!combat` guards and their existing
   notifications. Pool rolling, initiative, the SS-04 first-or-second prompt and the SS-04
   target prompt are wired in; `createRoundSession` (SS-01) drives the round from there; SS-03
   highlighting is attached to selection and **cleared on round end and on panel close**.
3. **Fix `notifyUser`.** See below. It is a real, live-observed bug.

**Core must stay ignorant.** `packages/battleframe/` is not touched — not one file. The whole
player layer reaches the user through Foundry's own `getSceneControlButtons` hook, which any
module may answer. If a fix appears to need a core change, **stop**: the neutrality claim is
breaking, and that gets written up in `docs/plans/`, not absorbed quietly.

### The `notifyUser` bug — fix it, do not work around it

`src/ui/round-control.ts` currently does:

```js
const notify = globalScope.ui?.notifications?.[level];
if (notify) notify(message);        // ← DETACHED — `this` is lost
```

Reading the method off the object and calling it bare **detaches the receiver**. Foundry's own
`Notifications#error()` then calls `this.notify(...)` and throws
`TypeError: Cannot read properties of undefined (reading 'notify')`. So **the error reporter
breaks while reporting an error**. This happened live: the throw replaced the real failure
message with a `TypeError` about the notification system, masking the first genuine failure
completely and costing a debugging session.

Bind it. `resolveNotifier` in `packages/battleframe/src/rulesets/orphan-check.ts` is the
in-repo precedent that already gets this right:
`return { warn: (message) => uiWarn(message) }` — a closure over the *call site*, not a bare
reference. The `[MECHANICAL]` criterion greps for `const notify = ` because that is the exact
shape of the detachment; the fix removes the binding entirely rather than renaming around it.

### Base contact: use the predicate, never re-derive it

Any contact question this integration asks goes through `isBaseContactDistance` in
`src/combat/clash.ts`. **Never `=== 0`.** Foundry stores token x/y as **integer pixels** while
a base diameter is irrational in pixels (a 32mm base on a 100px/in, 25mm grid is
125.98425196850394px), so exact contact is a **measure-zero** event: measured live, two
touching bases were 0.0001574803149606563" apart, not 0. The old `=== 0` test made a whole
round spend fourteen dice, deal zero damage and run zero courage tests. Three duplicate
`=== 0` checks existed at once — and fixing one of three would have been **worse than fixing
none**, because a board that is half-right is undebuggable. There is one predicate. Use it.

### Reachability is the point

The most important check in this spec is the bundle grep. `dist/greathelm.js` once shipped
with the entire round loop tree-shaken out — 146 lines gone, `grep runRound dist/greathelm.js`
returned **0 hits** — while **every acceptance criterion passed**, because every criterion
tested *existence* rather than *reachability*. A module that nothing on the entry point's
import chain reaches is not in the bundle, and a test suite that imports it directly will
never notice. Treat check C2 as the criterion that decides whether this sub-spec is done.
(`vite.config.ts` sets `minify: false`, so identifiers survive verbatim and the grep is sound.)

## Interface Contracts

### Provides

- A scene control that **opens the panel**. `onRoundControlActivated` no longer resolves a
  round; it gathers knights, rolls pools, resolves initiative (prompting via SS-04), creates
  the SS-01 session, and renders the SS-02 panel.
- A **bound** `notifyUser(message, level)` — the module's only notification path.
- The panel-close and round-end teardown that calls SS-03's `clearHighlight()`.

### Requires

- **From SS-01:** `createRoundSession({knights, pools, firstPlayerId})` with
  `remainingDice()`, `legalTargetsFor(dieId)`, `spendDie(dieId, knightId, choices?)`,
  `isComplete()`, `activePlayerId()`.
- **From SS-02:** the `PoolPanel` ApplicationV2 class and its render entry point.
- **From SS-03:** `applyHighlight(...)` / `clearHighlight()`.
- **From SS-04:** `promptFirstOrSecond(...)`, `promptTargetChoice(...)`, and the two registered
  world settings.
- **Existing, unchanged:** `gatherKnightsFromCanvas`, `isGM`, `sideFromDisposition`,
  `rollPool`, `determineInitiativeWithRerolls`, `resolveFirstPlayer`, `formatInches`,
  `planMovement`, `isBaseContactDistance`, `resolveDieAction`, `resolveClashTest`,
  `runCouragePhase`. **The rules engine is correct and live-verified — reuse it unchanged.**

### Shared State

- `packages/battleframe-greathelm/src/ui/round-control.ts` — modified.
- `packages/battleframe-greathelm/src/main.ts` — modified; the `init` hook already calls
  `registerRoundControl()` and `registerGreathelmSettings()`. Do not reorder
  `registerGreathelmRuleset()` — it is last on purpose, because it throws on failure and
  everything above it is independent of the system's API.
- `packages/battleframe-greathelm/dist/greathelm.js` — the artefact check C2 reads.
- `packages/battleframe/` — **untouched**, asserted by check C6.

## Implementation Steps

### Step 1: Write failing test — `notifyUser` calls the notification bound

- **File:** `packages/battleframe-greathelm/tests/round-control.test.ts`
- **Test name:** `notifyUser calls ui.notifications.error with its receiver intact`
- **Asserts:** Stub `globalThis.ui.notifications` as an object whose `error` asserts
  `this === globalThis.ui.notifications` (mirroring Foundry's own `error()`, which calls
  `this.notify(...)`). Today's detached call makes `this` `undefined` and throws. The test
  asserts the message arrives and **nothing throws**.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- round-control`
- **Expected:** FAILS with `TypeError: Cannot read properties of undefined (reading 'notify')`
  — the exact live failure.

### Step 2: Fix `notifyUser`

- **File:** `packages/battleframe-greathelm/src/ui/round-control.ts`
- **Action:** modify
- **Pattern:** Follow `resolveNotifier` in `packages/battleframe/src/rulesets/orphan-check.ts`
  — it closes over the call site (`(message) => uiWarn(message)`) instead of passing a bare
  reference. Bind or call through the owning object; do not hand a detached function anywhere.
- **Changes:** Remove the `const notify = ...; notify(message)` shape entirely. Call through
  the notifications object (or an explicitly bound closure) so `this` survives, keeping the
  `console.log` fallback when `ui.notifications` is absent. Comment *why*, naming the live
  failure — this is the bug that hid the first real one.

### Step 3: Verify the fix

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- round-control` and
  `[ -z "$(grep -rn "const notify = " packages/battleframe-greathelm/src/ui/round-control.ts)" ]`
- **Expected:** test PASSES; the grep check exits 0.

### Step 4: Write failing test — the scene control opens the panel

- **File:** `packages/battleframe-greathelm/tests/round-control.test.ts`
- **Test name:** `onRoundControlActivated opens the panel and does not resolve the round`
- **Asserts:** With a GM stub, stub dice/measure/combat and stub knights, the panel's render
  entry point is called **once** and no clash test, damage write, or courage test runs from
  the click. The auto-battler is gone.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- round-control`
- **Expected:** FAILS — the handler still resolves the round.

### Step 5: Write failing test — the GM gate survives

- **File:** `packages/battleframe-greathelm/tests/round-control.test.ts`
- **Test name:** `onRoundControlActivated refuses a non-GM and opens no panel`
- **Asserts:** With `game.user.isGM === false`, the panel is never rendered and the
  `battleframe-greathelm.controls.round.gmOnly` notification fires. A hidden button is not
  access control.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- round-control`
- **Expected:** FAILS.

### Step 6: Write failing test — a full round plays from the session

- **File:** `packages/battleframe-greathelm/tests/round-control.test.ts`
- **Test name:** `a full round resolves through the session: every die spent, courage fires`
- **Asserts:** Driving the session (headless, no Application) to `isComplete()`, every die is
  spent through explicit `spendDie` calls, clashes resolve, damage is applied to the Actor,
  and the courage phase runs. Fixtures use realistic token shapes — flags on
  `token.document.flags`, **not** on the placeable; `document.width` in **pixels**, not grid
  units (`vault/foundry-systems/real-tokens-keep-their-flags-on-the-document.md`, `confirmed`).
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- round-control`
- **Expected:** FAILS.

### Step 7: Wire the panel and retire round-robin

- **File:** `packages/battleframe-greathelm/src/ui/round-control.ts`
- **Action:** modify
- **Pattern:** Keep the file's existing shape — pure/injectable above, Foundry glue below the
  `Foundry glue` banner — and its provenance-comment discipline.
- **Changes:** `onRoundControlActivated` keeps its GM gate and its `!dice || !measure` /
  `!combat` guards and notifications, then: gather knights → compute pool sizes → roll both
  pools via `rollPool` → `determineInitiativeWithRerolls` → SS-04 `promptFirstOrSecond` feeding
  the existing `chooseOrder` seam / `resolveFirstPlayer` → `createRoundSession` → render the
  SS-02 panel. Remove the round-robin call site so the assigner has **zero production
  callers**. Contact questions go through `isBaseContactDistance` — never a local `=== 0`.
  Keep the `try`/`catch` that surfaces a failure to the GM and leaves the world usable; it now
  reports through a **bound** notifier. Persisting the order via `combat.setFlag("battleframe", "order", ...)`
  must still happen at round end — `runRound`'s own flag write only mutates a plain object and
  never reaches the database.

### Step 8: Wire highlighting and teardown

- **File:** `packages/battleframe-greathelm/src/ui/round-control.ts`
- **Action:** modify
- **Changes:** Selection → `applyHighlight` with the session's `legalTargetsFor(dieId)`;
  deselect, round end, and panel close → `clearHighlight()`. No leaked tints. Highlighting
  failing or being unavailable must not affect playability.

### Step 9: Verify the round-robin and integration gates

- **Run:** checks C1 and C2 under **Checks**, then
  `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1; echo $?`
- **Expected:** build exits 0 **before** C2 is meaningful — C2 reads `dist/greathelm.js`, so it
  must run **after** a successful build or it grades a stale artefact. This ordering is not
  optional.

### Step 10: Verify core neutrality and the full suite

- **Run:** check C6, then `cd "$(git rev-parse --show-toplevel)" && npm test`
- **Expected:** C6 exits 0; the suite passes with **≥218 tests and none regressed**. Never run
  two vitest processes concurrently.

### Step 11: Deploy check

- **Run:** `cd "$(git rev-parse --show-toplevel)" && node scripts/deploy-local.mjs --dest "$(mktemp -d)"`
- **Expected:** exits 0. `$(mktemp -d)` is a real, substituted path — do **not** run this with
  a literal `<foundry-data-dir>` placeholder. A gate once executed a `<placeholder>` verbatim
  and deferred a sub-spec.

### Step 12: Commit

- **Stage:** `git add packages/battleframe-greathelm/src/ui/round-control.ts packages/battleframe-greathelm/src/main.ts packages/battleframe-greathelm/tests/round-control.test.ts`
- **Message:** `feat: integration — kill round-robin, wire the panel`

## Acceptance Criteria

<!--
  Preserved verbatim per the master spec. Recording an observation without changing them:
  the C1/AC-1 grep names `assignDiceRoundRobin`, but the function on disk at
  packages/battleframe-greathelm/src/ui/round-control.ts:248 is `assignDiceToKnights`
  ("Assigns a player's rolled faces to that player's knights, round-robin."). As written the
  criterion matches nothing and so passes trivially, today, before any work is done. The
  criterion is preserved exactly; check C1a below adds the same test against the real
  identifier so the intent — round-robin has no production caller — is actually verified.
  Resolve the naming with the spec author rather than editing the criterion.
-->

- `[MECHANICAL]` **Round-robin is dead.**
  `[ -z "$(grep -rn "assignDiceRoundRobin" packages/battleframe-greathelm/src --include=*.ts | grep -v "export function\|^.*tests")" ]`
  exits 0 — no production caller remains.
- `[MECHANICAL]` **The player layer is in the shipped bundle** (reachability, not existence —
  the whole round loop was tree-shaken out last time and every AC still passed):
  `[ -n "$(grep -oE 'createRoundSession|pool-panel|PoolPanel' packages/battleframe-greathelm/dist/greathelm.js)" ]`
  exits 0.
- `[BEHAVIORAL]` The scene control opens the panel. The round does not resolve itself.
- `[BEHAVIORAL]` A full round can be played from the panel: every die chosen, clashes
  resolved, damage applied, courage fired at the end.
- `[MECHANICAL]` **`notifyUser` calls the notification bound.**
  `[ -z "$(grep -rn "const notify = " packages/battleframe-greathelm/src/ui/round-control.ts)" ]`
  exits 0. It currently detaches `ui.notifications[level]`, so Foundry's own `error()` throws
  on `this` — **the reporter breaks while reporting, masking the original failure.** This
  actually happened and hid the first live failure.
- `[MECHANICAL]` `[ -z "$(grep -rniE "greathelm|knight|sprint|encircle|clash" packages/battleframe/src/)" ]`
  exits 0 — core stays ignorant.
- `[MECHANICAL]` `cd "$(git rev-parse --show-toplevel)" && npm test` passes; **218 tests
  currently pass and none may regress.**
- `[HUMAN REVIEW]` A GM plays a full round in a live v14 world, choosing every die, without
  opening a console.
- `[HUMAN REVIEW]` **Did core need any change?** If yes, that is the neutrality claim
  breaking — write it up in `docs/plans/`, do not absorb it quietly.

## Checks

Mechanical and structural criteria only, as runnable commands from the repo root. **Run C2
only after a successful `npm run build`** — it grades the shipped artefact.

| # | Criterion | Command | Passes when |
|---|---|---|---|
| C1 | Round-robin is dead (verbatim) | `[ -z "$(grep -rn "assignDiceRoundRobin" packages/battleframe-greathelm/src --include=*.ts \| grep -v "export function\|^.*tests")" ]` | exit 0 |
| C1a | Round-robin is dead (real identifier — see the AC comment) | `[ -z "$(grep -rn "assignDiceToKnights" packages/battleframe-greathelm/src --include=*.ts \| grep -v "export function")" ]` | exit 0 |
| C2 | **The player layer is reachable in the shipped bundle** — the most important check in this spec | `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1 && [ -n "$(grep -oE 'createRoundSession\|pool-panel\|PoolPanel' packages/battleframe-greathelm/dist/greathelm.js)" ]` | exit 0 |
| C3 | `notifyUser` is bound — no detached reference | `[ -z "$(grep -rn "const notify = " packages/battleframe-greathelm/src/ui/round-control.ts)" ]` | exit 0 |
| C4 | No `=== 0` contact test anywhere in the package | `[ -z "$(grep -rn "=== 0" packages/battleframe-greathelm/src --include=*.ts \| grep -iE "distance\|contact")" ]` | exit 0 |
| C5 | The round no longer self-resolves from the click | `[ -z "$(grep -n "runRoundFromControl(" packages/battleframe-greathelm/src/ui/round-control.ts \| grep -v "export async function")" ]` | exit 0 |
| C6 | Core stays ignorant | `[ -z "$(grep -rniE "greathelm\|knight\|sprint\|encircle\|clash" packages/battleframe/src/)" ]` | exit 0 |
| C7 | Full suite, no regression | `cd "$(git rev-parse --show-toplevel)" && npm test` | exit 0, ≥218 passing |
| C8 | Build typechecks | `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1` | exit 0 |
| C9 | Deploy script runs | `cd "$(git rev-parse --show-toplevel)" && node scripts/deploy-local.mjs --dest "$(mktemp -d)"` | exit 0 |

Every negative check uses `[ -z "$(...)" ]`. `grep -c X returns 0` is **not** a valid gate:
grep exits 1 when it matches nothing, so that form fails exactly when the criterion is
satisfied. That inversion existed in nine criteria on this project and deferred a sub-spec.
C9 substitutes a real path via `$(mktemp -d)` — a gate once ran `--dest <foundry-data-dir>`
literally and deferred SS-12. **No `<placeholder>` may survive into a MECHANICAL command.**

## Completeness Checklist

`notifyUser` — the fixed contract:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `message` | `string` | required | `ui.notifications[level]`, called **with its receiver** |
| `level` | `"info" \| "warn" \| "error"` (default `"info"`) | optional | selects the notification method |
| fallback | `console.log(\`${MODULE_ID} | ${message}\`)` | required | when `ui.notifications` is absent (tests, early init) |

`onRoundControlActivated` — every guard that must survive the rewrite:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| GM gate | `isGM()` → notify `controls.round.gmOnly`, return | required | access control; a round mutates shared state |
| dice/measure guard | `!dice \|\| !measure` → notify `controls.round.noApi` (`error`), return | required | the bound notifier's first real caller |
| combat guard | `!combat` → notify `controls.round.noCombat` (`warn`), return | required | order persistence needs a Combat document |
| knight gather | `gatherKnightsFromCanvas()` | required | session input |
| pool sizes | `computeDicePoolSize(n, minDicePoolFloorEnabled())` per side | required | `rollPool` |
| initiative | `determineInitiativeWithRerolls(...)` | required | first-player resolution |
| first-or-second | SS-04 `promptFirstOrSecond` → `resolveFirstPlayer` | required | replaces the `"first"` engine default |
| session | `createRoundSession({knights, pools, firstPlayerId})` | required | drives the round |
| panel render | SS-02 `PoolPanel` | required | the affordance; **must be reachable in the bundle** |
| teardown | `clearHighlight()` on round end and panel close | required | no leaked tints |
| order persistence | `combat.setFlag("battleframe", "order", persistedOrder)` | required | `runRound`'s own flag write never reaches the database |
| error containment | `try`/`catch` → bound notify + `console.error` | required | a ruleset throwing must leave the world usable |

Limits and boundaries:

- **`assignDiceToKnights` production callers: exactly 0** — enforced by checks C1/C1a. The
  export and its tests may remain; the *caller* may not.
- **Files changed under `packages/battleframe/`: exactly 0** — enforced by C6. A needed core
  change is an **escalation**, not a commit.
- **Tests passing: ≥218, regressions 0** — enforced by C7.
- **Bundle identifiers required in `dist/greathelm.js`: at least one of**
  `createRoundSession`, `pool-panel`, `PoolPanel` — enforced by C2, **after** a build.
  `vite.config.ts` sets `minify: false`, so the grep is sound.
- **Sides in a round: 2** (`REQUIRED_SIDE_COUNT`); a wrong count throws `WrongSideCountError`.
- **Initiative tie re-rolls: ≤3** (`MAX_INITIATIVE_TIE_REROLLS`) then
  `InitiativeTieUnresolvedError` — an invented house rule, bounded and loud; unchanged here.
- **Base contact tolerance: `BASE_CONTACT_TOLERANCE_PX = 2`** in `src/combat/clash.ts`, applied
  **only** via `isBaseContactDistance`. Never re-derived, never `=== 0`.
- **Display rounding: 2 decimal places** (`formatInches`) — presentation only. Never feed a
  formatted number back into the rules.

## Verification Commands

- **Build:** `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1; echo $?`
  — exits 0 and typechecks (the root script runs `tsc --noEmit` first). **Redirect to a file.**
  Piping vite to `tail`/`head` closes the stream early → EPIPE → a false non-zero exit that
  looks exactly like a real build failure.
- **Tests:** `cd "$(git rev-parse --show-toplevel)" && npm test` — ≥218 passing, none
  regressed. Never run two vitest processes concurrently.
- **Deploy:** `cd "$(git rev-parse --show-toplevel)" && node scripts/deploy-local.mjs --dest "$(mktemp -d)"` — exits 0
- **Acceptance:**
  - Round-robin dead: checks C1 and C1a
  - **Reachability: check C2, run after a successful build.** This is the antidote to the
    tree-shaking failure and the single most important check in this spec.
  - Bound notifier: check C3, plus `npm test -- round-control`'s receiver assertion
  - Core neutrality: check C6
  - `[HUMAN REVIEW]` Deploy to a live v14 world and **hard-reload** — Foundry caches system JS
    for **4 hours**; without a hard reload you will debug the old bundle and conclude the wrong
    thing. Open the GREATHELM scene control: the **panel** opens and the round does **not**
    self-resolve. Confirm the pool shows 7 dice with their actions, highest face first. Select
    a die → legal knights highlight, illegal ones show why. Play **every** die. Confirm clashes
    roll, damage applies **on the token's actor** (these are unlinked tokens — `game.actors`
    will read 0 and is not the place to look), and courage fires at the end. Confirm both
    prompts appear and each toggle silences its own.
  - `[HUMAN REVIEW]` **Answer honestly: did core need any change?** If yes, write it up in
    `docs/plans/` — that is the neutrality claim breaking, and absorbing it quietly is how the
    architecture rots.

## Patterns to Follow

- `packages/battleframe/src/rulesets/orphan-check.ts` — `resolveNotifier` is the in-repo
  precedent for calling `ui.notifications.*` **without detaching the receiver**:
  `return { warn: (message) => uiWarn(message) }`. `resolveConversionPrompt` in the same file
  is the feature-detection precedent SS-04 follows and this integration must not undermine.
- `packages/battleframe-greathelm/src/ui/round-control.ts` — keep its existing structure: pure
  and injectable above the `Foundry glue` banner, glue below; the GM gate in the handler, not
  only on the button; the `try`/`catch` that surfaces failure and leaves the world usable; and
  its provenance discipline (every engine default marked as such). `addRoundSceneControl`'s
  comment is the model for documenting an unverified API and naming the review that settles it.
- `packages/battleframe-greathelm/src/combat/clash.ts` — `isBaseContactDistance` is the **one**
  definition of "touching". Read the `BASE_CONTACT_TOLERANCE_PX` comment before writing any
  contact-adjacent line.
- `packages/battleframe-greathelm/src/main.ts` — the `init` hook's ordering comment explains
  why `registerGreathelmRuleset()` is last (it throws; everything above it is independent of
  the system API). Preserve that ordering.
- `packages/battleframe/src/applications/setup-wizard.ts` — the ApplicationV2 + render
  lifecycle precedent (`createSetupWizardClass`, `openWizardIfNeeded`) the panel wiring mirrors.
- `packages/battleframe-greathelm/vite.config.ts` — `minify: false`, entry `src/main.ts`,
  output `dist/greathelm.js`. This is why the C2 bundle grep works, and why only what
  `main.ts` transitively imports is in it.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `packages/battleframe-greathelm/src/ui/round-control.ts` | Modify | Open the panel instead of resolving the round; drop the round-robin call site; wire SS-01 session, SS-03 highlighting + teardown, SS-04 prompts; **fix the detached `notifyUser`** |
| `packages/battleframe-greathelm/src/main.ts` | Modify | Keep the player layer on the entry point's import chain so it is in the shipped bundle; preserve the `init` ordering |
| `packages/battleframe-greathelm/tests/round-control.test.ts` | Modify | Add: bound-notifier receiver assertion, panel-opens-not-resolves, GM gate, a full round driven through the session with realistic token fixtures |
