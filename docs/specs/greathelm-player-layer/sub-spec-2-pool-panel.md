---
type: phase-spec
master_spec: "../2026-07-17-greathelm-player-layer.md"
sub_spec_number: 2
title: "Pool panel — click a die, click a knight"
date: 2026-07-17
depends_on: ["SS-01"]
---

# Sub-Spec 2: Pool Panel — Click a Die, Click a Knight

Refined from [2026-07-17-greathelm-player-layer.md](../2026-07-17-greathelm-player-layer.md).

## Scope

**The affordance.** An ApplicationV2 panel showing the active player's unspent dice, each labelled
with the action its face buys (`6`=Sprint, `5`=Encircle, `4`=Bash, `3`=Shift, `2`=Light,
`1`=Heavy). Click a die → the panel shows the legal knights and, for the illegal ones, the reason
→ click a knight → the die resolves → the panel re-renders **from session state**.

This is the surface that turns an auto-battler back into a game. It is where the GM makes the
decision `vault/greathelm/action-economy-per-die-not-per-model.md` (`confirmed`) says is theirs:
*"A knight can be activated multiple times in a round, or not at all. It is your choice."*

### The panel asks the session. It never computes legality.

Two copies of a predicate is how the `=== 0` base-contact bug survived in **three places** — and
fixing one of three would have been worse than fixing none. The panel:

- **must not** measure anything, compare a distance, or mention base contact;
- **must not** index `DIE_FACE_TO_ACTION` — the action comes off `SessionDie.action`, which SS-01
  already resolved via `actionForFace`;
- **must not** decide which dice are offerable — `RemainingDie.offerable` is the answer;
- **must not** cache a `LegalTargets` result. Re-derive **every render**. A selected die's only
  target can die mid-round.

A `[STRUCTURAL]` criterion greps `pool-panel.ts` for `base contact`, `=== 0`, and
`DIE_FACE_TO_ACTION[`. **That grep reads comments too.** Write "the session says it is illegal",
not "no enemy in base contact".

### Facts that already cost this project dearly

1. **i18n keys must exist.** Three keys shipped missing and rendered as raw
   `battleframe-greathelm.…` strings on the knight sheet. Every unit test passed. **Every string
   this panel renders is a key, and every key is in `lang/en.json` before you claim done.** The
   `Checks` table flattens `en.json` and verifies each referenced key resolves — run it.
2. **Acceptance criteria must test reachability, not existence.** The entire round loop was once
   tree-shaken out of `dist/greathelm.js` while every criterion passed. SS-05 owns the bundle
   grep; do not let this panel become a class nothing constructs.
3. **`npm run build` typechecks now** (the root script runs `tsc --noEmit` first). **Do not pipe
   build output into `tail`/`head`** — vite takes EPIPE and reports a false non-zero. Redirect to
   a file.
4. **Never run two vitest processes concurrently** — they race global data-model registration.
5. **A reload loses a half-played round.** Session state is in-memory (master spec, committed
   decision). This is acceptable — **and the panel must say so**. A reload silently destroying a
   half-played round would be the worst outcome available. It is a criterion, not a nicety.

### Not in this sub-spec

- **Canvas highlighting** — SS-03. The panel lists knights as text; the board tinting is separate
  and degrades independently.
- **The first-or-second and target prompts, and their settings toggles** — SS-04.
- **Wiring the scene control to open the panel, and killing round-robin** — SS-05. This sub-spec
  ships the panel class and its opener; SS-05 calls it.
- **Rolling the pools / determining initiative.** `determineInitiativeWithRerolls` already returns
  `InitiativeRoll.pools` in exactly the shape `createRoundSession` wants.

## Interface Contracts

### Provides

- `createPoolPanelClass(ApplicationV2Base?, HandlebarsApplicationMixin?)` — builds and returns the
  `PoolPanel` class. Injectable bases so it is testable with no Foundry present, exactly as
  `createKnightSheetClass` and `createSetupWizardClass` already are.
- `openPoolPanel(session: RoundSession): PoolPanelInstance` — constructs and renders the panel for
  a live session. **SS-05 calls this from the scene control.**
- `MissingApplicationV2BaseError` — thrown when `foundry.applications.api.ApplicationV2` is absent.
  Loud, named, `${MODULE_ID} | ` prefixed.
- `buildPoolPanelContext(session, selectedDieId?): PoolPanelContext` — **the pure part.** Turns
  session state into what the template renders. Exported and unit-tested headless; the panel class
  is a thin `_prepareContext` around it.
- `packages/battleframe-greathelm/templates/pool-panel.hbs` — the template, served from
  `modules/battleframe-greathelm/templates/pool-panel.hbs`.
- New `battleframe-greathelm.poolPanel.*` and `battleframe-greathelm.actions.*` keys in
  `lang/en.json`.

### Requires

- **From SS-01** (`packages/battleframe-greathelm/src/round/session.ts`): the whole contract —
  `RoundSession`, `RemainingDie`, `LegalTargets`, `LegalTarget`, `IllegalReason`, `DieOutcome`, and
  the methods `remainingDice()`, `legalTargetsFor(dieId)`, `spendDie(dieId, knightId)`,
  `discardDie(dieId)`, `isComplete()`, `activePlayerId()`, `currentFace()`, `courageOutcomes()`.
  **SS-01 must be complete and its tests green before this sub-spec starts.**
