---
type: phase-spec
master_spec: "docs/specs/2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 9
title: "Setup wizard"
date: 2026-07-16
depends_on: ["SS-05"]
---

# Sub-Spec 9: Setup Wizard

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

A first-launch ApplicationV2 wizard that finds registered rulesets, takes exactly one
primary, and **refuses to leave the world ambiguous** — plus the three world settings it
reads and writes.

**The zero-ruleset case is a real product state, not an error.** This is the sub-spec's most
important framing and the master spec's binding SS-09 decision: *"Battleframe with no ruleset
is a table and a ruler. Say so plainly."* Do not render an error, an empty list, a red
banner, or a spinner. Explain what Battleframe is — an engine that measures correctly — and
what a ruleset adds. Requirement 10 makes this a supported configuration, not a degraded one:
*"Battleframe works with **zero** optional third-party modules installed."* A user who
installs the system before any ruleset must not conclude it is broken.

**Two `primary: true` rulesets is the "ruleset conflict" case**, defined precisely in the
master spec's Edge Cases disambiguations: *two `primary: true` rulesets active* — **not** a
version mismatch, which SS-05 already rejects at registration. Per SS-05, both register
successfully; **the conflict surfaces here, at activation.** The wizard must warn, **name
both**, offer to disable one, and **refuse to activate either** until resolved. Not "pick the
first". Not "pick the newest". Refuse — this is the master spec's *"loud failure over
plausible output"* applied to a state where any automatic choice would silently pick someone's
game for them.

**GM-only. Never opens for a player.** The Edge Cases table is explicit: *"Player opens a
GM-only wizard | Never opens for a player."* Gate on `game.user.isGM` before render, not
inside it.

**Greenfield.** All five files are new. There is no existing Battleframe code to match.

**Namespace note:** the wizard calls `activateRuleset(id)` on the SS-05 registry via
`game.battleframe`, but **SS-12 owns and constructs that namespace**. SS-09 exports the
wizard class and a settings-registration function; SS-12 wires them. See Requires.

<!-- Spec gap, non-blocking: master SS-09 requires a `defaultGridUnit` world setting but
     does not name its type, default, or consumer. This phase spec commits to
     String / default "in" / consumed by scene creation defaults, consistent with the
     master's committed grid default `{type: 0, distance: 1, units: "in"}`. An addition,
     not a change — the criterion is unimplementable without it. -->

<!-- Criterion note, not a change: "[BEHAVIORAL] Selecting a primary writes the
     activeRulesetId world setting and calls activateRuleset(id)." Order matters and the
     criterion does not state it. Call activateRuleset FIRST and write the setting only on
     success — writing the setting first leaves a world pointing at a ruleset that failed to
     activate, which is exactly the silent-wrongness the master spec ranks second in its
     trade-off hierarchy. Preserved verbatim; flagged rather than rewritten. -->

## Interface Contracts

### Provides

- `SetupWizard` — ApplicationV2 class (`ActorSheetV2`'s siblings:
  `foundry.applications.api.ApplicationV2` + `HandlebarsApplicationMixin`; this is **not** a
  document sheet). Exported for SS-12 to open at `ready`.
- `registerSettings()` — registers the three world settings and the wizard's settings menu.
  Called by SS-12 at `init`.
- World setting `activeRulesetId`.
- World setting `setupCompleted`.
- World setting `defaultGridUnit`.
- A settings menu entry that **reopens the wizard after first launch**.
- `packages/battleframe/templates/setup-wizard.hbs` and
  `packages/battleframe/styles/battleframe.css`.
