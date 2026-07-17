---
type: phase-spec
master_spec: "docs/specs/2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 6
title: "Combat shell — persistence without a turn model"
date: 2026-07-16
depends_on: ["SS-05"]
---

# Sub-Spec 6: Combat shell — persistence without a turn model

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

A Combat document and tracker that persist and sync **without knowing what a round is**.

**This is the component most likely to be argued about, because it looks like it should own
more. It must not.** Read that sentence twice before writing anything. Every instinct trained on
other Foundry systems will push toward `nextTurn`, round tracking, an initiative formula, a
"current activation" pointer. All of them are wrong here, and none of them are omissions.

**Why core owns no turn model — this is evidence, not taste.** Five researched games produced
five incompatible turn structures: GREATHELM fuses initiative/action/sequence into one dice
pool; Battlefront Valkyrie has no activation and runs two orderings per round; INX interrupts
with reactions; Classic BattleTech is phase-structured; Song of Blades discovers turn length
mid-turn by a die roll. **No shared primitive exists.** See
`vault/candidate-rulesets/activation-model-comparison.md`. A turn model in core would be
GREATHELM's turn model wearing a generic name, and the second ruleset would break it.

**The Lancer precedent — copy it.** `vault/foundry-systems/lancer-activation-based-combat-precedent.md`
is `confidence: confirmed` and is **the** precedent:

- Lancer has **no initiative at all**.
- `nextTurn` **sets `turn: null`** instead of advancing — because "the next up isn't
  deterministic." Players choose who activates next.
- Lancer does **not** override `setupTurns`.
- `prepareBaseData()` does `initiative ??= 0` — initiative exists only to satisfy the schema and
  does not drive order.
- The lesson recorded verbatim for Battleframe: "ignore `initiative`, sort on your own data, set
  `turn: null`, and own the tracker UI."

Battleframe goes one step further than Lancer: **`initiative` stays `null` permanently.** Nothing
writes a number to it, ever. That is a Must-Not in the master spec.

**What core hard-assumes and cannot be overridden** — from
`vault/foundry-systems/turn-order-model-is-replaceable-but-storage-is-not.md`
(`confidence: confirmed`). **The ordering *model* is fully replaceable; the ordering *storage* is
not:**

1. `Combatant#initiative` is a `NumberField`. **Schema, not method** — non-numeric order values
   cannot be persisted there. This is exactly why order lives in a flag instead.
2. `Combat#setInitiative(id, value: number)` is number-typed.
3. `turn` is a **numeric index** into `this.turns`. You can set `turn: null` (Lancer does) but
   `turn` cannot be a string key.
4. `_sortCombatants(a, b): number` is a **synchronous** comparator. No async lookups inside it.
5. `setupTurns(): Combatant[]` must **synchronously return a flat array.** Hierarchy must be
   reconstructed in your own tracker UI.

The note names the fit directly: "For Battleframe (group activation, dice-pool-driven order):
[ignore entirely] is the pattern. Sort on ruleset-owned flag data, never populate `initiative`,
and rebuild presentation in a custom tracker."

**The tracker is replaceable** — `vault/foundry-systems/combat-tracker-is-replaceable-via-config-ui-combat.md`
(`confidence: confirmed`): the key is **`CONFIG.ui.combat`**, typed `combat: typeof CombatTracker`,
assigned as `CONFIG.ui.combat = SwadeCombatTracker`. Confirmed in production by SWADE. The note
gives the pattern as a pair: `CONFIG.Combat.documentClass` owns ordering logic; `CONFIG.ui.combat`
owns presentation.

**No initiative formula is needed** — `vault/foundry-systems/config-combat-initiative-has-no-default-formula.md`
(`confidence: confirmed`): `CONFIG.Combat.initiative.formula` is typed `null` by default. Core
ships no formula. "A system that does neither simply has no roll-based initiative — which is a
legitimate choice, not a broken state (Lancer never sets it)." So do nothing. Setting it is the
error.

