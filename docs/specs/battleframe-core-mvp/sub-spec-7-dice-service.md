---
type: phase-spec
master_spec: "docs/specs/2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 7
title: "Dice service — deliberately thin"
date: 2026-07-16
depends_on: ["SS-02"]
---

# Sub-Spec 7: Dice Service — Deliberately Thin

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

A passthrough to Foundry's `Roll` class, plus chat rendering. **Thinness is the feature, not
a compromise.** Because `roll()` returns the standard Foundry `Roll` object and never a
wrapper type, Dice So Nice — which hooks Foundry's own roll/chat pipeline — animates
Battleframe rolls with **zero** integration code on our side. Any wrapper, subclass, or
"enhanced roll" type breaks that for free.

**Greenfield.** There is no existing codebase; all three files in this sub-spec are new.
There is no prior Battleframe dice code to match.

**Explicitly out of scope — do not add:** exploding dice, re-rolls, success counting,
target numbers, dice pools, initiative comparison. Those are ruleset concerns and live in
`packages/battleframe-greathelm/` (SS-10). The master spec's SS-07 decision is binding:
*"If this file grows past ~100 lines, something has gone wrong."* Treat ~100 lines in
`dice.ts` as a design alarm, not a hard lint.

**`Math.random()` is banned project-wide.** Not a style preference — Dice So Nice can only
animate randomness that flowed through Foundry's `Roll`. A `Math.random()` call produces a
number that is correct and completely invisible to the dice animation layer, which is
exactly the class of silent failure the master spec's trade-off hierarchy ranks second.

**Namespace note:** this sub-spec attaches `dice` to `game.battleframe`, but does **not**
construct that namespace. SS-12 owns construction and initialisation order. Export a
`dice` object from this module and let SS-12 wire it. See Requires below.