- Consumed by: SS-12 (init wiring, and the criterion *"With **no** ruleset installed at all,
  the system still loads, the wizard explains itself, and the ruler measures"*); SS-10
  (*"The module registers via `game.battleframe.api.registerRuleset` with `primary: true` and
  appears in the setup wizard"*).

### Requires

- **From SS-05:** the registry and public API —
  `packages/battleframe/src/rulesets/registry.ts`, `types.ts`, and
  `packages/battleframe/src/api/index.ts`. Specifically:
  - the `RulesetDefinition` shape
    `{id, title, version, battleframeCompatibility: {minimum, verified}, primary: boolean}` —
    the wizard lists **title, version, and compatibility**, all three of which come from here;
  - a way to enumerate registered rulesets;
  - `activateRuleset(id)` and `getActiveRuleset()`. SS-05's criterion is binding:
    *"Registration never activates. `getActiveRuleset()` returns null until
    `activateRuleset(id)` is called."* The wizard is the thing that calls it.
  - SS-05's hooks `battleframe.rulesetRegistered` / `battleframe.rulesetActivated`.
- **From SS-02 (transitively):** the monorepo scaffold, `system.json`,
  `packages/battleframe/lang/en.json`, and `constants.ts`.
- **From SS-12 (namespace owner):** `game.battleframe` is **constructed by SS-12**, not here.
  SS-09 must not create or mutate it. Export the wizard and `registerSettings`; SS-12 attaches
  and calls them in `init` order.
- **From Foundry v14 runtime:** `game.settings.register`, `game.settings.registerMenu`,
  `game.user.isGM`, `foundry.applications.api.ApplicationV2`,
  `foundry.applications.api.HandlebarsApplicationMixin`. Under Vitest these are absent;
  `settings.test.ts` mocks `game.settings`.

### Shared State

- `game.battleframe.api` — **SS-05's**, constructed by **SS-12**. The wizard is a consumer
  only; it never registers a ruleset.
- World settings namespace: **`game.system.id`**, not a hardcoded `"battleframe"` —
  `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confidence: confirmed`)
  records this as CSB's pattern throughout and notes it "survives forks/renames".
- `packages/battleframe/lang/en.json` — append `BATTLEFRAME.Setup.*` keys. Also touched by
  SS-07 and SS-08. Append only; do not restructure.
- `packages/battleframe/templates/` — SS-07 and SS-08 also add `.hbs` files. No overlap.
- `packages/battleframe/styles/battleframe.css` — created here; `system.json` (SS-02) must
  reference it via `styles`. If SS-02 omitted the key, add it.
- `packages/battleframe/src/settings/` — **owned by this sub-spec.** SS-08 asserts
  `grep -rn "schemaVersion" packages/battleframe/src/settings/` returns nothing. **Never put
  a schema/migration version setting here.** Version is per-document; see SS-08.

## Implementation Steps

### Step 1: Write failing test — the three world settings

- **File:** `packages/battleframe/tests/settings.test.ts`
- **Test name:** `registerSettings registers activeRulesetId, setupCompleted, and defaultGridUnit as world-scoped settings`
- **Asserts:** with `game.settings.register` mocked, `registerSettings()` registers exactly
  those three keys, each under the `game.system.id` namespace (not a hardcoded literal), each
  with `scope: "world"`; types and defaults match the Completeness Checklist. Asserts **no
  setting key contains `schemaVersion`** — SS-08's guarantee, asserted from this side too.
- **Run:** `npm test -- settings`
- **Expected:** FAIL — `Cannot find module '../src/settings/index'`.

### Step 2: Implement the settings module

- **File:** `packages/battleframe/src/settings/index.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Follow
  `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confidence: confirmed`)
  — `game.settings.register(game.system.id, 'key', {...})` /
  `game.settings.get(game.system.id, 'key')`. The note records dnd5e's world setting shape as
  `scope: "world", config: false, type: String, default: ""`; `activeRulesetId` matches that
  shape.
- **Changes:** export `registerSettings()` registering the three settings per the
  Completeness Checklist, plus `registerMenu` for the wizard reopen entry. Export typed
  get/set helpers so callers never pass a raw string key.

### Step 3: Verify test passes

- **Run:** `npm test -- settings`
- **Expected:** PASS.

### Step 4: Write failing test — GM gate

- **File:** `packages/battleframe/tests/settings.test.ts`
- **Test names:**
  - `the wizard does not open at ready for a non-GM user, even when setup is incomplete`
  - `the wizard opens at ready for a GM when setupCompleted is false`
  - `the wizard does not open at ready when setupCompleted is true`
- **Asserts:** with `game.user.isGM === false` and `setupCompleted === false`, the auto-open
  handler performs **zero** renders. With `isGM === true` and `setupCompleted === false`, it
  renders once. With `setupCompleted === true`, it does not auto-open regardless of role.
- **Run:** `npm test -- settings`
- **Expected:** FAIL — the auto-open handler is not exported.

### Step 5: Write failing test — the three ruleset-count states

- **File:** `packages/battleframe/tests/settings.test.ts`
- **Test names:**
  - `wizard context lists each registered ruleset with title, version, and compatibility`
  - `wizard context for zero registered rulesets is the explanatory state, not an error`
  - `wizard context for two primary rulesets is the conflict state and offers no activation`
- **Asserts:** against `_prepareContext()`'s returned object (per
  `vault/foundry-systems/applicationv2-sheet-structure.md`, `confidence: confirmed`,
  templates see **only** what `_prepareContext` returns — so the context **is** the testable
  surface, no DOM required):
  - one ruleset → an entry carrying `title`, `version`, and a compatibility field, and it is
    selectable;
  - zero rulesets → `state === "no-rulesets"`, an explanatory body, `isError === false`, and
    **no** error styling flag. Battleframe is a table and a ruler;
  - two `primary: true` → `state === "conflict"`, a `conflicting` array naming **both** by
    `id` and `title`, a disable affordance, and **every** ruleset entry non-activatable.
    Asserts `activateRuleset` is **never** called in this state.
- **Run:** `npm test -- settings`
- **Expected:** FAIL — `SetupWizard` is not exported.

### Step 6: Write failing test — selecting a primary

- **File:** `packages/battleframe/tests/settings.test.ts`
- **Test names:**
  - `selecting a primary calls activateRuleset and writes activeRulesetId`
  - `a failed activation does not write activeRulesetId`
- **Asserts:** the select action calls `activateRuleset(id)` and writes the `activeRulesetId`
  world setting. On a failed activation, `activeRulesetId` is **not** written — the world must
  never point at a ruleset that did not activate. (See the criterion note above.)
- **Run:** `npm test -- settings`
- **Expected:** FAIL — `SetupWizard` is not exported.

### Step 7: Implement the wizard

- **File:** `packages/battleframe/src/applications/setup-wizard.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Follow
  `vault/foundry-systems/applicationv2-sheet-structure.md` (`confidence: confirmed`):
  extend `foundry.applications.api.ApplicationV2` mixed with
  `foundry.applications.api.HandlebarsApplicationMixin`. **Not** `ActorSheetV2` /
  `DocumentSheetV2` — this wizard edits settings, not a document, so `options.tag` is
  **`div`** (the note: parts are "wrapped in `options.tag` — `div` for ApplicationV2,
  **`form` for DocumentSheetV2**"). `static DEFAULT_OPTIONS` **auto-merges** up the chain —
  **no `mergeObject` call**; that is a V1 idiom and is wrong here. Use `actions` in
  `DEFAULT_OPTIONS` for clicks, `_onRender` only for non-action listeners.
  `_prepareContext(options)` is async and returns the entire template surface.
  **v14 note:** `ApplicationV2#bringToTop` was **removed** in v14 → use `#bringToFront`
  (`vault/foundry-systems/v14-breaking-changes-that-matter.md`, `confidence: confirmed`).
- **Changes:** implement `SetupWizard`. `_prepareContext` computes `state` — one of
  `no-rulesets`, `conflict`, `ready` — and the per-ruleset entries. Implement the select,
  disable-one, and finish actions. Export a GM-gated auto-open handler for SS-12 to call at
  `ready`. **Gate on `game.user.isGM` before render, not inside the template.**

### Step 8: Implement the template

- **File:** `packages/battleframe/templates/setup-wizard.hbs`
- **Action:** create
- **Changes:** three branches on `state`:
  - `no-rulesets` — **plain, calm, explanatory.** Battleframe is an engine: a table and a
    ruler that measures base-to-base. Name what a ruleset adds and that one must be installed
    separately. **No error styling.**
  - `conflict` — warn, **name both** rulesets by title and id, offer to disable one, and
    render **no activate control at all**. Refusing must be visible, not merely enforced in
    code.
  - `ready` — list each ruleset with title, version, and compatibility; one selectable
    primary.
  Read only from `_prepareContext`'s context.

### Step 9: Implement styles

- **File:** `packages/battleframe/styles/battleframe.css`
- **Action:** create
- **Changes:** wizard layout and state styling. The `no-rulesets` state must **not** reuse
  the error/warning treatment — it is a normal state and must not look like a failure.
  Ensure `system.json` (SS-02) references this file via `styles`.

### Step 10: Add localisation keys

- **File:** `packages/battleframe/lang/en.json`
- **Action:** modify
- **Changes:** add `BATTLEFRAME.Setup.*` keys, including the settings-menu label and the
  conflict warning — which must interpolate **both** ruleset titles, not use a generic
  string. Append only.

### Step 11: Verify tests pass

- **Run:** `npm test -- settings`
- **Expected:** PASS — all tests from Steps 1, 4, 5, and 6.

### Step 12: Verify the build

- **Run:** `npm run build`
- **Expected:** exit 0.

### Step 13: Commit

- **Stage:** `git add packages/battleframe/src/applications/setup-wizard.ts packages/battleframe/templates/setup-wizard.hbs packages/battleframe/src/settings/index.ts packages/battleframe/styles/battleframe.css packages/battleframe/tests/settings.test.ts packages/battleframe/lang/en.json`
- **Message:** `feat: setup wizard and world settings`

## Acceptance Criteria

Preserved verbatim from master spec SS-09.

- `[BEHAVIORAL]` On first launch with setup incomplete, the wizard opens automatically for
  a GM and **never** for a player.
- `[BEHAVIORAL]` It lists each registered ruleset with title, version, and compatibility.
- `[BEHAVIORAL]` Selecting a primary writes the `activeRulesetId` world setting and calls
  `activateRuleset(id)`.
- `[BEHAVIORAL]` With **two** `primary: true` rulesets registered, the wizard warns,
  names both, and offers to disable one. It **refuses to activate either** until resolved.
- `[BEHAVIORAL]` With **zero** rulesets installed, the wizard explains that Battleframe is
  an engine and needs a ruleset — rather than appearing broken.
- `[BEHAVIORAL]` The wizard reopens from a settings menu after first launch.
- `[STRUCTURAL]` World settings exist for `activeRulesetId`, `setupCompleted`, and
  `defaultGridUnit`.
- `[MECHANICAL]` `npm test -- settings` passes.

## Completeness Checklist

Every field below must be implemented. No silent omissions.

### World settings — namespace `game.system.id`, all `scope: "world"`

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `activeRulesetId` | `String`, default `""`, `config: false` | required | The wizard; SS-12 init wiring; SS-05's `getActiveRuleset()`. Written **only after** `activateRuleset(id)` succeeds |
| `setupCompleted` | `Boolean`, default `false`, `config: false` | required | The GM-only auto-open gate at `ready` |
| `defaultGridUnit` | `String`, default `"in"`, `config: true` | required | Scene-creation defaults. Matches the master spec's committed grid default `{type: 0, distance: 1, units: "in"}` |

- **Namespace:** `game.system.id`. **Never** a hardcoded `"battleframe"` string.
- **Forbidden here:** any `schemaVersion` setting. SS-08 asserts
  `grep -rn "schemaVersion" packages/battleframe/src/settings/` returns nothing. Migration
  version is **per-document**.

### Settings menu entry — the reopen path

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `key` | `string` — the menu key | required | `game.settings.registerMenu` |
| `name` / `label` / `hint` | localised strings (`BATTLEFRAME.Setup.*`) | required | Settings UI |
| `icon` | `string` | optional | Settings UI |
| `type` | `SetupWizard` class | required | The reopen action |
| `restricted` | `true` | **required** | GM-only. `false` here would expose the wizard to players — the one thing the Edge Cases table forbids outright |

### Wizard context — `_prepareContext()` return

Templates see **only** this object.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `state` | `"no-rulesets" \| "conflict" \| "ready"` | required | `setup-wizard.hbs` top-level branch |
| `rulesets` | `WizardRulesetEntry[]` | required (`[]` when none) | The list |
| `conflicting` | `WizardRulesetEntry[]` | required (`[]` unless `state === "conflict"`) | The conflict warning — **must name both** |
| `activeRulesetId` | `string` | required (`""` when none) | Marks the current selection |
| `canActivate` | `boolean` | required | **`false` when `state === "conflict"`** — the refusal, made visible |

### `WizardRulesetEntry` — one per registered ruleset

Derived from SS-05's `RulesetDefinition`.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `id` | `string` | required | `activateRuleset(id)`; naming both in the conflict state |
| `title` | `string` | required | The list — the criterion names **title** |
| `version` | `string` | required | The list — the criterion names **version** |
| `compatibility` | `{minimum: string, verified: string}` | required | The list — the criterion names **compatibility**. Comes from `battleframeCompatibility` |
| `primary` | `boolean` | required | Conflict detection: two `true` → `state === "conflict"` |
| `selectable` | `boolean` | required | **`false` for every entry when `state === "conflict"`** |

### Limits and boundaries

- Active primary rulesets: **exactly 1**. Two `primary: true` → activate **exactly 0** until
  resolved.
- Wizard renders for a non-GM user: **exactly 0** — at first launch, at `ready`, and from the
  settings menu (`restricted: true`).
- Wizard auto-opens when `setupCompleted === true`: **exactly 0** (the settings menu still
  reopens it on demand).
- Wizard states: **exactly 3** — `no-rulesets`, `conflict`, `ready`.
- World settings registered: **exactly 3**. `schemaVersion` settings: **exactly 0**.
- Zero rulesets → **0 errors, 0 warnings.** A real product state.

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test -- settings`
- **Acceptance:**
  - `[STRUCTURAL]` three world settings exist — grep in Checks plus the Step 1 test.
  - `[MECHANICAL]` `npm test -- settings` — all cases.
  - `[BEHAVIORAL]` GM-only auto-open — Step 4 tests plus `restricted: true` grep in Checks.
  - `[BEHAVIORAL]` lists title/version/compatibility; zero-ruleset explanation; two-primary
    refusal — Step 5 tests against `_prepareContext`'s context.
  - `[BEHAVIORAL]` select writes `activeRulesetId` and calls `activateRuleset` — Step 6 tests.
  - `[BEHAVIORAL]` reopen from a settings menu — `registerMenu` grep in Checks plus the
    Step 1 test. Final confirmation is master spec Verification steps 3–4 in a live Foundry
    v14: *"Create a Foundry v14 world on Battleframe. The setup wizard opens for the GM.
    Enable `battleframe-greathelm`. It appears in the wizard with title, version, and
    compatibility."*
  - Zero-ruleset state end to end — SS-12's criterion: *"With **no** ruleset installed at
    all, the system still loads, the wizard explains itself, and the ruler measures."*

## Checks

Generated from `[MECHANICAL]` and `[STRUCTURAL]` criteria only. `[BEHAVIORAL]` criteria are
excluded by design — the wizard's product behaviour is asserted by `settings.test.ts` and, at
the end, by a human in a live world. Each command exits 0 on pass, 1 with a one-line summary
on fail.

| Criterion | Type | Command |
|---|---|---|
| World settings exist for `activeRulesetId`, `setupCompleted`, and `defaultGridUnit` | STRUCTURAL | `f=packages/battleframe/src/settings/index.ts; for k in activeRulesetId setupCompleted defaultGridUnit; do grep -q "$k" "$f" 2>/dev/null \|\| { echo "FAIL: world setting '$k' not registered in $f"; exit 1; }; done; exit 0` |
| Settings are world-scoped | STRUCTURAL | `if ! grep -qE "scope:[[:space:]]*[\"']world[\"']" packages/battleframe/src/settings/index.ts 2>/dev/null; then echo "FAIL: no world-scoped setting found in packages/battleframe/src/settings/index.ts"; exit 1; fi; exit 0` |
| Settings namespace is `game.system.id`, not a hardcoded package id | STRUCTURAL | `f=packages/battleframe/src/settings/index.ts; if ! grep -q "game.system.id" "$f" 2>/dev/null; then echo "FAIL: $f does not use game.system.id as the settings namespace"; exit 1; fi; if grep -qE "settings\.(register\|get\|set)\([[:space:]]*[\"']battleframe[\"']" "$f" 2>/dev/null; then echo "FAIL: $f hardcodes the 'battleframe' settings namespace — use game.system.id"; exit 1; fi; exit 0` |
| No `schemaVersion` world setting (SS-08 guarantee, enforced from this side) | MECHANICAL | `if grep -rn "schemaVersion" packages/battleframe/src/settings/ >/dev/null 2>&1; then echo "FAIL: schemaVersion found in src/settings/ — migration version is per-document, never a world setting"; exit 1; fi; exit 0` |
| The wizard reopens from a settings menu | STRUCTURAL | `if ! grep -rq "registerMenu" packages/battleframe/src/settings/ 2>/dev/null; then echo "FAIL: game.settings.registerMenu not found — the wizard cannot reopen after first launch"; exit 1; fi; exit 0` |
| The settings menu is GM-restricted | STRUCTURAL | `if ! grep -rqE "restricted:[[:space:]]*true" packages/battleframe/src/settings/ 2>/dev/null; then echo "FAIL: settings menu is not restricted: true — the wizard must never open for a player"; exit 1; fi; exit 0` |
| The wizard gates on `game.user.isGM` | STRUCTURAL | `if ! grep -rq "isGM" packages/battleframe/src/applications/setup-wizard.ts 2>/dev/null; then echo "FAIL: packages/battleframe/src/applications/setup-wizard.ts has no isGM gate"; exit 1; fi; exit 0` |
| The wizard is ApplicationV2 + HandlebarsApplicationMixin | STRUCTURAL | `f=packages/battleframe/src/applications/setup-wizard.ts; grep -q "foundry.applications.api.ApplicationV2" "$f" 2>/dev/null \|\| { echo "FAIL: $f does not extend foundry.applications.api.ApplicationV2"; exit 1; }; grep -q "HandlebarsApplicationMixin" "$f" 2>/dev/null \|\| { echo "FAIL: $f does not use HandlebarsApplicationMixin"; exit 1; }; exit 0` |
| No ApplicationV1 idioms in the wizard (`mergeObject` in DEFAULT_OPTIONS, `bringToTop`) | STRUCTURAL | `f=packages/battleframe/src/applications/setup-wizard.ts; if grep -q "bringToTop" "$f" 2>/dev/null; then echo "FAIL: $f uses bringToTop — removed in v14, use bringToFront"; exit 1; fi; if grep -qE "mergeObject\(.*DEFAULT_OPTIONS\|DEFAULT_OPTIONS[[:space:]]*=[[:space:]]*(foundry\.utils\.)?mergeObject" "$f" 2>/dev/null; then echo "FAIL: $f merges DEFAULT_OPTIONS manually — ApplicationV2 auto-merges up the chain"; exit 1; fi; exit 0` |
| The wizard template exists and is referenced | STRUCTURAL | `if [ ! -f packages/battleframe/templates/setup-wizard.hbs ]; then echo "FAIL: packages/battleframe/templates/setup-wizard.hbs missing"; exit 1; fi; if ! grep -q "setup-wizard.hbs" packages/battleframe/src/applications/setup-wizard.ts 2>/dev/null; then echo "FAIL: setup-wizard.ts does not reference setup-wizard.hbs"; exit 1; fi; exit 0` |
| The stylesheet exists and `system.json` references it | STRUCTURAL | `if [ ! -f packages/battleframe/styles/battleframe.css ]; then echo "FAIL: packages/battleframe/styles/battleframe.css missing"; exit 1; fi; if ! grep -q "battleframe.css" packages/battleframe/system.json 2>/dev/null; then echo "FAIL: system.json does not reference styles/battleframe.css"; exit 1; fi; exit 0` |
| The wizard implements all three states | STRUCTURAL | `f=packages/battleframe/src/applications/setup-wizard.ts; for s in no-rulesets conflict ready; do grep -q "$s" "$f" 2>/dev/null \|\| { echo "FAIL: wizard state '$s' not implemented in $f"; exit 1; }; done; exit 0` |
| Core stays ruleset-ignorant | STRUCTURAL | `if grep -rni "greathelm" packages/battleframe/src/ >/dev/null 2>&1; then echo "FAIL: core references greathelm — the wizard must be generic over any registered ruleset"; exit 1; fi; exit 0` |
| `npm test -- settings` passes | MECHANICAL | `npm test -- settings > /dev/null 2>&1 \|\| { echo "FAIL: npm test -- settings did not pass"; exit 1; }; exit 0` |
| `npm run build` exits 0 | MECHANICAL | `npm run build > /dev/null 2>&1 \|\| { echo "FAIL: npm run build did not exit 0"; exit 1; }; exit 0` |

## Patterns to Follow

**No existing codebase — greenfield.** All five files are new. The references below are
**research notes tracked in git**, not code. Read them before writing; the master spec ranks
*"Confirmed research over recollection"* third in its trade-off hierarchy because Foundry's
API changed heavily v10→v14 and remembered idioms are usually stale.

- `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confidence: confirmed`):
  the settings half is **confirmed** — `game.settings.register(game.system.id, 'key', {...})`,
  and using `game.system.id` over a hardcoded string "survives forks/renames". dnd5e's world
  setting shape (`scope: "world", config: false, type: String, default: ""`) is the model for
  `activeRulesetId`. The **API half is confirmed by absence** — there is no `api` field in
  `SystemManifestData`, `foundry.packages.System` has no `api` property, and `game.system.api`
  is **not found** — *"The entire public-API story is convention."* That is why SS-05 defines
  `game.battleframe.api` and why **SS-12 builds the namespace at module top level** (the
  dnd5e load-order trick), so a ruleset's `init` can register regardless of package load
  order. **SS-09 consumes that namespace; it does not build it.**
- `vault/foundry-systems/applicationv2-sheet-structure.md` (`confidence: confirmed`):
  `DEFAULT_OPTIONS` auto-merges (no `mergeObject` — V1 idiom); `PARTS` each return one
  top-level element and are wrapped in `options.tag` (**`div` for ApplicationV2** — the wizard
  is not a DocumentSheetV2); `_prepareContext` is async and templates see **only** its return;
  `actions` in `DEFAULT_OPTIONS` for clicks, `_onRender` for other listeners.
- `vault/foundry-systems/v14-breaking-changes-that-matter.md` (`confidence: confirmed`):
  `ApplicationV2#bringToTop` **removed** → `#bringToFront`; the `colorPicker` Handlebars
  helper **removed** → `<color-picker>`; ~40 global class shortcuts removed. Every pre-v14
  wizard tutorial you recall is wrong on at least one of these.
- `vault/foundry-systems/v13-v14-sheet-registration-namespaces.md` (`confidence: confirmed`):
  relevant here only as the reason to distrust bare globals. The wizard registers no sheet.
- `vault/foundry-systems/system-json-grid-is-a-default-not-a-lock.md`: context for
  `defaultGridUnit` — `system.json`'s `grid` is a default for new scenes, not a constraint.
- `vault/foundry-systems/foundry-v14-is-current-as-of-july-2026.md`: target v14 (14.363
  confirmed), ApplicationV2 only.

**Not found in the vault:** a confirmed v14 signature for `game.settings.registerMenu`. The
notes confirm `game.settings.register` only. Treat `registerMenu`'s option shape as
**unverified** — the fields in the Completeness Checklist are the long-standing shape, but
verify against the live v14 runtime. If Foundry contradicts it, the master spec's rule
applies: **stop, correct the note, continue.** Foundry is right.

## Files

Every path in this sub-spec is new. `will-create:` marks paths the spec-reality-gate must
not existence-check.

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe/src/applications/setup-wizard.ts` | Create | `SetupWizard` — ApplicationV2 + HandlebarsApplicationMixin. Three states; GM-gated auto-open |
| `will-create: packages/battleframe/templates/setup-wizard.hbs` | Create | Template branching on `no-rulesets` / `conflict` / `ready`. Zero-ruleset copy is calm and explanatory, never an error |
| `will-create: packages/battleframe/src/settings/index.ts` | Create | `registerSettings()` — `activeRulesetId`, `setupCompleted`, `defaultGridUnit`, plus the GM-restricted reopen menu. **No `schemaVersion`, ever** |
| `will-create: packages/battleframe/styles/battleframe.css` | Create | Wizard layout and state styling. The zero-ruleset state must not reuse error styling |
| `will-create: packages/battleframe/tests/settings.test.ts` | Create | Test file — settings registration, GM gate, three states, select-primary, failed-activation |
| `packages/battleframe/lang/en.json` | Modify | Append `BATTLEFRAME.Setup.*` keys. Created by SS-02; also touched by SS-07 and SS-08 |
| `packages/battleframe/system.json` | Modify | Reference `styles/battleframe.css` via `styles`, if SS-02 did not. Owned by SS-02 |
