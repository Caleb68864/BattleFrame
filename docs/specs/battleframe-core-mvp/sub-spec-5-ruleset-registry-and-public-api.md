---
type: phase-spec
master_spec: "docs/specs/2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 5
title: "Ruleset registry and public API"
date: 2026-07-16
depends_on: ["SS-02"]
---

# Sub-Spec 5: Ruleset registry and public API

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

The registration surface rulesets bind to: validation, compatibility checks, exactly one active
primary, and the `game.battleframe.api` namespace.

**There is no official API mechanism for Foundry systems.** This is confirmed by absence in
`vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confidence: confirmed`):

- No `api` field in `SystemManifestData` **or** `ModuleManifestData`.
- `foundry.packages.System` has **no `api` property**. Its props are `_source`, `availability`,
  `exclusive`, `hasStorage`, `locked`, `owned`, `parent`, `strictDataCleaning`, `tags`.
- `game.system.api` — **not found**, no such documented property.
- The module-development article never mentions `api` or `game.modules.get(id).api`.

The entire public-API story is **convention**. So this namespace is ours to define — which means
we must define it deliberately rather than inherit a shape.

**The load-order trick is the point.** The same note records dnd5e's pattern verbatim: the
namespace object is built at **module top level**, so it exists before *anyone's* `init` runs,
regardless of package load order. Only then is it merged onto `game.system` at `init`. This is
what lets a ruleset module call `registerRuleset(...)` from its own `init` no matter which
package Foundry loads first. A hook-based alternative
(`Hooks.callAll('battleframe.registerRuleset', registry)`) remains viable and is more idiomatic
for one-to-many.

**Settings namespace:** the same note confirms systems register settings under `game.system.id`
as the namespace — `game.settings.register(game.system.id, 'key', {...})` — rather than a
hardcoded string, so the code survives forks and renames.

**Two things this sub-spec deliberately does not do:**