<!-- Spec gap, non-blocking: master SS-07 does not name the Handlebars template file for
     chat cards, though it requires one ("[STRUCTURAL] Chat cards render via a Handlebars
     template"). This phase spec commits to
     `packages/battleframe/templates/dice-roll-card.hbs` as the path. Not changed from the
     master — added, because the criterion is unimplementable without a path. -->

## Interface Contracts

### Provides

- `roll(formula: string, data?: object): Promise<Roll>`: evaluates `formula` through
  Foundry's `Roll` and returns the **standard Foundry `Roll` instance**. No wrapper type.
  Consumed by SS-10 (GREATHELM dice pool) and SS-11 (clash tests).
- `toChat(roll: Roll, options: DiceChatOptions): Promise<ChatMessage>`: renders `roll` to a
  chat card via a Handlebars template, stamped with the ruleset id that produced it.
  Consumed by SS-11.
- `DiceChatOptions` type: `{rulesetId: string, flavor?: string, speaker?: object}`.
- The `dice` service object (`{roll, toChat}`) exported for SS-12 to attach at
  `game.battleframe.dice`.
- `packages/battleframe/templates/dice-roll-card.hbs`: the chat card template.

### Requires

- **From SS-02:** the monorepo scaffold — root `package.json` with npm workspaces
  `["packages/*"]`, `tsconfig.json`, `vitest.config.ts`, `packages/battleframe/system.json`,
  and `packages/battleframe/src/constants.ts` (for the system id used in template paths and
  log prefixes). Without SS-02, `npm install` and `npm test` cannot run.
- **From SS-12 (namespace owner):** `game.battleframe` is **constructed by SS-12**, not by
  this sub-spec. SS-07 must not create, assign, or mutate `game.battleframe` itself — it
  exports a service object and SS-12 attaches it as `game.battleframe.dice`. The acceptance
  criterion is phrased as `game.battleframe.dice.roll(...)` because that is the caller-facing
  path once SS-12 has wired it.
- **From Foundry v14 runtime:** the global `Roll` class and `ChatMessage` document. Under
  Vitest these are absent and must be test doubles — the unit tests mock them; they do not
  boot Foundry.

### Shared State

- `game.battleframe.dice` — the attachment point. **Owned and constructed by SS-12.**
- `packages/battleframe/lang/en.json` — created by SS-02; this sub-spec adds chat-card
  localisation keys. Also touched by SS-09. Append keys under a `BATTLEFRAME.Dice.*` prefix;
  do not restructure existing keys.
- `packages/battleframe/templates/` — shared directory. SS-08 and SS-09 also add `.hbs`
  files here. Files do not overlap.

## Implementation Steps

### Step 1: Write failing test — `roll()` returns a standard Foundry `Roll`

- **File:** `packages/battleframe/tests/dice.test.ts`
- **Test name:** `roll() returns the Roll instance produced by Foundry, not a wrapper`
- **Asserts:** with a stubbed global `Roll` class, `await roll("1d6")` returns a value that
  `instanceof` the stubbed `Roll`; the returned object is **identical by reference** to the
  instance the stub constructed (`expect(result).toBe(stubInstance)`); the returned object
  has no Battleframe-added properties.
- **Run:** `npm test -- dice`
- **Expected:** FAIL — `Cannot find module '../src/dice/dice'` (the module does not exist).

### Step 2: Write failing test — evaluation and data passthrough

- **File:** `packages/battleframe/tests/dice.test.ts`
- **Test name:** `roll() passes formula and data through to Roll and evaluates it`
- **Asserts:** `Roll` is constructed with exactly `(formula, data)`; `evaluate()` is awaited
  before the roll is returned; calling `roll("2d6+@bonus", {bonus: 3})` forwards
  `{bonus: 3}` unmodified.
- **Run:** `npm test -- dice`
- **Expected:** FAIL — module not found.

### Step 3: Write failing test — no `Math.random`

- **File:** `packages/battleframe/tests/dice.test.ts`
- **Test name:** `dice service never calls Math.random`
- **Asserts:** spies on `Math.random`; performs a `roll("1d6")`; asserts the spy was never
  called. (The grep in Checks is the authoritative guard; this test catches the runtime case
  and documents the intent at the point of failure.)
- **Run:** `npm test -- dice`
- **Expected:** FAIL — module not found.

### Step 4: Implement the dice passthrough

- **File:** `packages/battleframe/src/dice/dice.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Ground the shape in
  `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confidence: confirmed`)
  for the service-object-attached-to-a-namespace convention that dnd5e uses (`dice` is one of
  the keys dnd5e hangs off `globalThis.dnd5e`).
- **Changes:** export `async function roll(formula: string, data: object = {}): Promise<Roll>`
  that constructs `new Roll(formula, data)`, awaits `.evaluate()`, and **returns that exact
  instance**. Nothing else. No subclass, no wrapper, no interface of our own over `Roll`.
  Export a `dice` object literal for SS-12 to attach. Do not touch `game.battleframe`.

### Step 5: Verify tests pass

- **Run:** `npm test -- dice`
- **Expected:** PASS — the three tests from Steps 1–3.

### Step 6: Write failing test — chat card carries the ruleset id

- **File:** `packages/battleframe/tests/dice.test.ts`
- **Test name:** `toChat() renders via the Handlebars template and stamps the ruleset id`
- **Asserts:** `renderTemplate` (stubbed) is called with the path
  `systems/battleframe/templates/dice-roll-card.hbs` and a context containing
  `rulesetId`; the created `ChatMessage` data carries the ruleset id (in
  `flags.battleframe.rulesetId`) and the roll; `toChat()` throws a specific, named error when
  `options.rulesetId` is missing — per the master spec's Edge Cases disambiguation,
  *"handles invalid input" → strict*, never coerce, never default to `"unknown"`.
- **Run:** `npm test -- dice`
- **Expected:** FAIL — `toChat` is not exported.

### Step 7: Write failing test — Dice So Nice absent is the normal case

- **File:** `packages/battleframe/tests/dice.test.ts`
- **Test name:** `roll and toChat resolve normally with zero third-party modules present`
- **Asserts:** with no Dice So Nice global, no `game.dice3d`, and an empty `game.modules`,
  `roll("1d6")` resolves and `toChat()` posts a message. Asserts the dice module contains no
  conditional branch keyed on Dice So Nice — i.e. it is never referenced. This is the
  **default** test environment per requirement 10 (zero optional third-party modules).
- **Run:** `npm test -- dice`
- **Expected:** FAIL — `toChat` is not exported.

### Step 8: Implement chat rendering

- **File:** `packages/battleframe/src/dice/chat.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. The template path convention
  `systems/<system-id>/templates/<name>.hbs` is Foundry's standard for system-shipped
  templates; derive `<system-id>` from `constants.ts` (SS-02), not a hardcoded literal — see
  `vault/foundry-systems/settings-and-api-namespace-conventions.md`, which confirms
  `game.system.id` over hardcoded strings "survives forks/renames".
- **Changes:** export `async function toChat(roll, options: DiceChatOptions)`. Validate
  `options.rulesetId` is a non-empty string and **reject** otherwise with an actionable
  error. Render the template, create the `ChatMessage` with the roll attached through
  Foundry's normal roll-message path (so Dice So Nice's hook fires), and set
  `flags.battleframe.rulesetId`. Reference nothing about Dice So Nice.

