---
type: phase-spec
master_spec: "../2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 10
title: "GREATHELM module foundation — registration, knight, dice pool"
date: 2026-07-16
depends_on: ["SS-04", "SS-06", "SS-07", "SS-08"]
---

# Sub-Spec 10: GREATHELM Module Foundation — Registration, Knight, Dice Pool

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

The first real ruleset, and the proof that core is neutral. A separate Foundry **module** —
`battleframe-greathelm` — that contributes its own Actor subtype and registers with the
system through `game.battleframe.api`.

**This sub-spec is the foundation only:** manifest, registration, the knight data model, the
dice pool, and the face→action mapping. The round loop, clash resolution, and the sheet are
**SS-11**.

**The rules authority is `vault/greathelm/` — start at `index.md`.**

Those 36 notes are the authority available to you. They were written directly from the
official QSR v0.4, and the mechanics used by this sub-spec are marked `confirmed` with a
cited source. **Respect the `confidence:` frontmatter** — `unverified` means someone
inferred it, and an inference is not a rule.

**`vault/greathelm/GREATHELM-QSR.pdf` is deliberately NOT in git.** It is a copyrighted
rulebook that must never be redistributed. It will not exist in your worktree. **Do not go
looking for it and do not try to fetch it.**

**Do not substitute web sources — they are known to be wrong.** Goonhammer says Run = 6";
the QSR says Sprint = **5"**. This was verified, and the divergence is documented in
`vault/greathelm/version-discrepancies-qsr-vs-kickstarter.md`. If you find yourself reaching
for a web search about GREATHELM rules, stop.

**If a fact you need is marked `not found` in the notes, it stays not-found — escalate; do
not fill it in from genre convention.** Warband construction, campaign rules, Scene
semantics, and objectives are all genuinely unknown and explicitly out of scope. An invented
rule is indistinguishable from a real one once it is in code.

**Ship no rules text, no stat blocks, no prose, no artwork.** Mechanics only. Copyright
protects expression, not systems. Action names used as identifiers and short UI labels
(`"Sprint"`) are mechanism; effect descriptions, rulebook prose, and the armour/courage
tables rendered as readable text are expression and must not ship.

**Every constant is provisional.** The QSR is v0.4, explicitly pre-1.0 and "introductory",
and Kickstarter fulfilment post-dates it. All GREATHELM constants therefore live in
`packages/battleframe-greathelm/src/constants.ts`, externalised, with the source note named
in a comment. See `vault/greathelm/engine-implications.md` §6.

**Scope is the round loop only** (across SS-10 + SS-11). Scenes, campaigns, warband
construction, and objectives are "not found" in the QSR — **not invented**. Out of scope.

### What this sub-spec builds

- `packages/battleframe-greathelm/module.json` — the manifest: subtype **name** declaration,
  system relationship, v14 compatibility, and the named required rulebook.
- `packages/battleframe-greathelm/src/main.ts` — the `init` entry point: data model
  registration, settings registration, ruleset registration.
- `packages/battleframe-greathelm/src/constants.ts` — every provisional number, in one place.
- `packages/battleframe-greathelm/src/data/knight.ts` — `KnightData`, the whole knight.
- `packages/battleframe-greathelm/src/round/dice-pool.ts` — pool sizing, rolling, re-roll,
  face tallying, initiative determination.
- `packages/battleframe-greathelm/src/round/actions.ts` — the face→action mapping applied:
  which action a die buys, and what that action costs and grants.

### Greenfield

**There is no existing codebase.** Every file in this sub-spec is new, and the packages this
one depends on (SS-04, SS-06, SS-07, SS-08) are themselves new in this same build. There are
no in-repo patterns to detect and none to imitate — the references in **Patterns to Follow**
are research notes in `vault/`, not source files.

### Unresolved — escalate, do not decide alone

<!-- Raised during phase-spec refinement. Neither item changes an acceptance criterion. -->

1. **Equal, non-zero 6s counts.** The QSR states three cases (see
   `vault/greathelm/initiative-order-determination.md`): most 6s → *chooses*; **neither**
   player has 6s → compare 5s, then 4s, and so on; only one player has 6s → **must** go
   first. It does **not** state what happens when both players have 6s in *equal, non-zero*
   numbers. The cascade rule is written only for the both-zero case. Extending the cascade to
   cover equal-non-zero counts is the smallest possible inference and is what this sub-spec
   implements — but it **is** an inference. Mark it `[INVENTED]` in a code comment naming
   this line, and record it in `vault/greathelm/open-questions.md`. Do not present it as a
   rule.
2. **Exact ties at every face.** Genuinely `not found` — the QSR gives no tiebreak, and the
   only web source improvises one. Per the master spec's SS-10 decision: re-roll tied pools,
   mark it clearly as an **invented house rule** in a code comment, and record it in
   `vault/greathelm/open-questions.md`.

## Interface Contracts

### Provides

Consumed by SS-11 (the round loop) and SS-12 (integration).

- `FACE_TO_ACTION` (`src/constants.ts`): the frozen, single-source face→action map.
  `6`=Sprint, `5`=Encircle, `4`=Bash, `3`=Shift, `2`=Light, `1`=Heavy. One exported
  constant. Not scattered, not duplicated, not re-derived anywhere else.
- `GREATHELM` (`src/constants.ts`): the frozen constants object — distances, caps, pool
  arithmetic, armour-table thresholds, momentum and damage values. Every number the ruleset
  uses.
- `KnightData` (`src/data/knight.ts`): the Actor subtype data model, extending
  `foundry.abstract.TypeDataModel`. Registered at `init` as
  `CONFIG.Actor.dataModels["battleframe-greathelm.knight"]`.
- `poolSize(knightsInPlay, options?)` (`src/round/dice-pool.ts`): returns the number of dice.
  `knightsInPlay + 1`, optionally floored at 3.
- `rollPool(count)` (`src/round/dice-pool.ts`): rolls `{count}d6` through
  `game.battleframe.dice.roll` and returns the faces. Never `Math.random`.
- `rerollNonSixes(faces, indices)` (`src/round/dice-pool.ts`): the initiative-phase re-roll —
  once, any subset, 6s excluded. Supports SS-11's initiative phase.
- `tallyFaces(faces)` (`src/round/dice-pool.ts`): faces → count per face, the pool "rows".
- `determineInitiative(tallyA, tallyB)` (`src/round/dice-pool.ts`): returns a discriminated
  result — see **Completeness Checklist**.