- From the existing codebase: `MODULE_ID` and the `ActionId` type from `src/constants.ts` (the
  **type**, not `DIE_FACE_TO_ACTION`); `formatInches` from `src/ui/round-control.ts` for reporting
  a movement plan — presentation-only rounding that already exists and already has a comment
  explaining why raw floats reached the notification bar as `0.0001574803149606563"`.
- `foundry.applications.api.ApplicationV2` + `HandlebarsApplicationMixin`, per
  `vault/foundry-systems/applicationv2-sheet-structure.md` (`confidence: confirmed`).

### Shared State

- **`lang/en.json` is modified by SS-02 and SS-04.** Both add keys under
  `battleframe-greathelm.*`. Merge additively; do not restructure existing `sheets`, `fields`,
  `settings` or `controls` blocks. SS-04's keys live under `settings.*` and its own prompt
  namespace, so the two additions do not collide.
- **`IllegalReason` is SS-01's vocabulary.** The panel maps it with
  `const REASON_KEYS: Record<IllegalReason, string>` — an **exhaustive** `Record`, so if SS-01 ever
  adds a reason, this file fails to typecheck rather than rendering a raw key. That type is the
  i18n bug's structural fix.
- The panel holds `selectedDieId: string | undefined` and a `RoundSession` reference. **That is
  its entire state.** Everything else is asked, every render.
- Templates and `lang/` ship by directory copy (`scripts/deploy-local.mjs` `copyPackage`), so a new
  `.hbs` needs no manifest entry — `module.json` lists `lang/en.json` already and no template
  paths.

## Implementation Steps

### Step 1: Write failing test — the context builder