**The boundary, stated plainly:** `combat.flags.battleframe.order: string[]` is **written only by
rulesets, read only by core**. Core provides **no** `nextTurn`, **no** `advanceActivation`, **no**
round semantics. If a ruleset needs one, the ruleset writes it (SS-11 does exactly this). If core
needs game-specific knowledge to make this work, **stop** — that is the design breaking, not a
detail.

## Interface Contracts

### Provides

- `packages/battleframe/src/combat/battleframe-combat.ts` — the Combat document subclass
  registered via `CONFIG.Combat.documentClass`. Reads `combat.flags.battleframe.order`. Never
  writes it. Consumed by SS-12's wiring and SS-11's round loop.
- `packages/battleframe/src/combat/tracker.ts` — the tracker application registered via
  `CONFIG.ui.combat`. Renders in flag order, including an empty order.
- `packages/battleframe/src/combat/types.ts` — the `order` flag shape and the tracker's render
  context type. **The contract SS-11 writes against.**

### Requires

- **From SS-05:** `packages/battleframe/src/rulesets/registry.ts` — `getActiveRuleset()`, so the
  combat shell can attribute a contained error to a ruleset id. Also
  `packages/battleframe/src/hooks/index.ts` and `packages/battleframe/src/rulesets/types.ts`.
  **Note the direction:** core may ask the registry *which* ruleset is active; it must never ask
  a ruleset *what a round is*.
- **From SS-02:** the TypeScript/Vite/Vitest scaffold; `packages/battleframe/lang/en.json` for
  tracker strings; `packages/battleframe/src/constants.ts` for the flag namespace.
- **From SS-12:** the `game.battleframe` namespace object. **SS-12 owns and constructs it**, and
  performs the `CONFIG.Combat.documentClass` / `CONFIG.ui.combat` assignments at `init` in the
  correct order. This sub-spec **exports the classes**; it does not assign to `CONFIG` at import
  time and does not create `game.battleframe`. Unit tests import the classes directly.
- **Foundry v14**, ApplicationV2 only. See the `not found` note under Patterns to Follow
  regarding the v14 ApplicationV2 tracker base class — **resolve it from the real API or
  escalate; do not guess it.**

### Shared State

- `combat.flags.battleframe.order: string[]` — an array of Combatant ids. **The central shared
  contract of this sub-spec.**
  - **Written by:** rulesets only. SS-11 (GREATHELM) writes it.
  - **Read by:** core only. This sub-spec reads it. Core never computes it.
  - Persisted by Foundry as document flags, which is what gives the "survives reload" and
    "syncs to a second client" properties for free — flags are document data.
- `Combatant#initiative` — **permanently `null`.** Shared with every ruleset as a negative
  contract: nobody writes to it. Not core, not SS-11.
- `CONFIG.Combat.documentClass` and `CONFIG.ui.combat` — global Foundry config slots. Assigned by
  SS-12 at `init`; classes supplied here.
- `game.battleframe` — constructed by SS-12. Shared with SS-04 (`measure`), SS-05 (`api`),
  SS-07 (`dice`).

## Implementation Steps

### Step 1: Read the precedent first

- **Files (read-only):**
  - `vault/foundry-systems/lancer-activation-based-combat-precedent.md` (`confidence: confirmed`)
    — **the** precedent. Copy its shape.
  - `vault/foundry-systems/turn-order-model-is-replaceable-but-storage-is-not.md`
    (`confidence: confirmed`) — the five hard constraints you cannot override.
  - `vault/foundry-systems/combat-tracker-is-replaceable-via-config-ui-combat.md`
    (`confidence: confirmed`) — `CONFIG.ui.combat`.
  - `vault/foundry-systems/combat-overridable-methods-reference.md` (`confidence: confirmed`) —
    exact v13 signatures. Note its own `not found`: the field options on `Combatant#initiative`
    (`required` / `nullable` / `integer`) are **not stated in the docs**. If `initiative: null`
    turns out to be rejected by the schema, that is an escalation — **do not silently fall back
    to a number.** Writing a number to `initiative` is an explicit Must-Not.
  - `vault/foundry-systems/config-combat-initiative-has-no-default-formula.md` — why you set no
    formula.