- `actionForFace(face)` / `actionSpec(action)` (`src/round/actions.ts`): the face→action
  lookup and the mechanical specification of each action (distance, momentum, damage,
  whether it is a clash test, whether it requires base contact).
- Module settings namespace `"battleframe-greathelm"`, with the `kickstarterMinPoolThree`
  world setting.

### Requires

- **From SS-04:** `game.battleframe.measure.between(tokenA, tokenB)`. Not called in this
  sub-spec — SS-11 calls it. Required here only because the module declares the dependency
  and must not load into a system without measurement.
- **From SS-05 (via SS-04/SS-06/SS-08):** `game.battleframe.api.registerRuleset(def)`
  returning `{ok: true} | {ok: false, errors: string[]}`, and never throwing. `def` is
  `{id, title, version, battleframeCompatibility: {minimum, verified}, primary: boolean}`.
- **From SS-06:** the combat shell — `combat.flags.battleframe.order` is read by core and
  written by the ruleset. Written in SS-11, not here.
- **From SS-07:** `game.battleframe.dice.roll(formula, data?)` returning a standard Foundry
  `Roll`. The dice pool rolls through this and nothing else.
- **From SS-08:** `foundry.abstract.TypeDataModel` registration precedent and the
  `flags.battleframe.schemaVersion` per-document stamping convention.
- **From SS-02:** npm workspaces `["packages/*"]`, TypeScript, Vite, Vitest, `npm run build`,
  `npm test`.

### Shared State

- `CONFIG.Actor.dataModels` — a plain mutable object. This module writes
  `"battleframe-greathelm.knight"` into it at `init`, **without the system's cooperation**.
  Confirmed: `vault/foundry-systems/registering-a-typedatamodel-at-init.md`.
- `game.battleframe.api` — the system's registration surface. Constructed by SS-12 at module
  top level, so it exists before any package's `init` runs, regardless of load order.
  Confirmed: `vault/foundry-systems/settings-and-api-namespace-conventions.md`.
- Subtypes are **namespaced by package id** (`vault/foundry-systems/document-subtypes-are-namespaced-by-package-id.md`),
  so `battleframe-greathelm.knight` cannot collide. **Do not write collision detection.**
- `game.settings` namespace `"battleframe-greathelm"` — the module's own, never core's.

## Implementation Steps

### Step 1: Write failing test — constants and face→action mapping

- **File:** `packages/battleframe-greathelm/tests/dice-pool.test.ts`
- **Test name:** `FACE_TO_ACTION maps every face exactly once`
- **Asserts:** `FACE_TO_ACTION` has exactly six entries; `6`→`"sprint"`, `5`→`"encircle"`,
  `4`→`"bash"`, `3`→`"shift"`, `2`→`"light"`, `1`→`"heavy"`; the object is frozen; there is
  no face `0` and no face `7`.
- **Run:** `npm test -- dice-pool`
- **Expected:** FAILS — `Cannot find module '../src/constants'`.

### Step 2: Implement constants

- **File:** `packages/battleframe-greathelm/src/constants.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Follow the *instruction* in
  `vault/greathelm/engine-implications.md` §6: "Constants belong in config … Externalise
  them."
- **Changes:** Export `FACE_TO_ACTION` as a single frozen constant, and `GREATHELM` as a
  single frozen constants object holding every number from the **Completeness Checklist**.
  Every constant carries a comment naming its vault note and its `confidence:`. Provisional
  status is stated at the top of the file: QSR v0.4, pre-1.0, introductory — every number
  here may have changed before v1.0.

### Step 3: Verify test passes

- **Run:** `npm test -- dice-pool`
- **Expected:** PASSES.

### Step 4: Write failing test — pool sizing

- **File:** `packages/battleframe-greathelm/tests/dice-pool.test.ts`
- **Test name:** `poolSize is knights in play plus one`
- **Asserts:** `poolSize(6) === 7` (the opening pool); `poolSize(5) === 6`;
  `poolSize(1) === 2`; `poolSize(0) === 1`. With `{applyKickstarterMinimum: true}`:
  `poolSize(1, …) === 3` and `poolSize(0, …) === 3` (the floor binds), while
  `poolSize(5, …) === 6` and `poolSize(6, …) === 7` are unchanged (the floor does not bind).
  Default is floor **off** — `poolSize(1)` is `2`, not `3`.
- **Run:** `npm test -- dice-pool`
- **Expected:** FAILS — `poolSize is not a function`.

### Step 5: Implement pool sizing

- **File:** `packages/battleframe-greathelm/src/round/dice-pool.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. The formula is confirmed verbatim in
  `vault/greathelm/initiative-dice-pool-size.md`: "you gain 1 initiative dice for every
  knight you control in the play area, plus 1. Each player starts the game with 7."
- **Changes:** `poolSize(knightsInPlay: number, options?: {applyKickstarterMinimum?: boolean})`.
  Base is `knightsInPlay + GREATHELM.poolBonus` (`poolBonus = 1`). When
  `applyKickstarterMinimum` is true, floor at `GREATHELM.kickstarterMinPool` (`3`).
  **Default false.**

  The floor is **Kickstarter-only and NOT in the QSR.** Comment the provenance in full at the
  call site: it comes from the designer's Kickstarter copy ("to a minimum of 3 dice"), is
  `confidence: partial` in `vault/greathelm/initiative-dice-pool-size.md`, is absent from QSR
  v0.4, and only binds at ≤1 knight remaining. It is a setting, defaulting off, because the
  QSR is the authority and the QSR does not have it.

  **The setting is passed in, never read here.** `dice-pool.ts` must not touch
  `game.settings` — it takes the flag as an option so it is unit-testable with no Foundry
  globals. `main.ts` reads the setting and passes it down.

### Step 6: Verify test passes

- **Run:** `npm test -- dice-pool`
- **Expected:** PASSES.

### Step 7: Write failing test — the min-3 setting is registered and defaults off

- **File:** `packages/battleframe-greathelm/tests/dice-pool.test.ts`
- **Test name:** `kickstarterMinPoolThree registers with default false`
- **Asserts:** With a stubbed `game.settings.register`, `registerGreathelmSettings()`
  registers `"battleframe-greathelm"` / `"kickstarterMinPoolThree"` with
  `{scope: "world", config: true, type: Boolean, default: false}`. The recorded `default` is
  strictly `false`.
- **Run:** `npm test -- dice-pool`
- **Expected:** FAILS — `registerGreathelmSettings is not a function`.

### Step 8: Implement settings registration