1. **No type-name collision detection.** Foundry namespaces document subtypes by package id —
   `greathelm.knight` cannot collide with another module's `knight`
   (`vault/foundry-systems/document-subtypes-are-namespaced-by-package-id.md`, and the master
   spec's Context). Collisions are **structurally impossible**. Police ruleset `id` only. Writing
   collision detection here is an explicit Must-Not.
2. **Registration never activates.** These are two separate verbs with two separate failure
   modes. Registration says "I exist and I am compatible." Activation says "I am the game being
   played." Conflating them is how a world ends up ambiguous.

**Core stays ignorant.** `grep -rn "greathelm" packages/battleframe/src/` must return nothing.
The registry knows what a ruleset *is*; it never knows what any ruleset *does*.

## Interface Contracts

### Provides

- `packages/battleframe/src/rulesets/registry.ts` — `registerRuleset(def)`, `activateRuleset(id)`,
  `getActiveRuleset()`, `getRegisteredRulesets()`. The core of the registration surface.
  Consumed by SS-06 (combat shell), SS-08 (orphan check), SS-09 (setup wizard), SS-10 (GREATHELM
  registers through it).
- `packages/battleframe/src/rulesets/types.ts` — `RulesetDefinition`, `RegisterResult`
  (`{ok: true} | {ok: false, errors: string[]}`). Consumed by SS-09 and SS-10.
- `packages/battleframe/src/rulesets/validate.ts` — pure validation of a `RulesetDefinition`,
  returning errors rather than throwing. Consumed by `registry.ts` and unit-tested directly.
- `packages/battleframe/src/api/index.ts` — the `api` object exposing `registerRuleset` and the
  activation/query surface. **SS-12 attaches this to `game.battleframe.api`.**
- `packages/battleframe/src/hooks/index.ts` — the hook name constants and firing helpers:
  `battleframe.ready`, `battleframe.rulesetRegistered`, `battleframe.rulesetActivated`, named
  exactly so. Consumed by SS-09 and by any ruleset.

### Requires

- **From SS-02:** the TypeScript/Vite/Vitest scaffold; npm workspaces `["packages/*"]`;
  `packages/battleframe/system.json` with `"id": "battleframe"` and
  `compatibility: {minimum: "14", verified: "14"}`; `packages/battleframe/src/constants.ts`;
  `packages/battleframe/src/battleframe.ts` as a bare skeleton;
  `packages/battleframe/lang/en.json` for error strings.
- **The running system version** for compatibility comparison. Source it from the system manifest
  (`game.system.version`), not a duplicated constant — a hardcoded version silently rots.
- **From SS-12:** the `game.battleframe` namespace object. **SS-12 owns and constructs it.** This
  sub-spec exports the `api` object; it does **not** create `game.battleframe`, and must not
  assume it exists at import time. Unit tests call the exports directly and must not depend on a
  global. Per the vault's dnd5e pattern, the namespace must be assembled at **top-level module
  evaluation**, not inside a hook — that is what removes load-order uncertainty for ruleset
  modules. Assembling it is SS-12's job; exporting something assemblable is this sub-spec's job.
- **From SS-01 (`dispatch: manual`):** if the spike showed module `init` precedes system `init`,
  move registration to `setup` and note it (Decisions). If
  `vault/foundry-systems/spike-results-module-subtypes.md` is absent, the ordering is unconfirmed
  — implement the top-level-namespace pattern from the vault, which is load-order-independent by
  construction, and record the assumption.

### Shared State

- `game.battleframe.api` — the namespace slot this sub-spec occupies. Constructed by SS-12;
  shared with SS-04 (`measure`) and SS-07 (`dice`).
- **The registry's internal ruleset map** — written by `registerRuleset`, read by SS-09's wizard
  and SS-08's orphan check. In-memory only; not persisted. Registration is re-run every world
  load.
- **The active ruleset id** — held by the registry at runtime. **SS-09 owns the persisted
  `activeRulesetId` world setting** and calls `activateRuleset(id)`. This sub-spec does not
  register that setting and does not read it. Keep the runtime handle and the persisted value in
  separate ownership.
- **Hook names** — `battleframe.ready`, `battleframe.rulesetRegistered`,
  `battleframe.rulesetActivated`. A public contract with every ruleset. Exact strings.
- **Settings namespace** — `game.system.id`, per the vault. Shared convention with SS-09.

## Implementation Steps

### Step 1: Write failing tests

- **File:** `packages/battleframe/tests/registry.test.ts`
- **Test names:**
  - `registerRuleset() returns {ok: true} for a valid definition`
  - `registerRuleset() returns {ok: false, errors} and never throws on a malformed definition`
  - `registerRuleset() returns {ok: false} naming the conflict for a duplicate id`
  - `registerRuleset() rejects battleframeCompatibility.minimum above the running system version`
  - `a rejected registration does not partially register`
  - `registration never activates — getActiveRuleset() is null until activateRuleset()`
  - `two rulesets with primary: true both register successfully`
  - `activateRuleset() fires battleframe.rulesetActivated`
  - `registerRuleset() fires battleframe.rulesetRegistered`
- **Asserts:**
  - Return shape is exactly `{ok: true}` or `{ok: false, errors: string[]}` — **never a throw**.
    Wrap every call in a `expect(() => ...).not.toThrow()` where the input is hostile:
    `undefined`, `null`, `{}`, missing `id`, non-string `id`, missing
    `battleframeCompatibility`, `version` of the wrong type.
  - The duplicate-id error string **names the conflicting id** — actionable, not "invalid input".
  - After a rejected registration, `getRegisteredRulesets()` does not contain the id. No partial
    state.
  - `getActiveRuleset()` returns `null` immediately after a successful registration.
  - Two `primary: true` definitions both return `{ok: true}`. The conflict is **surfaced at
    activation, not registration** — SS-09's wizard is what refuses.
  - Hooks fire with the exact names.
- **Run:** `npm test -- registry`
- **Expected:** FAIL — `Cannot find module '../src/rulesets/registry'`.

### Step 2: Implement the ruleset types

- **File:** `packages/battleframe/src/rulesets/types.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield.
- **Changes:** Export `RulesetDefinition` =
  `{id, title, version, battleframeCompatibility: {minimum, verified}, primary: boolean}` and
  `RegisterResult` = `{ok: true} | {ok: false, errors: string[]}` as a **discriminated union on
  `ok`** — that shape is what makes "never throws" checkable by the type system rather than by
  discipline.

### Step 3: Implement validation

- **File:** `packages/battleframe/src/rulesets/validate.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield.
- **Changes:**
  - A pure function taking `unknown` and returning `string[]` of errors — empty means valid.
    Takes `unknown`, not `RulesetDefinition`: the input arrives from a third-party module and the
    type annotation guarantees nothing at runtime.
  - **Strict, never coercive** (master spec, Edge Cases: "handles invalid input → strict").
    Reject anything non-conforming with a specific error. Never coerce a number to a string.
  - Every error names the offending field and what was expected. "Invalid ruleset" is not an
    error message.
  - Compare `battleframeCompatibility.minimum` against the running system version. Above it →
    error.
  - **Do not validate type names. Do not check for subtype collisions.** Foundry namespaces
    subtypes by package id; collisions are structurally impossible. Police `id` only.

### Step 4: Implement the registry

- **File:** `packages/battleframe/src/rulesets/registry.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Follow the load-order pattern in
  `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confidence: confirmed`).
- **Changes:**
  - `registerRuleset(def: unknown): RegisterResult`. **Never throws.** Validate first; on any
    error return `{ok: false, errors}` **before mutating anything** — that is what makes "does
    not partially register" true by construction rather than by cleanup.
  - Duplicate `id` → `{ok: false}` with an error naming the conflict.
  - On success: store, fire `battleframe.rulesetRegistered`, return `{ok: true}`.
  - **Registration never activates.** `activateRuleset(id)` is the only path to an active
    ruleset. `getActiveRuleset()` returns `null` until it is called.
  - Two `primary: true` rulesets **both register successfully**. Do not reject here. The conflict
    belongs to activation (SS-09 warns, names both, and refuses to activate either).
  - `activateRuleset(id)` fires `battleframe.rulesetActivated`.
  - **Contain ruleset errors.** If a ruleset throws during its own registration path, surface the
    ruleset id and keep the world usable (master spec, Edge Cases). Core cannot fix a ruleset's
    bug; it can refuse to die of it.
  - No `greathelm`. No game-specific anything.

### Step 5: Implement the hooks module

- **File:** `packages/battleframe/src/hooks/index.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield.
- **Changes:** Export the three hook names as constants and fire them via `Hooks.callAll`. Exact
  strings: `battleframe.ready`, `battleframe.rulesetRegistered`, `battleframe.rulesetActivated`.
  These are a public contract with every ruleset ever written — the constants exist so the strings
  are typed once, not retyped at each call site.

### Step 6: Implement the api surface

- **File:** `packages/battleframe/src/api/index.ts`
- **Action:** create
- **Pattern:** Follow the dnd5e namespace pattern recorded verbatim in
  `vault/foundry-systems/settings-and-api-namespace-conventions.md`.
- **Changes:** Export a plain object exposing `registerRuleset`, `activateRuleset`,
  `getActiveRuleset`, `getRegisteredRulesets`. **Constructible at top-level module evaluation** —
  no `game`, no `CONFIG`, no hook access at construction time. **SS-12 attaches it to
  `game.battleframe.api`.** Do not assign to any global here; that assignment is SS-12's, and
  doing it in two places is how load order becomes a coin flip.

### Step 7: Verify tests pass

- **Run:** `npm test -- registry`
- **Expected:** PASS.

### Step 8: Verify core neutrality

- **Run:** `grep -rn "greathelm" packages/battleframe/src/`
- **Expected:** no output.
- **Run:** `npm run build`
- **Expected:** exits 0.

### Step 9: Commit

- **Stage:** `git add packages/battleframe/src/rulesets/registry.ts packages/battleframe/src/rulesets/types.ts packages/battleframe/src/rulesets/validate.ts packages/battleframe/src/api/index.ts packages/battleframe/src/hooks/index.ts packages/battleframe/tests/registry.test.ts`
- **Message:** `feat: ruleset registry and public API`

## Acceptance Criteria

- `[STRUCTURAL]` `game.battleframe.api.registerRuleset(def)` returns `{ok: true} | {ok: false, errors: string[]}` and **does not throw**.
- `[STRUCTURAL]` `def` is `{id, title, version, battleframeCompatibility: {minimum, verified}, primary: boolean}`.
- `[BEHAVIORAL]` Registering a duplicate `id` returns `{ok: false}` with an actionable error naming the conflict.
- `[BEHAVIORAL]` Registering with `battleframeCompatibility.minimum` above the running system version returns `{ok: false}` and does **not** partially register.
- `[BEHAVIORAL]` Registration never activates. `getActiveRuleset()` returns null until `activateRuleset(id)` is called.
- `[BEHAVIORAL]` Two rulesets with `primary: true` both register successfully; the conflict is surfaced at activation, not registration.
- `[STRUCTURAL]` Hooks `battleframe.ready`, `battleframe.rulesetRegistered`, and `battleframe.rulesetActivated` fire, named exactly so.
- `[MECHANICAL]` `npm test -- registry` passes.
- `[MECHANICAL]` `grep -rn "greathelm" packages/battleframe/src/` returns nothing.

<!--
Note, not a change: the first criterion is written against `game.battleframe.api.registerRuleset`,
but SS-12 owns and constructs the `game.battleframe` namespace — it does not exist during SS-05.
Preserved verbatim per the red-team hardening. Satisfy it by exporting an `api` object with
`registerRuleset` of the specified signature and return shape; SS-12 binds it to the namespace.
-->

## Completeness Checklist

`RulesetDefinition` — the argument to `registerRuleset()`:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `id` | `string` | required | Registry key; duplicate detection; SS-09 wizard; `activeRulesetId` setting. **The only identity policed** |
| `title` | `string` | required | SS-09 wizard listing ("lists each registered ruleset with title, version, and compatibility") |
| `version` | `string` | required | SS-09 wizard listing; the incompatible-upgrade warning at `ready` |
| `battleframeCompatibility` | `{minimum: string, verified: string}` | required | Compatibility rejection at registration |
| `battleframeCompatibility.minimum` | `string` | required | Compared against the running system version. Above it → `{ok: false}` |
| `battleframeCompatibility.verified` | `string` | required | SS-09 wizard compatibility display |
| `primary` | `boolean` | required | Wizard primary selection. **Two `true` values still both register** — conflict is an activation concern |

`RegisterResult` — returned by `registerRuleset()`:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `ok` | `true \| false` | required | Discriminant. The union is the contract |
| `errors` | `string[]` | required **when `ok: false`**; absent when `ok: true` | Surfaced to the GM. Each entry names the field and the conflict |

Hook names — exact strings, a public contract:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `battleframe.ready` | hook name | required | Rulesets; SS-08 orphan check timing |
| `battleframe.rulesetRegistered` | hook name | required | SS-09 wizard refresh |
| `battleframe.rulesetActivated` | hook name | required | SS-09; any ruleset waiting to initialise |

Boundaries and limits:

- Active rulesets: **exactly one, or zero**. Zero is a **real product state** — a table and a
  ruler — not an error (SS-09 Decisions).
- `registerRuleset` throw count: **zero**, for any input including `undefined` and `null`.
- Type-name collision checks: **exactly zero.** An explicit Must-Not — Foundry namespaces
  subtypes by package id.
- Registration is **in-memory and per-world-load**. Nothing is persisted here; SS-09 owns the
  `activeRulesetId` world setting.
- Settings namespace: `game.system.id`, never a hardcoded `"battleframe"` string.

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test -- registry`
- **Acceptance:**
  - Never-throws: `npm test -- registry` includes hostile inputs (`undefined`, `null`, `{}`,
    wrong-typed fields) asserted with `.not.toThrow()`.
  - No partial registration: after a rejected call, `getRegisteredRulesets()` omits the id.
  - Registration ≠ activation: `getActiveRuleset()` is `null` after a successful registration.
  - Neutrality: `grep -rn "greathelm" packages/battleframe/src/` returns nothing.
  - No collision detection: `grep -rniE "collision|typeNameConflict" packages/battleframe/src/rulesets/` returns nothing.

## Checks

| Criterion | Type | Command |
|---|---|---|
| `registerRuleset` returns the `{ok}` union and does not throw | STRUCTURAL | `grep -q "RegisterResult" packages/battleframe/src/rulesets/registry.ts && ! grep -qE "^\s*throw " packages/battleframe/src/rulesets/registry.ts \|\| { echo "registry.ts throws or does not return RegisterResult"; exit 1; }` |
| `def` carries all six fields | STRUCTURAL | `for f in id title version battleframeCompatibility primary minimum verified; do grep -q "$f" packages/battleframe/src/rulesets/types.ts \|\| { echo "RulesetDefinition missing field: $f"; exit 1; }; done` |
| All three hooks named exactly | STRUCTURAL | `for h in battleframe.ready battleframe.rulesetRegistered battleframe.rulesetActivated; do grep -q "$h" packages/battleframe/src/hooks/index.ts \|\| { echo "hook name missing or misspelled: $h"; exit 1; }; done` |
| `npm test -- registry` passes | MECHANICAL | `npm test -- registry \|\| { echo "registry tests failed"; exit 1; }` |
| Core mentions no ruleset | MECHANICAL | `! grep -rniq "greathelm" packages/battleframe/src/ \|\| { echo "core references greathelm — neutrality violated"; exit 1; }` |
| No type-name collision detection (Must-Not) | STRUCTURAL | `! grep -rniE "collision\|typeNameConflict" packages/battleframe/src/rulesets/ \| grep -q . \|\| { echo "type-name collision detection present — Foundry namespaces subtypes; police id only"; exit 1; }` |
| Settings use `game.system.id`, not a literal | STRUCTURAL | `! grep -rn "settings.register(['\"]battleframe['\"]" packages/battleframe/src/ \| grep -q . \|\| { echo "settings registered against a hardcoded id instead of game.system.id"; exit 1; }` |
| Build succeeds | MECHANICAL | `npm run build \|\| { echo "build failed"; exit 1; }` |

## Patterns to Follow

**No existing pattern — greenfield.** There is no codebase; all files here are new. The
authorities are the research notes:

- `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confidence: confirmed`):
  **the primary authority for this sub-spec.**
  - There is **no official API mechanism** — confirmed by absence. No `api` field in
    `SystemManifestData` or `ModuleManifestData`; `foundry.packages.System` has no `api`
    property; `game.system.api` is **not found**. The whole story is convention.
  - The dnd5e pattern to copy, verbatim from `dnd5e.mjs`: build the namespace object at
    **module top level**, then at `init` do
    `globalThis.dnd5e = game.dnd5e = Object.assign(game.system, globalThis.dnd5e)`. The
    top-level construction is the load-order fix — the namespace exists before anyone's `init`
    runs. (SS-12 performs the assembly; export accordingly.)
  - Settings register under `game.system.id`, not a hardcoded string, so the code survives
    forks and renames.
  - A hook-based alternative (`Hooks.callAll('battleframe.registerRuleset', registry)`) is
    noted as viable and more idiomatic for one-to-many.
- `vault/foundry-systems/document-subtypes-are-namespaced-by-package-id.md`: why collision
  detection is a Must-Not. Subtypes are namespaced by package id; collisions are structurally
  impossible.
- `vault/foundry-systems/registering-a-typedatamodel-at-init.md` (`confidence: confirmed`):
  context for what a ruleset does *after* registering — `CONFIG.Actor.dataModels` is a plain
  mutable object a module writes into at `init` **without the system's permission or
  cooperation**. Nothing gates it. The registry is therefore a coordination surface, not a
  gatekeeper — it cannot enforce anything about subtypes even if it tried.
- `vault/foundry-systems/spike-results-module-subtypes.md` (**from SS-01, does not exist yet**):
  would confirm module-`init`-vs-system-`init` ordering. If absent, use the top-level namespace
  pattern, which is load-order-independent by construction, and record the assumption. Per
  Decisions: if the spike showed module `init` precedes system `init`, move registration to
  `setup` and note it.

**Do not invent Foundry API details.** If a fact is not in the notes, it is `not found` —
escalate rather than fill it in.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe/src/rulesets/registry.ts` | Create | `registerRuleset` / `activateRuleset` / `getActiveRuleset` / `getRegisteredRulesets`. Never throws; never activates on register |
| `will-create: packages/battleframe/src/rulesets/types.ts` | Create | `RulesetDefinition` and the `RegisterResult` discriminated union |
| `will-create: packages/battleframe/src/rulesets/validate.ts` | Create | Strict, non-coercive validation of `unknown` → `string[]` of actionable errors. Polices `id` only |
| `will-create: packages/battleframe/src/api/index.ts` | Create | The `api` object, constructible at top-level evaluation; SS-12 attaches it to `game.battleframe.api` |
| `will-create: packages/battleframe/src/hooks/index.ts` | Create | The three hook name constants and their firing helpers |
| `will-create: packages/battleframe/tests/registry.test.ts` | Create | Registration, duplicate id, compatibility rejection, no partial state, register≠activate, dual-primary, hooks |