- **Expected:** before writing code, you can state in one sentence why core has no `nextTurn`. If
  you cannot, re-read the master spec's Intent.

### Step 2: Write failing tests

- **File:** `packages/battleframe/tests/combat.test.ts`
- **Test names:**
  - `combatants carry initiative: null and nothing writes a number to it`
  - `the tracker renders combatants in the order given by combat.flags.battleframe.order`
  - `the tracker re-renders in the new order when the flag changes mid-round`
  - `an empty order array renders an empty tracker without error`
  - `an order id that matches no combatant does not throw`
  - `core never writes combat.flags.battleframe.order`
  - `the combat class exposes no nextTurn, advanceActivation, or round semantics`
- **Asserts:**
  - `initiative` is `null` after setup and after a re-render. Assert `=== null`, not falsy — `0`
    is falsy and `0` is exactly the thing Lancer does that we do not.
  - Ordering follows the flag array, not combatant creation order and not name order. Use a
    fixture where the three differ, or the test proves nothing.
  - Changing the flag and re-rendering yields the new order.
  - `order: []` renders an empty tracker and does not throw — **some games have no per-unit
    activation at all** (Battlefront Valkyrie).
  - No code path in `src/combat/` calls an update that writes the `order` flag.
  - The exported combat class has no `nextTurn` / `advanceActivation` / round-advance member.
- **Run:** `npm test -- combat`
- **Expected:** FAIL — `Cannot find module '../src/combat/battleframe-combat'`.

### Step 3: Implement the combat types