- **File:** `packages/battleframe-greathelm/src/main.ts`
- **Action:** create
- **Pattern:** `vault/foundry-systems/settings-and-api-namespace-conventions.md` — settings
  register under the package's own id. This is a module, so the namespace is the literal
  `"battleframe-greathelm"`, not `game.system.id`.
- **Changes:** Export `registerGreathelmSettings()`. Register `kickstarterMinPoolThree`
  (`scope: "world"`, `config: true`, `type: Boolean`, `default: false`) with the provenance
  in its hint: the floor is from the Kickstarter, not the QSR.

### Step 9: Verify test passes

- **Run:** `npm test -- dice-pool`
- **Expected:** PASSES.

### Step 10: Write failing test — rolling and the initiative re-roll

- **File:** `packages/battleframe-greathelm/tests/dice-pool.test.ts`
- **Test name:** `rollPool rolls through the core dice service` and
  `rerollNonSixes never rerolls a six`
- **Asserts:** `rollPool(7)` calls `game.battleframe.dice.roll` with `"7d6"` — a stub records
  the formula — and returns seven faces in `1..6`. `Math.random` is never referenced.
  `rerollNonSixes([6,6,5,1], [0,1,2,3])` leaves indices `0` and `1` untouched (6s are never
  re-rolled, per QSR) and re-rolls only `2` and `3`. `rerollNonSixes(faces, [2])` re-rolls a
  **subset** — the rule says "any dice", so it is a per-die choice, not all-or-nothing.
  Re-rolling an already-re-rolled die is rejected — the rule says "once".
- **Run:** `npm test -- dice-pool`
- **Expected:** FAILS.

### Step 11: Implement rolling and re-roll

- **File:** `packages/battleframe-greathelm/src/round/dice-pool.ts`
- **Action:** modify
- **Pattern:** `vault/greathelm/initiative-phase.md` (confirmed, QSR p1 verbatim): "roll them
  and organize them into rows of matching numbers in order from highest to lowest. You may
  re-roll any dice that are not 6's, once."
- **Changes:** `rollPool(count)` builds `${count}d6` and rolls it through
  `game.battleframe.dice.roll` — SS-07's passthrough to Foundry `Roll`. **Never
  `Math.random`**: that is a master-spec must-not, and it is what makes Dice So Nice work with
  no integration code. `rerollNonSixes(faces, indices)` re-rolls the given indices, skipping
  any whose face is `6`, and marks them consumed so a second re-roll is rejected.
  `tallyFaces(faces)` returns counts per face `1..6` — the "rows" of the initiative tray.

### Step 12: Verify test passes

- **Run:** `npm test -- dice-pool`
- **Expected:** PASSES.

### Step 13: Write failing test — initiative determination

- **File:** `packages/battleframe-greathelm/tests/dice-pool.test.ts`
- **Test name:** `initiative goes to the most 6s`
- **Asserts:**
  - **Most 6s → chooses.** A has three 6s, B has one 6 → `{outcome: "chooses", winner: "A", decidedAtFace: 6}`. The winner *chooses* first or second; the result does not assert an order.
  - **Only one player has 6s → forced first.** A has two 6s, B has zero → `{outcome: "forced-first", winner: "A", decidedAtFace: 6}`. Holding the sole 6 **removes** the choice.
  - **Neither has 6s → cascade.** Both zero at 6; A has two 5s, B has one 5 → `{outcome: "chooses", winner: "A", decidedAtFace: 5}`. Both zero at 6 and 5; A has one 4, B has zero → decided at face `4`.
  - **Equal non-zero 6s → cascade, flagged as inferred.** Both have two 6s; A has three 5s, B has one → decided at face `5`. The result carries `inferred: true`.
  - **Exact tie at every face → re-roll.** Identical tallies → `{outcome: "reroll", houseRule: true}`. Not a winner. Not a coin flip.
- **Run:** `npm test -- dice-pool`
- **Expected:** FAILS — `determineInitiative is not a function`.

### Step 14: Implement initiative determination

- **File:** `packages/battleframe-greathelm/src/round/dice-pool.ts`
- **Action:** modify
- **Pattern:** `vault/greathelm/initiative-order-determination.md` (confirmed, QSR p1
  verbatim): "The player with the most 6s chooses whether to go first or second this round.
  If neither player has 6s, look at 5s, then 4s, and so on. If only one player has 6s, that
  player must go first."
- **Changes:** `determineInitiative(tallyA, tallyB)` walks faces `6` down to `1`. At each
  face: if the counts differ, that face decides. If the deciding face is `6` and the loser's
  count is `0`, the outcome is `forced-first` — the sole-6s holder **must** go first, it is
  not a choice, and this case is easy to miss. Otherwise the outcome is `chooses`. If the
  counts are equal at a face, descend.

  Two comments are mandatory here, both naming their provenance:
  - `[INVENTED]` — descending on **equal, non-zero** 6s. The QSR writes the cascade only for
    the both-zero case. This is the smallest available inference, not a rule. Set
    `inferred: true` on the result. Record in `vault/greathelm/open-questions.md`.
  - `[INVENTED HOUSE RULE]` — the exact-tie re-roll. Ties are **not specified** in QSR v0.4
    (`vault/greathelm/initiative-order-determination.md`, "Unresolved: exact ties"). Per the
    master spec's SS-10 decision, re-roll. Do **not** present it as a real rule. Record in
    `vault/greathelm/open-questions.md`.

### Step 15: Verify test passes

- **Run:** `npm test -- dice-pool`
- **Expected:** PASSES.

### Step 16: Write failing test — the action table

- **File:** `packages/battleframe-greathelm/tests/dice-pool.test.ts`
- **Test name:** `every face maps to a fully specified action`
- **Asserts:** For all six faces, `actionForFace(face)` returns the action from
  `FACE_TO_ACTION` and `actionSpec(action)` returns a complete spec. Specifically:
  Sprint (6) → `{moveInches: 5, momentumGain: 2, clashTest: false}`;
  Encircle (5) → `{moveInches: 3, momentumGain: 1, clashTest: false}`;
  Bash (4) → `{clashTest: true, requiresBaseContact: true, damage: 0, pushInches: 3, stripsMomentum: true}`;
  Shift (3) → `{moveInches: 1, momentumGain: 0, clashTest: false}`;
  Light (2) → `{clashTest: true, requiresBaseContact: true, damage: 1}`;
  Heavy (1) → `{clashTest: true, requiresBaseContact: true, damage: 2}`.
  Sprint is **5**, not 6. Faces 6, 5 and 3 are `clashTest: false` — movement never fails.
  `actionForFace(0)` and `actionForFace(7)` throw — a die has six faces, and an out-of-range
  face is a bug, not a default.