### Step 9: Implement the chat template

- **File:** `packages/battleframe/templates/dice-roll-card.hbs`
- **Action:** create
- **Pattern:** No existing pattern — greenfield.
- **Changes:** minimal card: flavor, formula, total, and a visible attribution of the
  `rulesetId` that produced the roll. Read only from the context object `toChat` supplies —
  per `vault/foundry-systems/applicationv2-sheet-structure.md` (`confidence: confirmed`),
  templates see *only* the returned context.

### Step 10: Add localisation keys

- **File:** `packages/battleframe/lang/en.json`
- **Action:** modify
- **Changes:** add `BATTLEFRAME.Dice.*` keys used by the chat card. Append only.

### Step 11: Verify all tests pass

- **Run:** `npm test -- dice`
- **Expected:** PASS — all five tests.

### Step 12: Verify the build

- **Run:** `npm run build`
- **Expected:** exit 0.

### Step 13: Commit

- **Stage:** `git add packages/battleframe/src/dice/dice.ts packages/battleframe/src/dice/chat.ts packages/battleframe/templates/dice-roll-card.hbs packages/battleframe/tests/dice.test.ts packages/battleframe/lang/en.json`
- **Message:** `feat: dice service — deliberately thin passthrough to Foundry Roll`

## Acceptance Criteria

Preserved verbatim from master spec SS-07.

- `[STRUCTURAL]` `game.battleframe.dice.roll(formula, data?)` returns a standard Foundry
  `Roll` — not a wrapper type.
- `[MECHANICAL]` `grep -rn "Math.random" packages/battleframe/src/` returns nothing — all
  randomness goes through Foundry's `Roll` so Dice So Nice can hook it.
- `[HUMAN REVIEW]` With Dice So Nice installed, a roll animates with **no** Battleframe
  integration code. Retagged during red-team: requires installing a third-party module in
  a live Foundry — a worker cannot assert this.
- `[BEHAVIORAL]` With Dice So Nice absent, the roll resolves normally and posts to chat.
  This is the default test environment: **zero third-party modules**.
- `[STRUCTURAL]` Chat cards render via a Handlebars template and carry the ruleset id
  that produced them.
- `[MECHANICAL]` `npm test -- dice` passes.

## Completeness Checklist

Every field below must be implemented. No silent omissions.

**`DiceChatOptions`** — the only type this sub-spec defines.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `rulesetId` | `string` (non-empty) | required — reject, never default | `chat.ts` (stamps card + flag); SS-11 clash tests |
| `flavor` | `string` | optional | `dice-roll-card.hbs` card heading |
| `speaker` | `object` (Foundry ChatSpeakerData) | optional | `ChatMessage` creation; defaults to Foundry's own default speaker |