- **File:** `packages/battleframe-greathelm/tests/pool-panel.test.ts`
- **Test name:** `buildPoolPanelContext lists every unspent die with its face and action`
- **Asserts:** given a fake `RoundSession` (a plain object literal with the SS-01 methods — no
  canvas, no Application), `buildPoolPanelContext(session)` returns `dice` with one entry per
  `remainingDice()` entry, each carrying `id`, `face`, `action`, `actionKey`, `offerable` and
  `available`; and `dice` is ordered highest face first.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel`
- **Expected:** FAIL — `Cannot find module '../src/ui/pool-panel'`.

### Step 2: Implement `buildPoolPanelContext`

- **File:** `packages/battleframe-greathelm/src/ui/pool-panel.ts`
- **Action:** create
- **Pattern:** Follow `evaluateWizardState` in `packages/battleframe/src/applications/setup-wizard.ts:93`
  — a pure exported function that turns state into a view model, unit-tested on its own, with the
  Application class as a thin shell over it. That separation is why the wizard is testable without
  a canvas and it is the reason this panel can satisfy `npm test -- pool-panel` in vitest's `node`
  environment.
- **Changes:**
  - `const ACTION_KEYS: Record<ActionId, string>` → `battleframe-greathelm.actions.sprint`,
    `.encircle`, `.bash`, `.shift`, `.light`, `.heavy`. An exhaustive `Record` over the union:
    adding an action breaks the build instead of shipping a raw key. **This is the only place a
    face's action becomes a name, and it reads `die.action` — never a face table.**
  - `PoolPanelContext`: `{ dice, activePlayerId, currentFace, selection, complete, volatileWarningKey, … }`
    (full field list in **Completeness Checklist** — implement every field).
  - `dice`: map `session.remainingDice()` → `{ id, face, action, actionKey: ACTION_KEYS[action], offerable, available: offerable, selected: id === selectedDieId }`.
    `available` is `offerable` **relabelled for the template, not recomputed**: a die the session
    will not offer right now (a higher face is unspent, or it is the other side's turn) renders
    visibly unavailable.
  - Every string in the context is an **i18n key**, never English. The template localizes.
- **Note:** this file must contain **no** occurrence of `base contact`, `=== 0`, or
  `DIE_FACE_TO_ACTION[` — comments included. A `[STRUCTURAL]` criterion greps for exactly those.

### Step 3: Verify

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel`
- **Expected:** PASS

### Step 4: Write failing test — selection and the session's reasons

- **File:** `packages/battleframe-greathelm/tests/pool-panel.test.ts`
- **Test names:**
  - `with no die selected the context offers no knights`
  - `with a die selected the context lists legal knights and the session's reason for the rest`
  - `the panel does not compute legality — it calls legalTargetsFor exactly once per render`
  - `every illegal reason maps to an i18n key`
- **Asserts:**
  - `buildPoolPanelContext(session)` → `selection` is `undefined`; `knights` is empty.
  - `buildPoolPanelContext(session, "a-d1")` → `selection.dieId === "a-d1"`; `knights` mirrors the
    fake session's `legalTargetsFor` answer one-for-one, and an illegal entry carries
    `reasonKey: "battleframe-greathelm.poolPanel.reason.noEnemyInBaseContact"` — **derived from
    the session's `reason` token, not from any measurement.**
  - Spy on the fake session (`vi.fn()`): `legalTargetsFor` is called on every `buildPoolPanelContext`
    invocation and its result is never reused across two calls. Change the fake's answer between
    calls and assert the context changes. **This is the "never cached" criterion.**
  - Every member of SS-01's `IllegalReason` union appears in `REASON_KEYS` — iterate the three
    tokens and assert each yields a non-`undefined` key.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel`
- **Expected:** FAIL

### Step 5: Implement selection and reason rendering

- **File:** `packages/battleframe-greathelm/src/ui/pool-panel.ts`
- **Action:** modify
- **Changes:**
  - `const REASON_KEYS: Record<IllegalReason, string>` →
    `"no-enemy-in-base-contact"` → `battleframe-greathelm.poolPanel.reason.noEnemyInBaseContact`,
    `"knight-removed"` → `…reason.knightRemoved`, `"not-your-knight"` → `…reason.notYourKnight`.
    **Exhaustive `Record` over SS-01's union — that is what makes a missing key a build failure
    instead of a live bug.** Import the type from `../round/session`.
  - When `selectedDieId` is set, call `session.legalTargetsFor(selectedDieId)` **fresh** and map
    `targets` → `{ knightId, name, legal, reasonKey }`. Never store the result on the instance.
  - `selection.anyLegal === false` → surface `canDiscard: true` and the key
    `battleframe-greathelm.poolPanel.noLegalKnight`, so a die with no legal spend can be cleared
    rather than deadlocking the round. This mirrors what `runRoundFromControl` already does today
    (`src/ui/round-control.ts:570` notifies and skips such a die) — it is **engine behaviour, not
    a rule**; say so in the comment.
  - If `legalTargetsFor` throws (a selected die vanished under a re-render), clear the selection
    and re-render. **Do not swallow it silently** — log it with the `${MODULE_ID} | ` prefix.

### Step 6: Verify

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel`
- **Expected:** PASS

### Step 7: Write failing test — the panel class

- **File:** `packages/battleframe-greathelm/tests/pool-panel.test.ts`
- **Test names:**
  - `createPoolPanelClass builds on an injected ApplicationV2 base and the Handlebars mixin`
  - `createPoolPanelClass throws MissingApplicationV2BaseError when no base is available`
  - `clicking a die selects it; clicking the same die again deselects it`
  - `clicking a knight spends the die through the session and re-renders`
  - `a knight click never resolves anything itself`
- **Asserts:**
  - With a stub base class and a stub mixin (`vi.fn(base => base)`), the returned class has
    `DEFAULT_OPTIONS.id === "battleframe-greathelm-pool-panel"`, `PARTS.form.template ===
    "modules/battleframe-greathelm/templates/pool-panel.hbs"`, and `DEFAULT_OPTIONS.actions` with
    `select-die`, `spend-die` and `discard-die`.
  - With no base and no `globalThis.foundry`, `createPoolPanelClass()` throws
    `MissingApplicationV2BaseError`.
  - `onSelectDie(event, { dataset: { dieId: "a-d1" } })` twice → selected, then `undefined`.
  - `onSpendDie(event, { dataset: { knightId: "a1" } })` with `a-d1` selected calls
    `session.spendDie("a-d1", "a1")` **exactly once**, then clears the selection and calls
    `render(true)`. The panel itself performs **no** clash, **no** damage write, **no**
    measurement.
  - `spendDie` rejecting propagates: the panel surfaces the error and does **not** swallow it. The
    session rejecting a die the panel offered is a **bug and must be loud**.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel`
- **Expected:** FAIL

### Step 8: Implement the `PoolPanel` class

- **File:** `packages/battleframe-greathelm/src/ui/pool-panel.ts`
- **Action:** modify
- **Pattern:** `packages/battleframe/src/applications/setup-wizard.ts:218` (`createSetupWizardClass`)
  is the closest in-repo precedent and it is a working ApplicationV2 — copy its shape wholesale:
  a `resolveFoundryApplicationApi()` structural read of
  `foundry.applications.api.{ApplicationV2, HandlebarsApplicationMixin}`, optional injected
  overrides for tests, `const MixedBase = mixin ? mixin(base) : base`, a named
  `Missing…BaseError` when the base is absent, `static DEFAULT_OPTIONS` (auto-merges up the chain —
  **no `mergeObject`**, per the vault note), `static PARTS`, an async `_prepareContext` that calls
  `super` when present, `DEFAULT_OPTIONS.actions` wired to prototype handlers reading
  `target.dataset`, and a `rerender()` guarded by `typeof self.render === "function"`.
  `packages/battleframe-greathelm/src/sheets/knight-sheet.ts:71` is the same pattern inside this
  package, with the `modules/${MODULE_ID}/templates/…` path form to copy.
- **Changes:**
  - `static DEFAULT_OPTIONS`: `id: \`${MODULE_ID}-pool-panel\``, `classes: [MODULE_ID, "pool-panel"]`,
    `window: { title: "battleframe-greathelm.poolPanel.title" }`, `position: { width: 420, height: 520 }`,
    `actions: { "select-die": …, "spend-die": …, "discard-die": … }`.
  - `static PARTS = { form: { template: \`modules/${MODULE_ID}/templates/pool-panel.hbs\` } }`.
    Interpolate `MODULE_ID`; do not hardcode the id.
  - `_prepareContext` → `Object.assign(await super._prepareContext?.(options) ?? {}, buildPoolPanelContext(this.session, this.selectedDieId))`.
    **All the thinking is in the pure function; the class is glue.**
  - Handlers read `target.dataset.dieId` / `target.dataset.knightId`, call the session, clear the
    selection, `rerender()`. On completion, report `courageOutcomes()` and keep the panel open —
    the GM needs to see the round ended.
  - **v14 hygiene, per `vault/foundry-systems/applicationv2-sheet-structure.md`:** no `bringToTop`
    (removed in v14 — `bringToFront`), no manual `mergeObject` of `DEFAULT_OPTIONS`, no
    `activateListeners` (use `actions` / `_onRender`). `PARTS` returns exactly one top-level
    element per part, wrapped in `options.tag` — `div` for `ApplicationV2`.
  - `openPoolPanel(session)`: construct and `render(true)`. Follow `openWizardIfNeeded`
    (`setup-wizard.ts:320`) for the construct-and-render shape.

### Step 9: Verify

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel`
- **Expected:** PASS

### Step 10: Write the template

- **File:** `packages/battleframe-greathelm/templates/pool-panel.hbs`
- **Action:** create
- **Pattern:** `packages/battleframe-greathelm/templates/knight-sheet.hbs` — a leading `{{!-- --}}`
  comment naming the vault note behind the design, `{{localize "…"}}` for **every** visible string,
  and `class="battleframe-greathelm …"`.
- **Changes:**
  - A single top-level `<div class="battleframe-greathelm pool-panel">` (ApplicationV2 wraps parts
    in `options.tag`; one part → one top-level element).
  - Dice list: `{{#each dice}}` → `<button type="button" data-action="select-die" data-die-id="{{id}}" class="pool-panel__die{{#unless available}} pool-panel__die--unavailable{{/unless}}{{#if selected}} pool-panel__die--selected{{/if}}" {{#unless available}}disabled{{/unless}}>{{face}} — {{localize actionKey}}</button>`.
  - Knights list, only `{{#if selection}}`: legal ones are `data-action="spend-die"
    data-knight-id="{{knightId}}"` buttons; illegal ones are disabled and render
    `{{localize reasonKey}}` — **the session's reason, as human text**.
  - `{{#if selection.canDiscard}}` → a `data-action="discard-die"` button labelled
    `{{localize "battleframe-greathelm.poolPanel.noLegalKnight"}}`.
  - A persistent, always-visible warning — not a tooltip, not behind a hover:
    `<p class="pool-panel__warning">{{localize "battleframe-greathelm.poolPanel.volatile"}}</p>`.
    **The reload warning must be readable without interacting with anything.**
  - **Ship no rules text.** The panel renders state and action names — not how Bash works. Mechanics
    only; the rulebook is not ours to redistribute.

### Step 11: Add the i18n keys

- **File:** `packages/battleframe-greathelm/lang/en.json`
- **Action:** modify
- **Pattern:** the existing nested shape — `battleframe-greathelm` → `sheets` / `fields` /
  `settings` / `controls`. Add `poolPanel` and `actions` siblings. Do not touch what is there.
- **Changes:** every key in the **Completeness Checklist**'s i18n table. **Add these before you
  claim done and run the i18n check** — three keys shipped missing last time, rendered as raw keys
  on the knight sheet, and every unit test passed.
- **Every key must be written as a quoted string literal** — `"battleframe-greathelm.poolPanel.title"`,
  `{{localize "battleframe-greathelm.poolPanel.volatile"}}`. The `Checks` command flattens
  `en.json` and matches quoted `battleframe-greathelm.*` literals in `pool-panel.ts` and
  `pool-panel.hbs`. **A key assembled at runtime (`` `…reason.${reason}` ``) is invisible to that
  check** — which is precisely how three keys shipped missing. That is why `REASON_KEYS` and
  `ACTION_KEYS` are literal maps rather than template strings: greppable by the gate, exhaustive
  by the compiler.
- **Verify:** run the `Every i18n key referenced by this sub-spec exists` command in **Checks**.
  It is quoted-literal-scoped on purpose, so a doc comment mentioning the
  `battleframe-greathelm.knight` Actor subtype (which is **not** an i18n key) cannot false-fail it.

### Step 12: Verify the whole sub-spec

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel`
- **Expected:** PASS
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm run build > /tmp/ss02-build.log 2>&1; echo $?`
- **Expected:** `0`. **Never pipe build output into `tail`/`head`.**
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test`
- **Expected:** PASS, ≥218 tests, none regressed. Run it **alone**.
- **Run:** every command in **Checks**.
- **Expected:** all exit `0`.

### Step 13: Commit

- **Stage:** `git add packages/battleframe-greathelm/src/ui/pool-panel.ts packages/battleframe-greathelm/templates/pool-panel.hbs packages/battleframe-greathelm/tests/pool-panel.test.ts packages/battleframe-greathelm/lang/en.json`
- **Message:** `feat: pool panel — click a die, click a knight`

## Acceptance Criteria

<!--
  Verbatim from docs/specs/2026-07-17-greathelm-player-layer.md, SS-02.
  Preserved exactly, including the `[TYPE]` tags and the inline commands.
-->

- `[STRUCTURAL]` Uses ApplicationV2 via `foundry.applications.api.ApplicationV2` +
  `HandlebarsApplicationMixin`, per `vault/foundry-systems/applicationv2-sheet-structure.md`.
- `[BEHAVIORAL]` Shows each unspent die with its face and action name. Dice the session will
  not currently offer (a higher face is unspent) are visibly unavailable.
- `[BEHAVIORAL]` Clicking a die selects it; clicking it again deselects.
- `[BEHAVIORAL]` With a die selected, the panel shows each legal knight and, for illegal
  ones, **the session's reason** rendered as human text.
- `[BEHAVIORAL]` Clicking a knight spends the die and the panel re-renders from session
  state — **legality is re-derived on every render, never cached**.
- `[STRUCTURAL]` **Every string is an i18n key present in `lang/en.json`.** Verified:
  every `battleframe-greathelm.*` key referenced by this sub-spec's files exists in the lang
  file. (Three keys shipped missing last time and rendered as raw keys on the knight sheet.)
- `[BEHAVIORAL]` The panel states plainly that a reload loses a half-played round.
- `[MECHANICAL]` `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel` passes.
- `[STRUCTURAL]` The panel contains **no rules logic** — verified by
  `[ -z "$(grep -rnE "base contact|=== 0|DIE_FACE_TO_ACTION\\[" packages/battleframe-greathelm/src/ui/pool-panel.ts)" ]`
  exiting 0. It asks the session.

## Completeness Checklist

**`PoolPanelContext`** — every field must be implemented; no silent omissions.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `dice` | `readonly PoolPanelDie[]` | required | the dice list in `pool-panel.hbs` |
| `activePlayerId` | `string \| undefined` | required — `undefined` when complete | the "whose turn" line |
| `currentFace` | `DieFace \| undefined` | required — `undefined` when complete | the face-step header |
| `selection` | `PoolPanelSelection \| undefined` | required — `undefined` when no die is selected | the knights list |
| `knights` | `readonly PoolPanelKnight[]` | required — empty when nothing is selected | the knights list |
| `complete` | `boolean` | required | the end-of-round report |
| `courage` | `readonly { knightId, roll, difficulty, passed }[]` | required — empty until complete | the end-of-round report |
| `volatileWarningKey` | `string` | required — always `battleframe-greathelm.poolPanel.volatile` | the always-visible reload warning |

**`PoolPanelDie`**

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `id` | `string` | required | `data-die-id`; the `select-die` action |
| `face` | `DieFace` (1–6) | required | rendered directly |
| `action` | `ActionId` | required | `ACTION_KEYS` lookup |
| `actionKey` | `string` | required | `{{localize actionKey}}` |
| `offerable` | `boolean` | required — **copied from `RemainingDie.offerable`, never recomputed** | `available` |
| `available` | `boolean` | required — equals `offerable` | the `--unavailable` class and `disabled` |
| `selected` | `boolean` | required | the `--selected` class |

**`PoolPanelSelection`**

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `dieId` | `string` | required | correlates the render to the click |
| `face` | `DieFace` | required | the knights-list header |
| `actionKey` | `string` | required | the knights-list header |
| `anyLegal` | `boolean` | required — from `LegalTargets.anyLegal` | gates `canDiscard` |
| `canDiscard` | `boolean` | required — `!anyLegal` | the `discard-die` button |

**`PoolPanelKnight`**

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `knightId` | `string` | required | `data-knight-id`; the `spend-die` action |
| `name` | `string` | required — falls back to `knightId` | the button label |
| `legal` | `boolean` | required — **from `LegalTarget.legal`, never computed** | enabled/disabled |
| `reasonKey` | `string \| undefined` | required — present iff `legal === false` | `{{localize reasonKey}}` |

**i18n keys — all of these must exist in `lang/en.json` under `battleframe-greathelm`.**

| Key | Purpose |
|---|---|
| `poolPanel.title` | window title |
| `poolPanel.volatile` | **"A reload loses a half-played round."** Always visible. |
| `poolPanel.dice` | dice-list heading |
| `poolPanel.knights` | knights-list heading |
| `poolPanel.selectDie` | prompt shown when nothing is selected |
| `poolPanel.unavailable` | why a die is not offerable (a higher face is unspent, or it is the other side's turn) |
| `poolPanel.activePlayer` | "whose turn" line |
| `poolPanel.noLegalKnight` | the `discard-die` button — no knight can legally take this die |
| `poolPanel.complete` | end-of-round line |
| `poolPanel.courage` | courage-report heading |
| `poolPanel.reason.noEnemyInBaseContact` | `IllegalReason` `no-enemy-in-base-contact` |
| `poolPanel.reason.knightRemoved` | `IllegalReason` `knight-removed` |
| `poolPanel.reason.notYourKnight` | `IllegalReason` `not-your-knight` |
| `actions.sprint` | face `6` |
| `actions.encircle` | face `5` |
| `actions.bash` | face `4` |
| `actions.shift` | face `3` |
| `actions.light` | face `2` |
| `actions.heavy` | face `1` |

**Limits and boundaries**

- Die faces rendered: `1..6` — the panel renders whatever `SessionDie.face` holds and validates
  nothing; `DieFace` is the guarantee.
- `ACTION_KEYS`: exactly `6` entries — `Record<ActionId, string>`, exhaustive over the union.
- `REASON_KEYS`: exactly `3` entries — `Record<IllegalReason, string>`, exhaustive over SS-01's
  union. **Both are exhaustive `Record`s so that a new member breaks the build, not the world.**
- Panel instance state: exactly **two** fields — `session` and `selectedDieId`. Anything else
  cached is a bug against the "never cached" criterion.
- `session.legalTargetsFor` calls per render: exactly **1** when a die is selected, **0** when not.
- New numeric literals about the rules: **zero**. Window `position` px are chrome, not rules.

## Verification Commands

- **Build:** `cd "$(git rev-parse --show-toplevel)" && npm run build > /tmp/ss02-build.log 2>&1; echo $?`
  → `0`. Typechecks (the root script runs `tsc --noEmit` first). **Never pipe into `tail`/`head`.**
- **Tests:** `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel` → passes.
- **Full suite:** `cd "$(git rev-parse --show-toplevel)" && npm test` → ≥218 tests, none regressed.
  Run alone; never two vitest processes at once.
- **Acceptance:** each `[MECHANICAL]` / `[STRUCTURAL]` criterion has an exact command in
  **Checks** below. `[BEHAVIORAL]` criteria are asserted by the named tests in
  `tests/pool-panel.test.ts` (Steps 1, 4, 7), and finally by SS-05's `[HUMAN REVIEW]`: a GM plays a
  full round from the panel in a live v14 world without opening a console. **Hard-reload after
  deploying** — Foundry caches system JS for 4 hours and you will otherwise debug the old bundle.

## Checks

Generated from `[MECHANICAL]` and `[STRUCTURAL]` criteria **only**. `[BEHAVIORAL]` criteria are
excluded by design — they are asserted by `tests/pool-panel.test.ts`, which the
`npm test -- pool-panel` check runs, and by SS-05's live human review. Each command exits `0` on
pass, `1` with a one-line summary on fail. Run from the repository root.

| Criterion | Type | Command |
|---|---|---|
| The panel is ApplicationV2 + HandlebarsApplicationMixin | STRUCTURAL | `f=packages/battleframe-greathelm/src/ui/pool-panel.ts; [ -f "$f" ] \|\| { echo "FAIL: $f missing"; exit 1; }; grep -q "foundry.applications.api.ApplicationV2\|applications?.api?.ApplicationV2" "$f" 2>/dev/null \|\| { echo "FAIL: $f does not resolve foundry.applications.api.ApplicationV2"; exit 1; }; grep -q "HandlebarsApplicationMixin" "$f" 2>/dev/null \|\| { echo "FAIL: $f does not use HandlebarsApplicationMixin"; exit 1; }; exit 0` |
| No ApplicationV1 idioms | STRUCTURAL | `f=packages/battleframe-greathelm/src/ui/pool-panel.ts; [ -z "$(grep -nE 'bringToTop\|activateListeners\|mergeObject' "$f")" ] \|\| { echo "FAIL: $f uses a removed ApplicationV1 idiom (bringToTop/activateListeners/mergeObject) — DEFAULT_OPTIONS auto-merges in V2"; exit 1; }; exit 0` |
| The panel contains no rules logic | STRUCTURAL | `[ -z "$(grep -rnE 'base contact\|=== 0\|DIE_FACE_TO_ACTION\[' packages/battleframe-greathelm/src/ui/pool-panel.ts)" ] \|\| { echo "FAIL: pool-panel.ts contains rules logic (base contact / === 0 / DIE_FACE_TO_ACTION[) — it must ask the session"; exit 1; }; exit 0` |
| The panel asks the session for legality | STRUCTURAL | `f=packages/battleframe-greathelm/src/ui/pool-panel.ts; for m in legalTargetsFor remainingDice spendDie; do grep -q "$m" "$f" 2>/dev/null \|\| { echo "FAIL: pool-panel.ts never calls session.$m — legality must come from the session"; exit 1; }; done; exit 0` |
| The panel never measures or re-derives contact | STRUCTURAL | `[ -z "$(grep -rnE 'measure\.between\|isInBaseContact\|isBaseContactDistance\|nearestEnemy' packages/battleframe-greathelm/src/ui/pool-panel.ts)" ] \|\| { echo "FAIL: pool-panel.ts measures the board — two copies of a predicate is how the === 0 bug survived in three places"; exit 1; }; exit 0` |
| Illegal reasons map exhaustively to i18n keys | STRUCTURAL | `f=packages/battleframe-greathelm/src/ui/pool-panel.ts; grep -q "Record<IllegalReason" "$f" 2>/dev/null \|\| { echo "FAIL: pool-panel.ts has no Record<IllegalReason, string> — a new reason must break the build, not ship a raw key"; exit 1; }; exit 0` |
| Action names map exhaustively to i18n keys | STRUCTURAL | `f=packages/battleframe-greathelm/src/ui/pool-panel.ts; grep -q "Record<ActionId" "$f" 2>/dev/null \|\| { echo "FAIL: pool-panel.ts has no Record<ActionId, string> — the action name must come from an exhaustive map over die.action"; exit 1; }; exit 0` |
| The template exists and is referenced | STRUCTURAL | `[ -f packages/battleframe-greathelm/templates/pool-panel.hbs ] \|\| { echo "FAIL: packages/battleframe-greathelm/templates/pool-panel.hbs missing"; exit 1; }; grep -q "pool-panel.hbs" packages/battleframe-greathelm/src/ui/pool-panel.ts 2>/dev/null \|\| { echo "FAIL: pool-panel.ts does not reference templates/pool-panel.hbs"; exit 1; }; exit 0` |
| The template hardcodes no English | STRUCTURAL | `[ -z "$(grep -nE '>[[:space:]]*[A-Za-z]{3,}' packages/battleframe-greathelm/templates/pool-panel.hbs \| grep -v 'localize' \| grep -v '{{!--')" ] \|\| { echo "FAIL: pool-panel.hbs renders a bare string — every visible string must be a {{localize}} key"; exit 1; }; exit 0` |
| Every i18n key referenced by this sub-spec exists in `lang/en.json` | STRUCTURAL | `node -e "const fs=require('fs');const lang=JSON.parse(fs.readFileSync('packages/battleframe-greathelm/lang/en.json','utf8'));const flat=new Set();(function w(o,p){for(const [k,v] of Object.entries(o)){const key=p?p+'.'+k:k;if(v&&typeof v==='object')w(v,key);else flat.add(key);}})(lang,'');const missing=[];for(const f of process.argv.slice(1)){const src=fs.readFileSync(f,'utf8');for(const m of src.matchAll(/[\"']battleframe-greathelm\.[A-Za-z0-9_.-]+[\"']/g)){const key=m[0].slice(1,-1);if(!flat.has(key))missing.push(f+': '+key);}}if(missing.length){console.log('FAIL: missing i18n keys: '+missing.join(', '));process.exit(1);}" packages/battleframe-greathelm/src/ui/pool-panel.ts packages/battleframe-greathelm/templates/pool-panel.hbs \|\| exit 1; exit 0` |
| The reload warning is present and always rendered | STRUCTURAL | `grep -q "poolPanel.volatile" packages/battleframe-greathelm/templates/pool-panel.hbs 2>/dev/null \|\| { echo "FAIL: pool-panel.hbs does not render battleframe-greathelm.poolPanel.volatile — a reload losing a half-played round must be stated, not discovered"; exit 1; }; [ -z "$(grep -nE '\{\{#if\}\}.*poolPanel.volatile' packages/battleframe-greathelm/templates/pool-panel.hbs)" ] \|\| { echo "FAIL: the reload warning is conditional — it must always be visible"; exit 1; }; exit 0` |
| `npm test -- pool-panel` passes | MECHANICAL | `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel > /tmp/ss02-test.log 2>&1 \|\| { echo "FAIL: npm test -- pool-panel did not pass (see /tmp/ss02-test.log)"; exit 1; }; exit 0` |
| The panel test runs headless — no canvas, no real Application | MECHANICAL | `f=packages/battleframe-greathelm/tests/pool-panel.test.ts; [ -f "$f" ] \|\| { echo "FAIL: $f missing"; exit 1; }; grep -q "createPoolPanelClass\|buildPoolPanelContext" "$f" 2>/dev/null \|\| { echo "FAIL: $f does not exercise the injectable panel seams"; exit 1; }; exit 0` |
| Core requires zero changes | MECHANICAL | `[ -z "$(grep -rniE 'greathelm\|knight\|sprint\|encircle\|clash' packages/battleframe/src/)" ] \|\| { echo "FAIL: packages/battleframe/src references a GREATHELM concept — core neutrality is breaking, stop and escalate"; exit 1; }; exit 0` |
| `npm run build` exits 0 (typechecks) | MECHANICAL | `cd "$(git rev-parse --show-toplevel)" && npm run build > /tmp/ss02-build.log 2>&1 \|\| { echo "FAIL: npm run build did not exit 0 (see /tmp/ss02-build.log)"; exit 1; }; exit 0` |
| No test regressed | MECHANICAL | `cd "$(git rev-parse --show-toplevel)" && npm test > /tmp/ss02-full.log 2>&1 \|\| { echo "FAIL: the full suite did not pass (see /tmp/ss02-full.log) — 218 tests passed before this sub-spec and none may regress"; exit 1; }; exit 0` |

## Patterns to Follow

**There is a real, live-verified codebase.** This is not greenfield. Every reference below is a
file in this repo.

- `packages/battleframe/src/applications/setup-wizard.ts` — **the closest working ApplicationV2 in
  the repo.** `createSetupWizardClass` (line 218) is the exact shape to copy: structural resolution
  of `foundry.applications.api.{ApplicationV2, HandlebarsApplicationMixin}` (line 181), injectable
  bases for tests, `MissingApplicationV2BaseError` (line 202), `DEFAULT_OPTIONS` with an `actions`
  map wired to prototype handlers (line 233), `PARTS` (line 245), an async `_prepareContext` that
  calls `super` when it exists (line 249), a guarded `rerender()` (line 262), and dataset-driven
  handlers (line 269). `evaluateWizardState` (line 93) is the pure-view-model split that makes the
  whole thing testable in vitest's `node` environment — **do the same and the panel's tests need no
  canvas.** Its comment on `onSelectPrimary` is the load-bearing lesson: *"No conflict guard here
  on purpose -- activatePrimarySelection owns the refusal, so it holds for every caller and not
  just this button."* Same here: **the session owns legality, so it holds for every caller and not
  just this button.**
- `packages/battleframe-greathelm/src/sheets/knight-sheet.ts:71` — the same pattern inside this
  package: `createKnightSheetClass`, the `modules/${MODULE_ID}/templates/…` path form, `classes:
  [MODULE_ID, …]`, and the `MixedBase` line.
- `packages/battleframe-greathelm/templates/knight-sheet.hbs` — template style: a leading
  `{{!-- --}}` comment naming its vault note, `{{localize}}` on **every** visible string, no rules
  text. It renders state, not rules. So does this panel.
- `packages/battleframe-greathelm/lang/en.json` — the nested key shape to extend. Add `poolPanel`
  and `actions` as siblings of `sheets` / `fields` / `settings` / `controls`.
- `packages/battleframe-greathelm/src/ui/round-control.ts` — `formatInches` (line 416) for
  reporting a movement plan, and its comment on why (a raw float reached the notification bar as
  `sprint up to 0.0001574803149606563"`). `notifyUser` (line 733) is the **counter**-example: it
  detaches `ui.notifications[level]` and therefore throws while reporting an error, masking the
  original failure. **SS-05 fixes it; do not copy it.** If this panel notifies, call the
  notification **bound**.
- `packages/battleframe-greathelm/src/round/session.ts` (SS-01) — the contract. Read it before
  writing a line of this panel. If you want a piece of information it does not expose, **ask SS-01
  for it; do not compute it here.**
- `vault/foundry-systems/applicationv2-sheet-structure.md` (`confidence: confirmed`) — the class
  stack, `DEFAULT_OPTIONS` auto-merge, `PARTS` returning one top-level element wrapped in
  `options.tag`, `_prepareContext` returning **only** what the template sees, and `actions` over
  `activateListeners`. Read the gotcha: `{{system.x}}` reads the *context* while `name="system.x"`
  writes the *document path* — they merely tend to coincide.
- `vault/foundry-systems/v14-breaking-changes-that-matter.md` — check before using any Application
  API this note does not cover.
- `vault/greathelm/action-economy-per-die-not-per-model.md` (`confirmed`) — why this panel exists.
  **No activation limit**; one knight may take every action in a round. The panel must never
  disable a knight because it already acted.

## Files

Prefix any path a sub-spec will CREATE (not yet present on disk) with `will-create:`.

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe-greathelm/src/ui/pool-panel.ts` | Create | The ApplicationV2 panel plus the pure `buildPoolPanelContext` view model and `openPoolPanel`. Contains no rules logic. |
| `will-create: packages/battleframe-greathelm/templates/pool-panel.hbs` | Create | The panel template. Every string a `{{localize}}` key; the reload warning always visible. |
| `will-create: packages/battleframe-greathelm/tests/pool-panel.test.ts` | Create | Headless tests: context building, selection/deselection, reasons rendered from the session, spend → re-render, legality never cached. |
| `packages/battleframe-greathelm/lang/en.json` | Modify | Add the `poolPanel.*` and `actions.*` keys. Additive only — SS-04 also edits this file. |

**Do not modify** `src/round/session.ts` (SS-01's, and its contract), `src/ui/round-control.ts`
(SS-05's pathspec — including `notifyUser`, tempting as it is), `src/main.ts` (SS-05 wires the
panel), or **anything** under `packages/battleframe/`. A core change is the master spec's
neutrality escalation trigger: **stop and record it.**

## Unresolved — escalate, do not decide alone

<!--
  Raised during phase-spec refinement. None of these changes an acceptance criterion.
-->

1. **Open question 1 from the design doc is unanswered:** does an ApplicationV2 panel re-render
   cleanly on every session change, or does it need a targeted part update? Recorded as **perf
   only — the pool is 7 items**. Build the full re-render; do not pre-optimise. If it flickers in
   the live world, that is an SS-05 human-review finding, not a reason to cache legality here.
2. **`discardDie` and `canDiscard` come from SS-01's extended surface**, not from a criterion in
   this sub-spec. They exist so a die with no legal knight cannot deadlock the round below
   `isComplete()`. If SS-01 lands without `discardDie`, drop `canDiscard` and
   `poolPanel.noLegalKnight` and raise the deadlock — do not invent a discard path in the panel.
3. **Whether the panel should show the *other* side's dice at all.** The master spec says "the
   active player's unspent dice"; the design doc's interaction step 2 agrees. But the 6→1 rule is
   global — a die is unavailable because the *opponent* holds a higher face, and a panel that hides
   the opponent's pool cannot explain that. This phase spec renders **all** unspent dice with
   `available` marking the offerable ones, which satisfies "shows each unspent die … visibly
   unavailable" literally and makes the reason legible. Flagged in case the intent was
   active-side-only.
</content>
</invoke>