- **Run:** `npm test -- dice-pool`
- **Expected:** FAILS — `Cannot find module '../src/round/actions'`.

### Step 17: Implement the action table

- **File:** `packages/battleframe-greathelm/src/round/actions.ts`
- **Action:** create
- **Pattern:** `vault/greathelm/dice-face-to-action-mapping.md` (confirmed, QSR p1 verbatim)
  and `vault/greathelm/movement-and-measurement.md` (confirmed) for the distances.
- **Changes:** `actionForFace(face)` reads `FACE_TO_ACTION` from `constants.ts` — **it does
  not restate the map**. `actionSpec(action)` returns the mechanical spec, every number read
  from `GREATHELM` in `constants.ts`. No literal distances, damages or caps in this file.

  Do not re-derive, mirror, or invert the face→action map anywhere. It is one exported
  constant, in one file, and every consumer reads it from there. A second copy is how 5"
  becomes 6".

### Step 18: Verify test passes

- **Run:** `npm test -- dice-pool`
- **Expected:** PASSES. This is the full `[MECHANICAL]` criterion: pool sizing at 1/5/6
  models, the min-3 setting on and off, face→action for all six faces, and initiative ties.

### Step 19: Implement KnightData

- **File:** `packages/battleframe-greathelm/src/data/knight.ts`
- **Action:** create
- **Pattern:** `vault/foundry-systems/typedatamodel-defineschema-and-data-preparation.md`
  (confirmed) for `defineSchema` and `prepareDerivedData`;
  `vault/greathelm/knights-have-no-stat-line.md` (confirmed for the quickstart) for the shape.