- **File:** `packages/battleframe/src/combat/types.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield.
- **Changes:** Export the `order` flag shape (`string[]` of Combatant ids) and the tracker render
  context type. Document in a comment that the flag is **written only by rulesets, read only by
  core** — the type is where a future contributor will look for the rule.

### Step 4: Implement the Combat document subclass

- **File:** `packages/battleframe/src/combat/battleframe-combat.ts`
- **Action:** create
- **Pattern:** Follow `vault/foundry-systems/lancer-activation-based-combat-precedent.md` — the
  "ignore entirely" variant from `turn-order-model-is-replaceable-but-storage-is-not.md`.
- **Changes:**
  - Subclass the Foundry Combat document. SS-12 assigns it to `CONFIG.Combat.documentClass`.
  - **`initiative` stays `null` permanently.** Note the deliberate divergence from Lancer: Lancer
    does `initiative ??= 0` to satisfy the schema; **Battleframe writes nothing.** The master
    spec's Must-Not is "must not write a numeric `initiative` to any Combatant", and `0` is a
    number. If the schema rejects `null`, **escalate** — see the `not found` in Step 1.
  - **Read** `combat.flags.battleframe.order` to determine presentation order. **Never write it.**
  - **Do not implement `rollInitiative`. Do not implement `_sortCombatants`.** Both are
    grep-checked to be absent. Lancer does not override `setupTurns` either — follow that.
  - **Set no initiative formula.** `CONFIG.Combat.initiative.formula` is `null` by default and
    that is a legitimate end state, not a gap.
  - **No `nextTurn`. No `advanceActivation`. No round semantics.** If you feel the pull, that
    feeling is the design working.
  - Tolerate a stale flag: an id in `order` that matches no combatant must not throw. Flags are
    ruleset-authored and arrive from the network; core cannot assume they are fresh.
  - No `greathelm`. No game-specific anything.

### Step 5: Implement the tracker

- **File:** `packages/battleframe/src/combat/tracker.ts`
- **Action:** create
- **Pattern:** Follow `vault/foundry-systems/combat-tracker-is-replaceable-via-config-ui-combat.md`
  — the SWADE pattern (`CONFIG.ui.combat = SwadeCombatTracker`), confirmed in production. The
  note frames it as a pair: `CONFIG.Combat.documentClass` owns ordering; `CONFIG.ui.combat` owns
  presentation.
- **Changes:**
  - Export a tracker class for SS-12 to assign to `CONFIG.ui.combat`.
  - Render combatants in the order given by the flag. Per
    `turn-order-model-is-replaceable-but-storage-is-not.md`, core's tracker "assumes a flat list
    sorted by a number" — any presentation we want must be reconstructed here from the flat array
    plus our own data. That reconstruction is the tracker's whole job.
  - **An empty order renders an empty tracker without error.** Not a spinner, not a warning, not
    an exception. A real state.
  - ApplicationV2 only (Foundry v14; no ApplicationV1). **The exact v14 ApplicationV2 tracker
    base class is `not found` in the vault** — resolve it against the real v14 API before
    writing, or escalate. Do not guess a namespace path. The vault's `CONFIG.ui.combat` type
    (`typeof CombatTracker`) is confirmed; the base class's v14 location is not recorded.
  - Render **no** round number, **no** turn counter, **no** "next" control. Core does not know
    what those mean.

### Step 6: Verify tests pass

- **Run:** `npm test -- combat`
- **Expected:** PASS.

### Step 7: Verify the negative space

- **Run:** `grep -rn "rollInitiative\|_sortCombatants" packages/battleframe/src/combat/`
- **Expected:** no output.
- **Run:** `grep -rn "greathelm" packages/battleframe/src/`
- **Expected:** no output.
- **Run:** `npm run build`
- **Expected:** exits 0.

### Step 8: Commit

- **Stage:** `git add packages/battleframe/src/combat/battleframe-combat.ts packages/battleframe/src/combat/tracker.ts packages/battleframe/src/combat/types.ts packages/battleframe/tests/combat.test.ts`
- **Message:** `feat: combat shell — persistence without a turn model`

## Acceptance Criteria

- `[STRUCTURAL]` Combatants carry `initiative: null` permanently; nothing writes a number to it.
- `[STRUCTURAL]` Order lives in `combat.flags.battleframe.order: string[]` (Combatant ids) and is **read** by core, never written by core.
- `[MECHANICAL]` `grep -rn "rollInitiative\|_sortCombatants" packages/battleframe/src/combat/` returns nothing.
- `[BEHAVIORAL]` The tracker renders in the order given by the flag, including when the flag changes mid-round.
- `[BEHAVIORAL]` An **empty** order array renders an empty tracker without error — some games have no per-unit activation at all.
- `[BEHAVIORAL]` Order and combat state survive a world reload.
- `[HUMAN REVIEW]` Order and combat state sync to a **second connected client**. Retagged during red-team: this needs two live browsers and cannot be asserted by a worker.
- `[STRUCTURAL]` The tracker is registered via `CONFIG.ui.combat`.
- `[MECHANICAL]` `npm test -- combat` passes.

<!--
Note, not a change: "The tracker is registered via CONFIG.ui.combat" is preserved verbatim, but
the assignment itself happens in SS-12, which owns `packages/battleframe/src/battleframe.ts` and
the init wiring. SS-06 satisfies this by exporting a tracker class shaped for that slot; the
Checks entry therefore greps for the class export plus the CONFIG.ui.combat reference wherever it
lands. If a worker runs SS-06 standalone before SS-12, this criterion is verified structurally,
not at runtime.
-->

## Completeness Checklist

`combat.flags.battleframe.order` — the shared contract:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `order` | `string[]` (Combatant ids) | optional — absent and `[]` are both valid | Read by the tracker and the Combat subclass. **Written by rulesets only** (SS-11 writes it) |

`Combatant` fields this sub-spec touches:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `initiative` | `null`, permanently | never written | Nothing. Exists only because the schema has a `NumberField`. **A number here is a Must-Not violation** |
| `id` | `string` | required | The value stored in the `order` array |

Tracker render context:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `combatants` | `Combatant[]`, flag-ordered | required | Template rendering. Empty array is valid and renders an empty tracker |

Boundaries and limits:

- `nextTurn` implementations in core: **exactly zero.**
- `advanceActivation` implementations in core: **exactly zero.**
- Round-semantics implementations in core: **exactly zero.**
- `rollInitiative` / `_sortCombatants` overrides in `src/combat/`: **exactly zero** —
  grep-enforced.
- Numeric writes to `Combatant#initiative`: **exactly zero**, forever.
- Core writes to `combat.flags.battleframe.order`: **exactly zero.** Read-only, always.
- Minimum valid order length: **0.** An empty tracker is a supported product state.
- Initiative formula set by core: **none.** `CONFIG.Combat.initiative.formula` stays `null`.

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test -- combat`
- **Acceptance:**
  - Negative space: `grep -rn "rollInitiative\|_sortCombatants" packages/battleframe/src/combat/`
    returns nothing.
  - No turn model: `grep -rniE "nextTurn|advanceActivation" packages/battleframe/src/combat/`
    returns nothing.
  - Neutrality: `grep -rn "greathelm" packages/battleframe/src/` returns nothing.
  - `[BEHAVIORAL]` Reload persistence: in a live world, set the order flag, reload, confirm the
    tracker renders the same order. Flags are document data, so this should hold for free — but
    confirm it rather than assume it.
  - `[HUMAN REVIEW]` Second-client sync: two live browsers. Cannot be asserted by a worker.

## Checks

| Criterion | Type | Command |
|---|---|---|
| Nothing writes a number to `initiative` | STRUCTURAL | `! grep -rnE "initiative *(=\|\?\?=) *[0-9]" packages/battleframe/src/ \| grep -q . \|\| { echo "a numeric initiative is written — Must-Not violation"; exit 1; }` |
| Order lives in the flag and core never writes it | STRUCTURAL | `grep -rq "flags.battleframe.order\|battleframe\.order" packages/battleframe/src/combat/ && ! grep -rnE "setFlag\(['\"]battleframe['\"], *['\"]order['\"]" packages/battleframe/src/ \| grep -q . \|\| { echo "core writes the order flag, or does not read it"; exit 1; }` |
| No `rollInitiative` / `_sortCombatants` | MECHANICAL | `! grep -rn "rollInitiative\|_sortCombatants" packages/battleframe/src/combat/ \| grep -q . \|\| { echo "rollInitiative or _sortCombatants present in src/combat/"; exit 1; }` |
| No turn model in core | STRUCTURAL | `! grep -rniE "nextTurn\|advanceActivation" packages/battleframe/src/combat/ \| grep -q . \|\| { echo "core implements a turn model — nextTurn/advanceActivation must not exist"; exit 1; }` |
| Tracker is shaped for `CONFIG.ui.combat` | STRUCTURAL | `grep -rq "CONFIG.ui.combat" packages/battleframe/src/ \|\| { echo "no CONFIG.ui.combat registration found (SS-12 wires it; SS-06 must export the class)"; exit 1; }` |
| `npm test -- combat` passes | MECHANICAL | `npm test -- combat \|\| { echo "combat tests failed"; exit 1; }` |
| Core mentions no ruleset | MECHANICAL | `! grep -rniq "greathelm" packages/battleframe/src/ \|\| { echo "core references greathelm — neutrality violated"; exit 1; }` |
| Build succeeds | MECHANICAL | `npm run build \|\| { echo "build failed"; exit 1; }` |

## Patterns to Follow

**No existing pattern in-repo — greenfield.** All files here are new. But unlike SS-04, this
sub-spec has a **strong external precedent, and the master spec's Preferences say to copy it:**
"Prefer copying Lancer's proven combat pattern over inventing one."

- `vault/foundry-systems/lancer-activation-based-combat-precedent.md` (`confidence: confirmed`):
  **the** precedent. No initiative at all; `nextTurn` sets `turn: null` because "the next up
  isn't deterministic"; does not override `setupTurns`; `prepareBaseData()` does
  `initiative ??= 0` purely to satisfy the schema. **Battleframe diverges on exactly one point:**
  we write nothing to `initiative` at all, because a numeric write is a Must-Not and `0` is a
  number. Everything else, copy.
  - The note's own `not found`: the `lancer-initiative` **module** source could not be verified —
    raw paths 404'd, code search required auth. Any claim about that module is **unverified**.
    Do not rely on it.
- `vault/foundry-systems/turn-order-model-is-replaceable-but-storage-is-not.md`
  (`confidence: confirmed`): the five hard constraints — `initiative` is a `NumberField`
  (**schema, not method**); `setInitiative(id, value: number)`; `turn` is a numeric index and
  cannot be a string key (`turn: null` is allowed); `_sortCombatants` is a **sync** comparator;
  `setupTurns` must **synchronously return a flat array**. Names the fit for Battleframe
  explicitly: sort on ruleset-owned flag data, never populate `initiative`, rebuild presentation
  in a custom tracker.
- `vault/foundry-systems/combat-tracker-is-replaceable-via-config-ui-combat.md`
  (`confidence: confirmed`): `CONFIG.ui.combat`, typed `combat: typeof CombatTracker`. Confirmed
  in production by SWADE. The pattern is a pair — `CONFIG.Combat.documentClass` for ordering,
  `CONFIG.ui.combat` for presentation.
- `vault/foundry-systems/combat-overridable-methods-reference.md` (`confidence: confirmed`):
  exact v13 signatures. Its `not found`: the field options on `Combatant#initiative`
  (`required` / `nullable` / `integer`) are **not stated in the docs**. If `null` is rejected at
  runtime, **escalate — do not write a number.**