**`roll()` signature.**

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `formula` | `string` | required | `new Roll(formula, data)` |
| `data` | `object` | optional (default `{}`) | `new Roll(formula, data)` — roll data for `@key` substitution |
| *return* | `Roll` (Foundry's own class) | — | SS-10, SS-11. **Must be the same instance Foundry constructed** |

**Chat message flag shape.**

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `flags.battleframe.rulesetId` | `string` | required | attribution; lets a ruleset find its own cards |

**Limits and boundaries.**

- `dice.ts` size: **~100 lines** — the master spec's alarm threshold. Past this, stop and
  ask; it means ruleset mechanics have leaked into core.
- `Math.random()` occurrences in `packages/battleframe/src/`: **exactly 0** — enforced by
  the grep in Checks.
- Wrapper types over `Roll`: **exactly 0** — no class extends or encapsulates `Roll`.
- Dice mechanics implemented (exploding / re-roll / success-count): **exactly 0**.

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test -- dice`
- **Acceptance:**
  - `[STRUCTURAL]` roll returns a standard `Roll` — the `expect(result).toBe(stubInstance)`
    assertion in `dice.test.ts` plus the no-wrapper grep in Checks.
  - `[MECHANICAL]` `Math.random` ban — grep in Checks.
  - `[BEHAVIORAL]` Dice So Nice absent — covered by `dice.test.ts`; Vitest runs with zero
    third-party modules by construction.
  - `[STRUCTURAL]` Handlebars chat card with ruleset id — template file existence plus the
    `renderTemplate` assertion in `dice.test.ts`.
  - `[HUMAN REVIEW]` Dice So Nice animation — **not automatable.** Install Dice So Nice in a
    live Foundry v14 world, roll, observe the 3D animation, and confirm no Battleframe source
    file references Dice So Nice.

## Checks

Generated from `[MECHANICAL]` and `[STRUCTURAL]` criteria only. `[BEHAVIORAL]` and
`[HUMAN REVIEW]` criteria are excluded by design. Each command exits 0 on pass, 1 with a
one-line summary on fail.

| Criterion | Type | Command |
|---|---|---|
| `roll()` returns a standard Foundry `Roll`, not a wrapper type | STRUCTURAL | `if grep -rnE "class[[:space:]]+[A-Za-z0-9_]*[[:space:]]+extends[[:space:]]+Roll\b" packages/battleframe/src/ >/dev/null 2>&1; then echo "FAIL: a class extends Roll — dice must return Foundry's Roll unwrapped"; exit 1; fi; if ! grep -qE "new Roll\(" packages/battleframe/src/dice/dice.ts 2>/dev/null; then echo "FAIL: packages/battleframe/src/dice/dice.ts does not construct a Foundry Roll"; exit 1; fi; exit 0` |
| `grep -rn "Math.random" packages/battleframe/src/` returns nothing | MECHANICAL | `if grep -rn "Math.random" packages/battleframe/src/ >/dev/null 2>&1; then echo "FAIL: Math.random found in packages/battleframe/src/ — it defeats Dice So Nice"; exit 1; fi; exit 0` |
| No dice mechanics leaked into core (SS-07 decision) | STRUCTURAL | `if grep -rniE "explod|reroll|re-roll|successCount|countSuccess" packages/battleframe/src/dice/ >/dev/null 2>&1; then echo "FAIL: dice mechanics found in core dice service — those belong to rulesets"; exit 1; fi; exit 0` |
| Chat cards render via a Handlebars template | STRUCTURAL | `if [ ! -f packages/battleframe/templates/dice-roll-card.hbs ]; then echo "FAIL: packages/battleframe/templates/dice-roll-card.hbs missing"; exit 1; fi; if ! grep -qE "dice-roll-card\.hbs" packages/battleframe/src/dice/chat.ts 2>/dev/null; then echo "FAIL: chat.ts does not reference dice-roll-card.hbs"; exit 1; fi; exit 0` |
| Chat cards carry the ruleset id that produced them | STRUCTURAL | `if ! grep -q "rulesetId" packages/battleframe/src/dice/chat.ts 2>/dev/null; then echo "FAIL: chat.ts does not stamp rulesetId on the chat card"; exit 1; fi; if ! grep -q "rulesetId" packages/battleframe/templates/dice-roll-card.hbs 2>/dev/null; then echo "FAIL: dice-roll-card.hbs does not render rulesetId"; exit 1; fi; exit 0` |
| `dice.ts` stays under the ~100-line design alarm | STRUCTURAL | `n=$(wc -l < packages/battleframe/src/dice/dice.ts 2>/dev/null || echo 0); if [ "$n" -gt 100 ]; then echo "FAIL: packages/battleframe/src/dice/dice.ts is $n lines (>100) — thinness is the feature; something has gone wrong"; exit 1; fi; exit 0` |
| Core dice service does not reference Dice So Nice | STRUCTURAL | `if grep -rniE "dice-so-nice|dice3d|diceSoNice" packages/battleframe/src/ >/dev/null 2>&1; then echo "FAIL: Dice So Nice referenced in core — zero integration code is the requirement"; exit 1; fi; exit 0` |
| `npm test -- dice` passes | MECHANICAL | `npm test -- dice > /dev/null 2>&1 || { echo "FAIL: npm test -- dice did not pass"; exit 1; }; exit 0` |
| `npm run build` exits 0 | MECHANICAL | `npm run build > /dev/null 2>&1 || { echo "FAIL: npm run build did not exit 0"; exit 1; }; exit 0` |

## Patterns to Follow

**No existing codebase — greenfield.** All 63 files in the master spec are new; there is no
prior Battleframe source to match. The references below are **research notes tracked in
git**, not code. Read them before writing; the master spec's trade-off hierarchy ranks
*"Confirmed research over recollection"* third, because Foundry's API changed heavily
v10→v14 and remembered idioms are usually stale.

- `vault/foundry-systems/settings-and-api-namespace-conventions.md` (`confidence: confirmed`):
  the dnd5e namespace pattern — a flat object of service keys (`dice` is literally one of
  them) built at module top level and merged onto `game.system` at `init`. **SS-12 does the
  merging**; SS-07 only supplies the `dice` key. Also confirms preferring `game.system.id`
  over hardcoded package-id strings.
- `vault/foundry-systems/applicationv2-sheet-structure.md` (`confidence: confirmed`):
  relevant only for the Handlebars rule — templates see *only* the context object you return.
  Do not assume the card can reach `roll` internals it was not handed.
- `vault/foundry-systems/v14-breaking-changes-that-matter.md` (`confidence: confirmed`):
  ~40 global class shortcuts were removed in v14 in favour of namespaced paths. `Roll` and
  `ChatMessage` are **not** listed among the removals, so the bare globals are used here.
  **Not found:** an explicit v14 confirmation of `Roll`'s global availability — if the live
  runtime disagrees, the master spec's rule applies (real Foundry wins; correct the note).
- `vault/foundry-systems/foundry-v14-is-current-as-of-july-2026.md`: target is v14 (14.363
  confirmed), ApplicationV2 only.

## Files

Every path in this sub-spec is new. `will-create:` marks paths the spec-reality-gate must
not existence-check.

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe/src/dice/dice.ts` | Create | The passthrough. `roll(formula, data?)` → Foundry `Roll`, unwrapped. ~100-line alarm applies |
| `will-create: packages/battleframe/src/dice/chat.ts` | Create | `toChat(roll, options)` — Handlebars chat card, stamped with `rulesetId` |
| `will-create: packages/battleframe/templates/dice-roll-card.hbs` | Create | The chat card template: flavor, formula, total, ruleset attribution |
| `will-create: packages/battleframe/tests/dice.test.ts` | Create | Test file — Roll identity, passthrough, no `Math.random`, chat card, Dice So Nice absent |
| `packages/battleframe/lang/en.json` | Modify | Append `BATTLEFRAME.Dice.*` chat-card keys. Created by SS-02; also touched by SS-09 |