- **Changes:** `class KnightData extends foundry.abstract.TypeDataModel` — **not** bare
  `DataModel`. `static defineSchema()` returns exactly the fields in the **Completeness
  Checklist**, and nothing else.

  **A knight has no stat line.** No Move, no Weapon Skill, no Toughness, no Attacks, no
  Wounds value, no name, no role, no rating. Every knight is mechanically identical; the only
  differentiator is equipment. Adding a stat here is inventing a rule.

  **Resist adding an `activated` flag.** Action economy is per die, not per model —
  `vault/greathelm/action-economy-per-die-not-per-model.md`, QSR p1 verbatim: "A knight can
  be activated multiple times in a round, or not at all." The budget lives entirely in the
  dice pool. An `activated` flag would break the design.

  `prepareDerivedData()` computes `isDestroyed` (`damage >= GREATHELM.damageLimit`) and
  `isRemoved` (`isDestroyed || removedFromPlay`). Position and base size are **not** here —
  they live on the Token (SS-03's `token.flags.battleframe.base`). Do not duplicate them.

### Step 20: Implement the manifest

- **File:** `packages/battleframe-greathelm/module.json`
- **Action:** create
- **Pattern:** `vault/foundry-systems/document-subtypes-must-be-declared-statically-in-the-manifest.md`
  (confirmed) — the subtype **name** is static and server-enforced; the **class** is
  registered at `init`. Both halves are required.
- **Changes:** Declare `"id": "battleframe-greathelm"`, `documentTypes.Actor.knight`,
  `relationships.systems: [{id: "battleframe", type: "system"}]`, and
  `compatibility: {minimum: "14", verified: "14"}` with **no** `maximum` key.
  `esmodules` references the Vite output, path relative to the package root.

  **Name the required rulebook.** The manifest's `description` must name the GREATHELM
  quickstart rulebook the user obtains separately from the publisher, and state plainly that
  **no rules content ships with this module** — no rules text, no stat blocks, no artwork.
  A ruleset module must clearly identify any separately required official rulebook.
  See `vault/greathelm/source-inventory.md` for the publisher and the document; **link
  nothing that redistributes it**.

### Step 21: Implement the vite config

- **File:** `packages/battleframe-greathelm/vite.config.ts`
- **Action:** create
- **Pattern:** SS-02's committed default for the system package, applied to this module:
  Vite outputs an ES module to `packages/battleframe-greathelm/dist/battleframe-greathelm.js`,
  and `module.json` declares it via `esmodules`, not `scripts`. Manifest paths are relative
  to the package root.
- **Changes:** Library build, ES format, entry `src/main.ts`, no code-splitting.

### Step 22: Implement registration in main.ts

- **File:** `packages/battleframe-greathelm/src/main.ts`
- **Action:** modify
- **Pattern:** `vault/foundry-systems/registering-a-typedatamodel-at-init.md` (confirmed) for
  the `CONFIG.Actor.dataModels` write;
  `vault/foundry-systems/settings-and-api-namespace-conventions.md` (confirmed) for why
  calling `game.battleframe.api` from this module's `init` is load-order-safe — SS-12 builds
  the namespace at module top level, so it exists before any `init` hook runs.
- **Changes:** On `init`, in order:
  1. `Object.assign(CONFIG.Actor.dataModels, {"battleframe-greathelm.knight": KnightData})`.
     The prefix is the package id and is mandatory — subtypes are namespaced by package id.
  2. `registerGreathelmSettings()`.
  3. `game.battleframe.api.registerRuleset({id: "battleframe-greathelm", title, version,
     battleframeCompatibility: {minimum, verified}, primary: true})`.

  `registerRuleset` **returns** `{ok: false, errors}` rather than throwing (SS-05's
  contract). Check the result and log every error loudly, naming the module. A failed
  registration that logs nothing is a silent failure, and silent failure is the enemy here.
  **Registration never activates** — the wizard (SS-09) activates. Do not call
  `activateRuleset` from this module.

  Do **not** write type-name collision detection. Foundry namespaces subtypes by package id,
  so collisions are structurally impossible — a master-spec must-not.

### Step 23: Implement the language file

- **File:** `packages/battleframe-greathelm/lang/en.json`
- **Action:** create
- **Pattern:** No existing pattern — greenfield.
- **Changes:** UI labels only — the six action names, the field labels from the
  **Completeness Checklist**, the setting's name and hint, and the module title. **No rules
  text.** No effect descriptions, no armour table, no courage table, no prose from the
  rulebook. If a string explains how a rule works, it does not belong here.

### Step 24: Verify the full sub-spec

- **Run:** `npm run build && npm test -- dice-pool`
- **Expected:** Both exit 0. Then run every command in **Checks** and confirm each exits 0.

### Step 25: Record the inventions in the vault

- **File:** `vault/greathelm/open-questions.md`
- **Action:** modify
- **Changes:** Under Tier 2, record both inventions from this sub-spec against
  item 15 (exact-tie initiative tiebreak): the exact-tie re-roll house rule, and the
  equal-non-zero-6s cascade inference. Name the file and function that implement each. The
  standing instruction in that note is to make the unknown an explicit, swappable seam rather
  than hard-coding a plausible rule — these two are seams, and they must be findable.

### Step 26: Commit

- **Stage:** `git add packages/battleframe-greathelm/ vault/greathelm/open-questions.md`
- **Message:** `feat: GREATHELM module foundation — registration, knight, dice pool`

## Acceptance Criteria

Preserved verbatim from the master spec.

- `[STRUCTURAL]` `module.json` declares `documentTypes.Actor.knight`,
  `relationships.systems: [{id: "battleframe", type: "system"}]`, and
  `compatibility: {minimum: "14", verified: "14"}`.
- `[STRUCTURAL]` `module.json` names the required rulebook the user must obtain
  separately, and states that no rules content ships. Ruleset modules must clearly
  identify any separately required official rulebook.
- `[STRUCTURAL]` `KnightData` extends `foundry.abstract.TypeDataModel` and is registered
  at `init` via `CONFIG.Actor.dataModels["battleframe-greathelm.knight"]`.
- `[BEHAVIORAL]` The module registers via `game.battleframe.api.registerRuleset` with
  `primary: true` and appears in the setup wizard.
- `[STRUCTURAL]` The dice pool is **models + 1** dice. The min-3 floor is
  **Kickstarter-only and NOT in the QSR** — implement it behind a setting defaulting
  **off**, and comment the provenance.
- `[STRUCTURAL]` Die face hard-selects the action: `6`=Sprint, `5`=Encircle, `4`=Bash,
  `3`=Shift, `2`=Light, `1`=Heavy. A single exported constant in `constants.ts`, not
  scattered.
- `[BEHAVIORAL]` Initiative goes to the most 6s.
- `[MECHANICAL]` `npm test -- dice-pool` passes, covering: pool sizing at 1/5/6 models,
  the min-3 setting both on and off, face→action mapping for all six faces, and initiative
  ties.
- `[STRUCTURAL]` **Ship no rules text**, no stat blocks, no artwork, no prose from the
  rulebook. Mechanics only.
- `[STRUCTURAL]` All GREATHELM constants live in `constants.ts` and are externalised — the
  QSR is v0.4 and every number is provisional.

## Completeness Checklist

### `KnightData` — every field

`packages/battleframe-greathelm/src/data/knight.ts`. **Implement every field on this list —
no silent omissions.** This is the complete knight. Nothing else goes in it.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `damage` | `NumberField({integer: true, min: 0, initial: 0, nullable: false, required: true})` | required | SS-11 clash resolution (applies damage), SS-11 courage difficulty (+1 per damage), SS-11 removal at ≥3, SS-11 knight sheet, SS-12 wound persistence |
| `momentum` | `NumberField({integer: true, min: 0, max: 3, initial: 0, nullable: false, required: true})` | required | SS-11 clash bonuses (+1 per spent, attacker only), SS-11 Sprint/Encircle gain, SS-11 Bash strip, SS-11 knight sheet |
| `equipment` | `SchemaField({...})` | required | SS-11 clash bonuses; the only differentiator between knights |
| `equipment.oneHanded` | `BooleanField({initial: false, required: true})` | required | SS-11 clash: +1 to **light melee** (face 2) only |
| `equipment.twoHanded` | `BooleanField({initial: false, required: true})` | required | SS-11 clash: +1 to **heavy melee** (face 1) only |
| `equipment.shield` | `BooleanField({initial: false, required: true})` | required | SS-11 clash: +2 to **Block** defense only — not Parry, Riposte, or Dodge |
| `removedFromPlay` | `BooleanField({initial: false, required: true})` | required | SS-11 pool sizing (`knightsInPlay`), SS-11 courage difficulty (+1 per allied knight removed), SS-11 victory check |
| `removalReason` | `StringField({blank: true, initial: "", choices: ["", "damage", "fled"]})` | required | SS-11 courage phase / audit. Both routes off the table count identically for pool sizing and courage difficulty; the reason is recorded, not branched on |

**Derived, in `prepareDerivedData()` — not persisted:**

| Derived | Type | Computation | Used By |
|-------|------|----------|---------|
| `isDestroyed` | `boolean` | `damage >= GREATHELM.damageLimit` | SS-11 immediate removal |
| `isRemoved` | `boolean` | `isDestroyed \|\| removedFromPlay` | SS-11 pool sizing, courage, victory |

**Deliberately absent — adding any of these is inventing a rule:**

| Absent | Why |
|-------|------|
| any stat line (Move / WS / Toughness / Attacks / Wounds) | `vault/greathelm/knights-have-no-stat-line.md` — knights are mechanically identical; no stats exist in QSR v0.4 |
| `activated` flag | `vault/greathelm/action-economy-per-die-not-per-model.md` — economy is per die, not per model. A knight may act many times or never |
| `position`, `baseWidthMm` | Owned by the Token. SS-03's `token.flags.battleframe.base`. Never duplicated onto the Actor |
| `name`, `role`, `rating`, points cost | Warband construction is **not found** in the QSR. Out of scope. Do not invent |
| armour type | The table is titled "**heavy** armor table", implying alternates, but the light table is **not found**. QSR has one table. Do not model a choice that has no second option |
| `flags.battleframe.schemaVersion` | Not a schema field — a per-document flag, stamped by SS-08's plumbing at create time |

### `FACE_TO_ACTION` — all six entries

`packages/battleframe-greathelm/src/constants.ts`. One exported, frozen constant. **All six.
No omissions, no seventh entry, no duplicate map anywhere else in the package.**

| Face | Action identifier | Action name (QSR p1) | Clash test | Mechanical effect |
|-------|------|----------|----------|----------|
| `6` | `"sprint"` | Sprint | no | Move up to **5"**, gain **2** momentum |
| `5` | `"encircle"` | Encircle | no | Move up to **3"**, gain **1** momentum |
| `4` | `"bash"` | Bash | **yes** | Success moves the defender up to **3"** and strips **all** their momentum. Deals **no damage** — a Bash never reaches the armour table |
| `3` | `"shift"` | Shift | no | Move up to **1"** |
| `2` | `"light"` | Light Melee attack | **yes** | Success deals **1** damage marker |
| `1` | `"heavy"` | Heavy Melee attack | **yes** | Success deals **2** damage markers |

**Clash-test faces are 4, 2, 1 only.** Faces **6, 5, 3** are
movement and auto-succeed — `vault/greathelm/dice-face-to-action-mapping.md`, "Steps 6/5/3
auto-succeed". `actionSpec("encircle").clashTest` is `false`.

**Naming note:** QSR p1 uses Sprint / Encircle / Shift; QSR p5's own reference card uses
Run / Walk / Step, as do the Kickstarter and the licensed initiative tray. The same document
disagrees with itself. The master spec commits to the p1 names and this sub-spec follows it.
Do not ship the aliases as rules text; if they are ever needed, they are UI labels in
`lang/en.json`. `vault/greathelm/version-discrepancies-qsr-vs-kickstarter.md`.

### `determineInitiative` — result shape

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `outcome` | `"chooses" \| "forced-first" \| "reroll"` | required | SS-11 initiative phase |
| `winner` | `"A" \| "B" \| null` | required (`null` when `outcome === "reroll"`) | SS-11 |
| `decidedAtFace` | `1..6 \| null` | required (`null` when `outcome === "reroll"`) | SS-11, chat/debug output |
| `inferred` | `boolean` | required | Flags the equal-non-zero-6s cascade as an inference, not a rule |
| `houseRule` | `boolean` | required | Flags the exact-tie re-roll as an invented house rule |

`chooses` means the winner **decides** whether to go first or second — it does not mean they
go first. `forced-first` means they have no choice. Conflating the two is the exact error
Goonhammer makes; the QSR and the Kickstarter both say the winner *decides*.

### Constants — `GREATHELM` in `constants.ts`

Every number. Each carries a comment naming its vault note and `confidence:`. **All
provisional: QSR v0.4, pre-1.0, "introductory".**

| Constant | Exact value | Source | Where enforced |
|-------|------|----------|----------|
| `poolBonus` | `1` | `initiative-dice-pool-size.md` — confirmed, QSR p1 | `poolSize()` |
| `startingKnights` | `6` | `initiative-dice-pool-size.md` / `greathelm-overview.md` — confirmed | Opening pool = 7 |
| `kickstarterMinPool` | `3` | `initiative-dice-pool-size.md` — **partial. Kickstarter only, NOT in QSR v0.4** | `poolSize()`, behind `kickstarterMinPoolThree`, default **off** |
| `sprintInches` | `5` | `movement-and-measurement.md` — confirmed, QSR v0.4. **Not 6". The web is wrong** | `actionSpec("sprint")`, SS-11 |
| `encircleInches` | `3` | `movement-and-measurement.md` — confirmed | `actionSpec("encircle")` |
| `shiftInches` | `1` | `movement-and-measurement.md` — confirmed | `actionSpec("shift")` |
| `bashPushInches` | `3` | `bash-action.md` / `movement-and-measurement.md` — confirmed | `actionSpec("bash")`, SS-11 |
| `dodgeInches` | `1` | `clash-defenses.md` — confirmed | SS-11 |
| `sprintMomentum` | `2` | `dice-face-to-action-mapping.md` — confirmed | `actionSpec("sprint")` |
| `encircleMomentum` | `1` | `dice-face-to-action-mapping.md` — confirmed | `actionSpec("encircle")` |
| `clashWinMomentum` | `1` | `momentum.md` — confirmed. Gained by attacker **or** defender | SS-11 |
| `parryBonusMomentum` | `1` | `clash-defenses.md` — confirmed. Additional, so +2 total with the clash win | SS-11 |
| `momentumLimit` | `3` | `momentum.md` — confirmed, QSR p2. Overflow discarded | `KnightData.momentum` max, SS-11 |
| `damageLimit` | `3` | `damage-and-removal.md` — confirmed, QSR p2. **≥3 → immediately removed** | `prepareDerivedData()`, SS-11 |
| `lightDamage` | `1` | `dice-face-to-action-mapping.md` — confirmed | `actionSpec("light")` |
| `heavyDamage` | `2` | `dice-face-to-action-mapping.md` — confirmed | `actionSpec("heavy")` |
| `riposteDamage` | `1` | `clash-defenses.md` — confirmed. **No armour roll** — the only guaranteed damage in the game | SS-11 |
| `armorImperviousFace` | `6` | `heavy-armor-table.md` — confirmed, QSR p2. No damage applied | SS-11 |
| `armorPiercedFace` | `1` | `heavy-armor-table.md` — confirmed. Damage **+1** | SS-11 |
| `armorPiercedBonus` | `1` | `heavy-armor-table.md` — confirmed | SS-11 |
| `attackerWinsTies` | `true` | `clash-test.md` — confirmed, QSR p2. Defender must be **strictly higher** | SS-11 |
| `initiativeRerollAllowedOnce` | `true` | `initiative-phase.md` — confirmed, QSR p1 | `rerollNonSixes()` |
| `initiativeRerollExcludesFace` | `6` | `initiative-phase.md` — confirmed. 6s can never be re-rolled | `rerollNonSixes()` |
| `outnumberBonusPerAlly` | `1` | `clash-bonuses.md` — confirmed, QSR p2 | SS-11 |
| `oneHandedLightBonus` | `1` | `clash-bonuses.md` — confirmed. Light melee (face 2) **only** | SS-11 |
| `twoHandedHeavyBonus` | `1` | `clash-bonuses.md` — confirmed. Heavy melee (face 1) **only** | SS-11 |
| `shieldBlockBonus` | `2` | `clash-bonuses.md` — confirmed. **Block only** | SS-11 |
| `courageAutoPassFace` | `6` | `courage-test.md` — confirmed, QSR p2. Natural 6 always passes | SS-11 |

**Limits and boundaries:**

- Dice pool size: `knightsInPlay + 1` — enforced in `poolSize()`. Opening pool is **7** at 6
  knights. The pool **shrinks as knights are removed**.
- Kickstarter min pool: `3` — enforced in `poolSize()` **only** when
  `applyKickstarterMinimum` is true; the setting defaults **off**. Binds only at ≤1 knight.
- Momentum: `0..3` — enforced by the schema's `min`/`max` and by SS-11's gain logic.
  Additional momentum is **discarded**, not banked.
- Damage: `0..` — floored at `0` by the schema. **Not** capped at 3: `damage >= 3` triggers
  removal, and a Pierced heavy attack can deliver 3 in one blow. Capping at 3 would be a
  silent rule change.
- Die faces: `1..6` — `actionForFace()` throws outside this range.
- Initiative re-roll: **once**, faces `!== 6`, any subset.

<!-- Not covered by any SS-10 acceptance criterion, and deliberately left to SS-11:
     momentum persistence between rounds is `not found` (vault/greathelm/momentum.md).
     KnightData persists `momentum` because the QSR never says it resets and the courage
     phase does not clear it — but this is NOT confirmed. Do not add round-boundary
     cleanup on the strength of genre convention. Escalate if SS-11 needs an answer. -->

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test -- dice-pool`
- **Acceptance:** Run every command in **Checks** below; each exits 0. The remaining
  criteria are not mechanically checkable from this sub-spec:
  - `[BEHAVIORAL]` *registers with `primary: true` and appears in the setup wizard* — needs a
    live Foundry v14 world with the system installed and SS-09's wizard present. Verify in
    the SS-12 integration pass. A worker cannot assert it here.
  - `[STRUCTURAL]` *ship no rules text* — the `Checks` command catches binaries and long
    string blobs, but a human must confirm no prose from the rulebook ships. The mechanical
    check is a floor, not a proof.

## Checks

Commands drawn from `[MECHANICAL]` and `[STRUCTURAL]` criteria only. `[BEHAVIORAL]` and
`[HUMAN REVIEW]` criteria are excluded — they cannot be asserted by a shell command. Each
command exits 0 on pass, or 1 with a one-line summary on fail. Run from the repo root.

| Criterion | Type | Command |
|---|---|---|
| `module.json` declares `documentTypes.Actor.knight`, `relationships.systems`, `compatibility` 14/14 | STRUCTURAL | `node -e "const m=require('./packages/battleframe-greathelm/module.json');const e=[];if(!m.documentTypes?.Actor?.knight)e.push('documentTypes.Actor.knight');if(!(m.relationships?.systems||[]).some(s=>s.id==='battleframe'&&s.type==='system'))e.push('relationships.systems battleframe');if(m.compatibility?.minimum!=='14'||m.compatibility?.verified!=='14')e.push('compatibility 14/14');if(m.compatibility&&'maximum' in m.compatibility)e.push('compatibility.maximum must be absent');if(e.length){console.error('module.json: '+e.join('; '));process.exit(1)}"` |
| `module.json` names the required rulebook and states no rules content ships | STRUCTURAL | `node -e "const m=require('./packages/battleframe-greathelm/module.json');const d=(m.description||'');if(!/rulebook\|quickstart/i.test(d)\|\|!/no rules content\|does not ship\|ships no/i.test(d)){console.error('module.json: description must name the separately-required rulebook AND state that no rules content ships');process.exit(1)}"` |
| `KnightData` extends `TypeDataModel` and is registered at `init` under the namespaced id | STRUCTURAL | `grep -q 'extends foundry.abstract.TypeDataModel' packages/battleframe-greathelm/src/data/knight.ts && grep -rq '"battleframe-greathelm.knight"' packages/battleframe-greathelm/src/main.ts \|\| { echo "KnightData: must extend foundry.abstract.TypeDataModel and register as CONFIG.Actor.dataModels['battleframe-greathelm.knight']"; exit 1; }` |
| `KnightData` extends `TypeDataModel`, not bare `DataModel` | STRUCTURAL | `! grep -nE 'extends foundry\.abstract\.DataModel\b' packages/battleframe-greathelm/src/data/knight.ts \|\| { echo "KnightData: extends bare DataModel — must be TypeDataModel"; exit 1; }` |
| The dice pool is models + 1; the min-3 floor is a setting defaulting off | STRUCTURAL | `node -e "const s=require('fs').readFileSync('packages/battleframe-greathelm/src/main.ts','utf8');if(!/kickstarterMinPoolThree/.test(s)\|\|!/default:\s*false/.test(s)){console.error('min-3 floor: kickstarterMinPoolThree setting must exist with default false');process.exit(1)}"` |
| The min-3 floor's provenance is commented | STRUCTURAL | `grep -riq 'kickstarter' packages/battleframe-greathelm/src/round/dice-pool.ts \|\| { echo "min-3 floor: provenance comment missing from dice-pool.ts — it is Kickstarter-only and NOT in the QSR"; exit 1; }` |
| Face→action is a single exported constant in `constants.ts`, not scattered | STRUCTURAL | `grep -q 'FACE_TO_ACTION' packages/battleframe-greathelm/src/constants.ts && [ "$(grep -rlE '(const\|let\|var)\s+FACE_TO_ACTION' packages/battleframe-greathelm/src/ \| wc -l)" -eq 1 ] \|\| { echo "FACE_TO_ACTION: must be defined exactly once, in constants.ts"; exit 1; }` |
| All six faces are mapped | STRUCTURAL | `node -e "const s=require('fs').readFileSync('packages/battleframe-greathelm/src/constants.ts','utf8');const m=['sprint','encircle','bash','shift','light','heavy'].filter(a=>!s.includes(a));if(m.length){console.error('FACE_TO_ACTION: missing action(s): '+m.join(', '));process.exit(1)}"` |
| Sprint is 5", not 6" | STRUCTURAL | `node -e "const s=require('fs').readFileSync('packages/battleframe-greathelm/src/constants.ts','utf8');if(!/sprintInches:\s*5\b/.test(s)){console.error('constants.ts: sprintInches must be 5 — the QSR says 5\\\", the web says 6\\\" and the web is wrong');process.exit(1)}"` |
| `npm test -- dice-pool` passes | MECHANICAL | `npm test -- dice-pool` |
| All constants are externalised to `constants.ts` — no magic distances in logic | STRUCTURAL | `! grep -rnE '\b(sprint\|encircle\|shift\|bash)[A-Za-z]*\s*[:=]\s*[0-9]' packages/battleframe-greathelm/src/round/ \|\| { echo "round/: numeric literals for distances found — all constants must come from constants.ts"; exit 1; }` |
| Ship no rules text: no rulebook, artwork, or binaries tracked in the package | STRUCTURAL | `[ -z "$(git ls-files packages/battleframe-greathelm/ \| grep -iE '\.(pdf\|epub\|mobi\|cbz\|cbr\|png\|jpg\|jpeg\|webp\|svg\|gif)$')" ] \|\| { echo "packages/battleframe-greathelm: tracked rulebook/artwork file(s) — no rules content or artwork may ship"; exit 1; }` |
| No `Math.random` — all randomness goes through Foundry `Roll` | STRUCTURAL | `! grep -rn 'Math\.random' packages/battleframe-greathelm/src/ \|\| { echo "Math.random found — all randomness must go through game.battleframe.dice.roll or Dice So Nice breaks"; exit 1; }` |
| No type-name collision detection (Foundry namespaces subtypes already) | STRUCTURAL | `! grep -rniE 'collision\|typeCollision\|duplicateType' packages/battleframe-greathelm/src/ \|\| { echo "collision detection found — subtypes are namespaced by package id; this is a master-spec must-not"; exit 1; }` |
| Build succeeds | MECHANICAL | `npm run build` |

## Patterns to Follow

**There is no existing codebase — this project is greenfield.** All 63 files in the master
spec are new, and every package this sub-spec depends on is being built in the same run.
There are no in-repo source patterns to detect and none to cite. What follows are **research
notes in `vault/`**, which the master spec ranks above recollection: "Prefer confirmed vault
research over recollection. Foundry's API changed heavily v10→v14; remembered idioms are
usually stale."

**Rules authority — `vault/greathelm/`:**

- `vault/greathelm/index.md`: **start here.** The map of all 36 notes and the confidence
  discipline. Read before touching a rule.
- `vault/greathelm/dice-face-to-action-mapping.md` (`confirmed`, QSR p1 verbatim): the
  central table. The source of `FACE_TO_ACTION` and every action's effect.
- `vault/greathelm/initiative-dice-pool-size.md` (`confirmed`; the min-3 floor is `partial`):
  pool = knights + 1, opening 7. The floor's exact provenance and why it is a setting.
- `vault/greathelm/initiative-order-determination.md` (`confirmed`): all three initiative
  cases, plus the `not found` exact-tie gap. The source of both `[INVENTED]` markers.
- `vault/greathelm/initiative-phase.md` (`confirmed`): roll, organise descending, re-roll
  non-6s once, subsets allowed.
- `vault/greathelm/knights-have-no-stat-line.md` (`partial` — quickstart only): why
  `KnightData` has no stats. The complete knight state.
- `vault/greathelm/action-economy-per-die-not-per-model.md` (`confirmed`): why there is no
  `activated` flag.
- `vault/greathelm/version-discrepancies-qsr-vs-kickstarter.md` (`confirmed`): the source
  authority ranking, and why every constant is provisional. Read before trusting any number.
- `vault/greathelm/engine-implications.md` (`unverified` — inference, flagged as such): the
  "constants belong in config" instruction, and the shape of the round primitive. Engineering
  opinion, not rules — treat accordingly.
- `vault/greathelm/open-questions.md` (`unverified`): what is genuinely unknown. **Read
  before architecting.** The standing instruction: make the unknown an explicit, swappable
  seam rather than picking a plausible rule and hard-coding it.
- `vault/greathelm/source-inventory.md` (`confirmed`): the publisher and the document, for
  naming the rulebook in `module.json`. Note "Treat the PDF as reference-only; do not
  redistribute."

**Foundry API — `vault/foundry-systems/`:**

- `vault/foundry-systems/registering-a-typedatamodel-at-init.md` (`confirmed`): the exact
  `Object.assign(CONFIG.Actor.dataModels, {"pkg.type": Model})` idiom for a module, and why
  the system need not cooperate.
- `vault/foundry-systems/document-subtypes-must-be-declared-statically-in-the-manifest.md`
  (`confirmed`): the manifest half. Type **name** static and server-enforced; **class** at
  `init`. Both required — one without the other silently fails.
- `vault/foundry-systems/document-subtypes-are-namespaced-by-package-id.md` (`confirmed`):
  why `battleframe-greathelm.knight` cannot collide, and why collision detection is banned.
- `vault/foundry-systems/typedatamodel-defineschema-and-data-preparation.md` (`confirmed`):
  `defineSchema()` shape, `foundry.data.fields.*`, `prepareDerivedData()`.
- `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confirmed`): settings
  register under the package's own id; and the top-level-namespace trick that makes calling
  `game.battleframe.api` from this module's `init` load-order-safe.
- `vault/foundry-systems/modules-can-contribute-document-subtypes.md` (`confirmed`): the
  feature is official since v11, not a hack.
- `vault/foundry-systems/module-subtypes-vanish-when-the-module-is-disabled.md`: why SS-08's
  orphan check exists. Relevant context; nothing to implement here.

## Files

Prefix any path a sub-spec will CREATE (not yet present on disk) with `will-create:`.
**Every path in this sub-spec is new — the repo contains no `packages/` directory.**

| File | Action | Purpose |
|------|--------|---------|
| will-create: packages/battleframe-greathelm/module.json | Create | Manifest: `documentTypes.Actor.knight`, `relationships.systems` → battleframe, compatibility 14/14 with no `maximum`, `esmodules`, and the named separately-required rulebook |
| will-create: packages/battleframe-greathelm/vite.config.ts | Create | ES module build → `dist/battleframe-greathelm.js`, referenced from `module.json` via `esmodules` |
| will-create: packages/battleframe-greathelm/src/main.ts | Create | `init` entry: registers `KnightData` into `CONFIG.Actor.dataModels`, registers settings, registers the ruleset via `game.battleframe.api.registerRuleset` with `primary: true` |
| will-create: packages/battleframe-greathelm/src/constants.ts | Create | `FACE_TO_ACTION` and `GREATHELM` — every provisional constant, externalised, each with its vault source and confidence |
| will-create: packages/battleframe-greathelm/src/data/knight.ts | Create | `KnightData extends foundry.abstract.TypeDataModel` — damage, momentum, equipment, removal. No stat line |
| will-create: packages/battleframe-greathelm/src/round/dice-pool.ts | Create | `poolSize`, `rollPool`, `rerollNonSixes`, `tallyFaces`, `determineInitiative` |
| will-create: packages/battleframe-greathelm/src/round/actions.ts | Create | `actionForFace`, `actionSpec` — the face→action mapping applied. Reads `constants.ts`, restates nothing |
| will-create: packages/battleframe-greathelm/lang/en.json | Create | UI labels only — action names, field labels, setting name and hint. No rules text |
| will-create: packages/battleframe-greathelm/tests/dice-pool.test.ts | Create | Test file: pool sizing at 1/5/6 models, min-3 setting on and off, face→action for all six faces, initiative ties |
| vault/greathelm/open-questions.md | Modify | Record the exact-tie re-roll house rule and the equal-non-zero-6s cascade inference, naming the implementing file and function |