- `vault/foundry-systems/config-combat-initiative-has-no-default-formula.md`
  (`confidence: confirmed`): `CONFIG.Combat.initiative.formula` is typed `null` by default; core
  ships no formula; having none is "a legitimate choice, not a broken state." Set nothing.
- `vault/candidate-rulesets/activation-model-comparison.md`: the evidence that no shared
  activation primitive exists across five games. This is *why*, not *how*.

**`not found` — resolve or escalate, do not guess:** the vault does not record the **v14
ApplicationV2 base class for the combat tracker**. `CONFIG.ui.combat` as the registration key is
confirmed; the ApplicationV2 tracker superclass's v14 namespace path is not. The related note
`vault/foundry-systems/v13-v14-sheet-registration-namespaces.md` covers **sheet** registration
namespaces (`foundry.documents.collections.Actors`,
`foundry.applications.apps.DocumentSheetConfig`, `foundry.appv1.sheets.*`) — those are sheets,
not the tracker, and must not be extrapolated. Confirm against the real v14 API or escalate. A
confidently-wrong API path here sends implementation down a dead end.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe/src/combat/battleframe-combat.ts` | Create | Combat document subclass for `CONFIG.Combat.documentClass`. Reads the order flag; `initiative` stays `null`; no `nextTurn`, no round semantics |
| `will-create: packages/battleframe/src/combat/tracker.ts` | Create | ApplicationV2 tracker for `CONFIG.ui.combat`. Renders in flag order; empty order renders an empty tracker |
| `will-create: packages/battleframe/src/combat/types.ts` | Create | The `order` flag shape and tracker render context. Documents the write-by-ruleset / read-by-core boundary |
| `will-create: packages/battleframe/tests/combat.test.ts` | Create | `initiative === null`, flag-driven ordering, mid-round flag change, empty order, stale id, no turn model |
