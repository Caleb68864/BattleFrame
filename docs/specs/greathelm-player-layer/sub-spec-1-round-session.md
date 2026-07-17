---
type: phase-spec
master_spec: "../2026-07-17-greathelm-player-layer.md"
sub_spec_number: 1
title: "Round session — a suspendable state machine"
date: 2026-07-17
depends_on: []
---

# Sub-Spec 1: Round Session — A Suspendable State Machine

Refined from [2026-07-17-greathelm-player-layer.md](../2026-07-17-greathelm-player-layer.md).

## Scope

Turn the round from one atomic call into a **session the UI drives**. `runRound(options)` today
resolves all 14 dice and returns; player agency means the round must **suspend** at each die and
wait to be told which knight spends it. This sub-spec builds that state machine.

**Pure and headless: no canvas, no Application, no Foundry globals.** This is the load-bearing
piece — SS-02 (panel), SS-03 (highlighting) and SS-04 (prompts) all ask it questions and none of
them may answer their own. It is the **only** place legality is decided.

### This is a control-flow change, not a rules change

The rules functions are **correct and live-verified** on Foundry v14.363 — a real round played:
14 dice, resolved 6→1, opposed clash tests, damage 3/2/1/1 capped at 3, four courage tests.
**Reuse them unchanged.** Write no new rule, no new predicate, no new constant.

| Reuse | From | For |
|---|---|---|
| `actionForFace`, `requiresClashTest` | `src/round/actions.ts` | face → action; which faces need contact |
| `resolveDieAction` (calls `resolveClashTest` + `applyClashDamage`) | `src/round/loop.ts` | resolving one clash die |
| `isInBaseContact`, `isBaseContactDistance` | `src/combat/clash.ts` | **the** contact predicate, tolerance included |
| `runCouragePhase` | `src/round/courage.ts` | the courage phase, when the last die is spent |
| `planMovement`, `nearestEnemy`, `findDefenderInBaseContact` | `src/ui/round-control.ts` | movement allowance; contact lookups |
| `RoundKnight`, `ActorLike`, `MovementPlan`, `ResolvedDie` | `src/ui/round-control.ts`, `src/round/loop.ts` | types — do not redeclare |

`src/ui/round-control.ts` is safe to import from a pure module: everything above its
"Foundry glue" banner is pure and injectable, its `Hooks` use is guarded by `hooksAvailable()`
behind a function, and `tests/round-control.test.ts` already imports it under vitest's `node`
environment with no globals present. **Do not move those helpers into `src/round/`** — that is
outside this sub-spec's file list and would collide with SS-05.

### Rejected design, do not revisit

**Keeping `runRound` and passing a `chooseKnight` callback.** It inverts control — the round
would call *up* into the UI and block. A session the UI *pulls* from is testable without a
canvas, matches how the game is actually played (you look at your pool and decide), and is the
shape the Resolution Stack will want when INX's reactions eventually interrupt an activation.
`runRound` and `resolveBattlePhaseOrder` **stay where they are, unmodified** — this sub-spec adds
a second way to play a round; it does not delete the first. SS-05 retires the caller.

### The ordering model, restated exactly

`resolveBattlePhaseOrder` (`src/round/loop.ts:54`) is the specification of turn order and the
session must agree with it die-for-die:

- Faces are walked **6 → 1**. A face with no unspent dice on either side is skipped entirely.
- Within a face step, players **alternate one die at a time**, restarting at `firstPlayerId` at
  the top of **each** face step (`rotateToFirst`, then `for (const playerId of turnOrder)`).
- A player with no dice at the current face is **skipped without stalling** the other.

Derived: `currentFace()` is the highest unspent face **across both sides**; a die of face N is
never offerable while any unspent die of face > N remains, on either side.

### Facts that already cost this project dearly

1. **Never `=== 0` for base contact.** Foundry stores token x/y as **integers**, so exact contact
   is measure-zero and a `=== 0` test fires essentially never — fourteen dice, zero damage, zero
   courage tests. The tolerance lives in `clash.ts` (`BASE_CONTACT_TOLERANCE_PX`, and the
   `isBaseContactDistance` / `isInBaseContact` predicates). **Use that predicate. Never re-derive
   one.** Three duplicate `=== 0` checks once existed; fixing one would have been worse than
   fixing none.
2. **A canvas Token has NO `.flags`** — they live on `token.document.flags` — and `placeable.width`
   is **PIXI bounds** (measured: 9 and 32), not grid units; use `document.width`. See
   `vault/foundry-systems/real-tokens-keep-their-flags-on-the-document.md` (`confirmed`). The
   session never touches the canvas, but its **test doubles must not manufacture confidence**:
   189 tests once passed against doubles with top-level `flags` while every real token broke.
   Session tokens are opaque and handed only to `measure.between`, exactly as `loop.ts` and
   `clash.ts` do.
3. **Never run two vitest processes concurrently** — they race global data-model registration.

## Interface Contracts

### Provides

- `createRoundSession(options: RoundSessionOptions): RoundSession` — the factory named by the
  master spec. Constructs the unspent pool from `pools` (dice are **not** pre-assigned to
  knights — that assignment is the player's decision and is made at `spendDie` time).
- `RoundSession` — the object SS-02/SS-03/SS-04 drive. Members below.
- `SessionDie`, `RemainingDie`, `LegalTarget`, `LegalTargets`, `IllegalReason`, `DieOutcome`,
  `RoundSessionOptions` — exported types.
- `IllegalSpendError`, `UnknownDieError`, `UnknownKnightError` — thrown, never swallowed.

| Member | Signature | Contract |
|---|---|---|
| `remainingDice` | `() => readonly RemainingDie[]` | Every unspent die, both sides, sorted face-descending. `offerable` marks the dice the session will accept **right now**. |
| `legalTargetsFor` | `(dieId: string) => LegalTargets` | For each of the **active player's** knights: legal, or a machine-readable `reason`. Re-derived on every call. Throws `UnknownDieError` for an unknown/spent die. |
| `spendDie` | `(dieId: string, knightId: string, choices?: SpendChoices) => Promise<DieOutcome>` | Resolves exactly one die. Throws on an illegal pair. |
| `isComplete` | `() => boolean` | True once no unspent dice remain. |
| `activePlayerId` | `() => string \| undefined` | Whose die it is. `undefined` when complete. |
| `currentFace` | `() => DieFace \| undefined` | The face step in progress. `undefined` when complete. |
| `contactedEnemies` | `(knightId: string) => readonly string[]` | Enemy knight ids in base contact — **SS-04's target list**. |
| `discardDie` | `(dieId: string) => DieOutcome` | Spends an offerable die that has **no** legal target. Throws if any target is legal. |
| `order` | `() => readonly string[]` | Knight ids in the sequence their dice were spent — SS-05 persists this. |
| `courageOutcomes` | `() => ReadonlyMap<string, CourageTestOutcome> \| undefined` | Populated when the last die is spent. |

### Requires

Nothing from another sub-spec — this is the root. From the existing, live-verified codebase:

- `packages/battleframe-greathelm/src/round/loop.ts` — `resolveDieAction`, types `ActorLike`,
  `ResolvedDie`, `ClashParticipantRef`.
- `packages/battleframe-greathelm/src/round/actions.ts` — `actionForFace`, `requiresClashTest`.
- `packages/battleframe-greathelm/src/round/courage.ts` — `runCouragePhase`, `CourageKnight`,
  `CourageTestOutcome`.
- `packages/battleframe-greathelm/src/combat/clash.ts` — `isInBaseContact`, `DiceApiLike`,
  `MeasureApiLike`.
- `packages/battleframe-greathelm/src/round/dice-pool.ts` — `RolledDie`.
- `packages/battleframe-greathelm/src/ui/round-control.ts` — `planMovement`, `nearestEnemy`,
  `findDefenderInBaseContact`, `RoundKnight`.
- `packages/battleframe-greathelm/src/constants.ts` — `DieFace`, `ActionId`, `MODULE_ID`.

### Shared State

- **`packages/battleframe-greathelm/src/round/session.ts` is the sole source of legality.** SS-02
  renders `LegalTargets`; SS-03 highlights from it; SS-04 reads `contactedEnemies`. None of them
  re-derives it. Two copies of a predicate is how the `=== 0` bug survived in three places.
- **`IllegalReason` is a shared vocabulary.** SS-02 maps each member to an i18n key with a
  `Record<IllegalReason, string>`, so adding a reason here breaks SS-02's build rather than
  shipping a raw key. Changing this union is a cross-sub-spec change.
- **Session state is in-memory for the round.** A reload loses it (master spec, committed
  decision). SS-02 must state that in the UI.
- No Foundry document, setting, or flag is written by this sub-spec. `writeRoundOrderToCombatFlags`
  / `combat.setFlag` stay at the call site (SS-05), which is why `order()` exists.

## Implementation Steps

### Step 1: Write failing test — the session exists and exposes its surface

- **File:** `packages/battleframe-greathelm/tests/session.test.ts`
- **Test name:** `createRoundSession exposes the driven-round surface`
- **Asserts:** `createRoundSession({knights, pools, firstPlayerId, dice, measure})` returns an
  object whose `remainingDice`, `legalTargetsFor`, `spendDie`, `isComplete` and `activePlayerId`
  are all functions; `remainingDice()` has one entry per rolled die across both pools, each with a
  stable unique `id`, its `playerId`, its `face`, and the `action` that face buys.
- **Fixtures:** reuse `tests/round-control.test.ts`'s `scriptedDice` (a `DiceApiLike` reading faces
  from a script — no `Math.random()` anywhere near a test) and `lineMeasure` (a `MeasureApiLike`
  returning base-to-base gap along a line, where `0` means bases touching, as the real service
  reports). Copy them into `session.test.ts`; do not export them from the round-control test.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** FAIL — `Cannot find module '../src/round/session'`.

### Step 2: Implement the session skeleton

- **File:** `packages/battleframe-greathelm/src/round/session.ts`
- **Action:** create
- **Pattern:** Follow `src/round/loop.ts` — exported interfaces first, injected `dice`/`measure`
  APIs, a doc comment on every exported function naming its QSR source or marking it explicitly as
  engine behaviour. Follow `src/ui/round-control.ts`'s provenance discipline verbatim.
- **Changes:**
  - `RoundSessionOptions`:
    - `knights: readonly RoundKnight[] | (() => readonly RoundKnight[])` — normalize internally to
      a getter (`typeof knights === "function" ? knights : () => knights`) and **call it on every
      query**. This is what makes "a knight removed mid-round does not break the session" true:
      legality is re-derived from the live board, never cached. Callers on a canvas pass
      `() => gatherKnightsFromCanvas()`; tests pass a mutable array or a closure.
    - `pools: ReadonlyMap<string, readonly RolledDie[]>` — each player's rolled faces, as
      `determineInitiativeWithRerolls` already returns them (`InitiativeRoll.pools`).
    - `firstPlayerId: string`.
    - `dice: DiceApiLike`, `measure: MeasureApiLike` — **injected, never read off a global.** The
      three named in the master spec's STRUCTURAL criterion are the load-bearing ones; these two
      are the purity mechanism.
    - `playerIds?: readonly string[]` — defaults to `[...pools.keys()]`.
  - Mint dice from `pools`: `{ id: `${playerId}-d${index + 1}`, playerId, face, action: actionForFace(face) }`
    — the same id shape `assignDiceToKnights` mints, minus the `knightId`. **The missing `knightId`
    is the whole point of this sub-spec.**
  - Internal `spent: Set<string>` and `orderSpent: string[]`. Nothing else is cached.
- **Note:** `session.ts` must contain **no** occurrence of `canvas.`, `ui.`, or `game.` — including
  in comments and doc blocks. A `[STRUCTURAL]` criterion greps for exactly that. Write
  "the panel", not "the ui."; "the shared dice service", not "game.battleframe.dice".

### Step 3: Verify

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** PASS

### Step 4: Write failing test — 6→1 enforcement

- **File:** `packages/battleframe-greathelm/tests/session.test.ts`
- **Test name:** `does not offer a die while any higher face is unspent`
- **Asserts:** with pools `A: [6, 2]`, `B: [5, 1]`, `firstPlayerId: "A"`: `currentFace()` is `6`;
  exactly one `remainingDice()` entry is `offerable` (A's 6); the 5, 2 and 1 are all
  `offerable: false`. After spending A's 6, `currentFace()` is `5` and only B's 5 is offerable —
  **a higher face on the other side still blocks a lower one, because faces are walked globally.**
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** FAIL — every die reports `offerable: true`.

### Step 5: Implement ordering — `currentFace`, `activePlayerId`, `offerable`

- **File:** `packages/battleframe-greathelm/src/round/session.ts`
- **Action:** modify
- **Pattern:** Mirror `resolveBattlePhaseOrder` (`src/round/loop.ts:54`) exactly; cite it in the
  doc comment. Do not re-derive the ordering rule from the QSR — it is already encoded and
  live-verified.
- **Changes:**
  - `currentFace()` = the maximum `face` among unspent dice, or `undefined` when none remain.
  - Alternation pointer: an index into `rotateToFirst(playerIds, firstPlayerId)`, **reset to 0
    whenever `currentFace()` changes** — `resolveBattlePhaseOrder` rebuilds its queues and
    restarts `turnOrder` at the top of every face step.
  - `activePlayerId()` = walking from the pointer, the first player holding an unspent die at
    `currentFace()`. A side with none at this face is skipped without stalling the other; a side
    entirely out of dice never blocks.
  - `offerable` = `face === currentFace() && playerId === activePlayerId()`.
  - `remainingDice()` sorts face-descending (SS-02 renders "highest face first"); ties keep mint
    order, so the pool reads stably between renders.

### Step 6: Verify

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** PASS

### Step 7: Write failing test — alternation, and a side running out

- **File:** `packages/battleframe-greathelm/tests/session.test.ts`
- **Test names:**
  - `sides alternate one die at a time within a face step`
  - `a side with no dice left does not stall the other`
- **Asserts:**
  - Pools `A: [6, 6]`, `B: [6, 6]`, first `A`: `activePlayerId()` reads `A, B, A, B` across four
    spends onto movement-legal knights.
  - Pools `A: [6, 6, 6]`, `B: [6]`, first `A`: the sequence is `A, B, A, A` — once B is out, A
    continues to completion and `isComplete()` becomes true. **No stall, no throw.**
  - Pools `A: [6]`, `B: [3]`, first `A`: after A's 6 is spent, `activePlayerId()` is `B` even
    though the alternation pointer would have returned to `A` — the face step changed and A holds
    nothing at face 3.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** FAIL

### Step 8: Verify (implementation from Step 5 should satisfy these; fix ordering if not)

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** PASS

### Step 9: Write failing test — legality and machine-readable reasons

- **File:** `packages/battleframe-greathelm/tests/session.test.ts`
- **Test names:**
  - `legalTargetsFor lists only the active player's knights`
  - `a clash die is illegal for a knight with no enemy in base contact, and says why`
  - `a movement die is legal for any of the active player's knights`
  - `legality is re-derived, never cached`
- **Asserts:**
  - Face `1` (Heavy) with A's knight 4" from the nearest enemy →
    `{ knightId: "a1", legal: false, reason: "no-enemy-in-base-contact" }`. The **reason is a
    machine-readable token, not a sentence** — SS-02 renders it.
  - The same die with the knight at a gap of `0.0001574803149606563` (the **measured live value**
    for two 32mm bases 126px apart — see `BASE_CONTACT_TOLERANCE_PX`) → `legal: true`.
    **A `=== 0` implementation fails this test. That is the test's entire purpose.**
  - Face `6` (Sprint) → every present A knight is legal, contact irrelevant.
  - `legalTargetsFor` on a `dieId` that is unknown or already spent throws `UnknownDieError`.
  - Mutating the knights array between two `legalTargetsFor` calls (move a knight into contact)
    changes the answer with no re-construction of the session.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** FAIL

### Step 10: Implement `legalTargetsFor` and `contactedEnemies`

- **File:** `packages/battleframe-greathelm/src/round/session.ts`
- **Action:** modify
- **Pattern:** Contact comes from `isInBaseContact(measure, a.token, b.token)` in
  `src/combat/clash.ts` — the one predicate, tolerance included. `findDefenderInBaseContact`
  (`src/ui/round-control.ts:373`) is the existing "is anything touching me" answer and already
  reuses the measured distance rather than re-measuring.
- **Changes:**
  - `export type IllegalReason = "no-enemy-in-base-contact" | "knight-removed" | "not-your-knight";`
    Keep it **closed and small** — SS-02 maps it exhaustively with `Record<IllegalReason, string>`.
  - `LegalTarget = { knightId: string; legal: boolean; reason?: IllegalReason }`;
    `LegalTargets = { dieId: string; face: DieFace; action: ActionId; playerId: string; targets: readonly LegalTarget[]; anyLegal: boolean }`.
  - `legalTargetsFor(dieId)`: read the live knights, filter to `die.playerId`'s, and for each:
    - `requiresClashTest(die.action)` → legal iff `findDefenderInBaseContact(knight, knights, measure)`
      is defined; otherwise `reason: "no-enemy-in-base-contact"`.
    - movement face → always legal (Sprint/Encircle/Shift auto-succeed; `planMovement` may still
      return `null` when there is no enemy to measure toward — **that is a spendable die with no
      plan, not an illegal one**).
  - `contactedEnemies(knightId)`: every enemy `other` where `isInBaseContact(measure, knight.token, other.token)`.
    Throws `UnknownKnightError` if the knight is not on the live board. This is **SS-04's only**
    target list — SS-04 must not walk the board itself.
  - **No new tolerance, no new distance maths, no numeric literal.** If you type `=== 0` or a
    number of inches in this file, stop.

### Step 11: Verify

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** PASS

### Step 12: Write failing test — an illegal spend throws

- **File:** `packages/battleframe-greathelm/tests/session.test.ts`
- **Test names:**
  - `spendDie throws when the knight has no enemy in base contact`
  - `spendDie throws when the die is not the offered one`
  - `spendDie throws for an enemy knight, an unknown knight, and a spent die`
  - `a rejected spend leaves the session untouched`
- **Asserts:** each throws `IllegalSpendError` (or `UnknownDieError` / `UnknownKnightError`) with
  a message beginning `battleframe-greathelm | `, carrying the `dieId`, the `knightId` and the
  `reason`. **`expect(...).rejects.toThrow(...)` — never `expect(result).toBeUndefined()`: a
  silent no-op is the failure mode this criterion exists to forbid.** After a rejected spend,
  `remainingDice().length` is unchanged and `isComplete()` is still false.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** FAIL

### Step 13: Implement `spendDie`

- **File:** `packages/battleframe-greathelm/src/round/session.ts`
- **Action:** modify
- **Pattern:** Error classes follow `WrongSideCountError` / `InitiativeTieUnresolvedError` in
  `src/ui/round-control.ts:55` — a named class, `this.name` set, `${MODULE_ID} | ` prefixed
  message. Resolution follows `runRoundFromControl`'s `onActivate` (`src/ui/round-control.ts:549`)
  — but **throwing where that skipped**, because there the loop chose the knight and here a human
  did.
- **Changes:**
  - Guard order, all **loud**: unknown/spent die → `UnknownDieError`; die not `offerable` →
    `IllegalSpendError` (the panel should never have offered it — that is a bug and must be loud);
    knight absent from the live board → `UnknownKnightError`; knight on the wrong side →
    `IllegalSpendError` with `reason: "not-your-knight"`; knight illegal per `legalTargetsFor` →
    `IllegalSpendError` carrying that exact `reason`.
  - Resolve, reusing the verified functions with **no changes to them**:
    - movement face → `planMovement(resolvedDie, knight, knights, measure)`; report the plan.
      **Do not move the token.** Auto-movement is out of scope and would silently break a
      `confirmed` rule (knights cannot move through models, terrain, or gaps narrower than their
      base) — the engine states the legal distance; the GM moves the model.
    - clash face → defender is `choices?.defenderId` when given (validated: it must appear in
      `contactedEnemies(knightId)`, else `IllegalSpendError`), otherwise the single contacted
      enemy. Call `resolveDieAction(resolvedDie, attackerRef, { measure, dice, defender })` —
      which resolves the opposed test and applies capped damage to the defender's Actor. **Do not
      re-implement either.**
  - `SpendChoices = { defenderId?: string }` — SS-04's seam. When 2+ enemies are contacted and no
    `defenderId` is supplied, fall back to the **documented engine default**: the first enemy in
    contact (`findDefenderInBaseContact`'s nearest). Comment it as an engine default, not a rule.
  - Mark the die spent, push `knightId` onto `orderSpent`, return the `DieOutcome`.

### Step 14: Verify

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** PASS

### Step 15: Write failing test — completion runs courage

- **File:** `packages/battleframe-greathelm/tests/session.test.ts`
- **Test names:**
  - `the last die spent completes the round and runs the courage phase`
  - `courage is not offered as a player choice`
- **Asserts:** with a script that leaves a damaged A knight in base contact, spending the final die
  makes `isComplete()` true, and `courageOutcomes()` holds an entry for that knight and **not** for
  an undamaged one nor for a damaged one standing alone (`knightsRequiringCourageTest`'s two
  conditions). The final `DieOutcome` carries the same map. The session exposes **no** method to
  choose who tests or in what order — the rulebook decides both.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** FAIL

### Step 16: Implement completion → courage

- **File:** `packages/battleframe-greathelm/src/round/session.ts`
- **Action:** modify
- **Pattern:** Build `warbandsKnights` the way `runRoundFromControl` does
  (`src/ui/round-control.ts:508`) — `{ id, ownerId, damage: knight.actor.system?.damage ?? 0, inBaseContactWithEnemy }`
  — but **build it at completion time from the live board**, which is strictly better than that
  function's live-view syncing: nothing to keep in sync, nothing to snapshot stale. Damage is read
  from the Actor the wound was just written to.
- **Changes:** when the final die is spent, `await runCouragePhase(dice, warbandsKnights)`, store
  the result, and attach it to that die's `DieOutcome`. Removed knights are simply absent from the
  live board and therefore absent from the warbands. **Courage runs strictly after the battle
  phase** (QSR p2: "after all initiative dice have been spent"). `discardDie` completing the round
  triggers it identically.

### Step 17: Verify

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** PASS

### Step 18: Write failing test — a vanished knight

- **File:** `packages/battleframe-greathelm/tests/session.test.ts`
- **Test names:**
  - `a knight removed mid-round does not break the session`
  - `a die whose owner has no legal target can be discarded, and discarding an offered die throws`
- **Asserts:**
  - Remove a knight from the live board between two spends: `legalTargetsFor` no longer lists it;
    `spendDie` onto it throws `UnknownKnightError`; the remaining dice still resolve; the round
    still completes; the courage phase does not test the removed knight.
  - Remove **every** A knight while A holds a die: `legalTargetsFor(dieId).anyLegal` is false,
    `discardDie(dieId)` marks it spent with `discarded: true`, the round proceeds, and
    `isComplete()` is eventually reached. **Without this the round deadlocks.**
  - `discardDie` on a die with at least one legal target throws `IllegalSpendError` — discarding
    is never a shortcut past a decision.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** FAIL

### Step 19: Implement `discardDie` and vanished-knight tolerance

- **File:** `packages/battleframe-greathelm/src/round/session.ts`
- **Action:** modify
- **Pattern:** This is `runRoundFromControl`'s existing documented behaviour made explicit —
  today a clash die with no defender is notified and skipped (`src/ui/round-control.ts:570`:
  *"Bash/Light/Heavy require base contact (QSR p1). No contact, no legal spend -- skipped rather
  than resolved at range"*). Comment it as **engine behaviour, not a rule**, in those terms.
- **Changes:** `discardDie(dieId)` — guards identical to `spendDie` for the die itself, then
  refuses unless `anyLegal` is false. Returns `{ die, knightId: "", movement: null, clash: null, discarded: true }`
  and runs courage if it was the last die. Nothing else in the session caches a knight, so
  vanished-knight tolerance is a property of the live-getter from Step 2 rather than new code.

### Step 20: Verify the whole sub-spec

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session`
- **Expected:** PASS — all of: 6→1 enforcement, alternation, a side running out, an illegal spend
  throwing, a vanished knight, completion triggering courage.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm run build > /tmp/build.log 2>&1; echo $?`
- **Expected:** `0`. **Do not pipe build output into `tail`/`head`** — vite takes EPIPE and reports
  a false non-zero. Redirect to a file.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test`
- **Expected:** PASS, **≥218 tests, none regressed**. Run it **alone** — two concurrent vitest
  processes race global data-model registration.

### Step 21: Commit

- **Stage:** `git add packages/battleframe-greathelm/src/round/session.ts packages/battleframe-greathelm/tests/session.test.ts`
- **Message:** `feat: round session — a suspendable state machine`

## Acceptance Criteria

<!--
  Verbatim from docs/specs/2026-07-17-greathelm-player-layer.md, SS-01.
  Preserved exactly, including the `[TYPE]` tags and the inline commands.
-->

- `[STRUCTURAL]` `createRoundSession({knights, pools, firstPlayerId})` returns an object
  exposing at least: `remainingDice()`, `legalTargetsFor(dieId)`, `spendDie(dieId, knightId, choices?)`,
  `isComplete()`, `activePlayerId()`.
- `[STRUCTURAL]` `legalTargetsFor` returns, for each of the active player's knights, whether
  the die may activate it **and a machine-readable reason when it may not** (e.g.
  `no-enemy-in-base-contact`). The panel renders the reason; it does not compute it.
- `[BEHAVIORAL]` The session enforces **6→1**: it will not offer a die of face N while any
  unspent die of face > N remains.
- `[BEHAVIORAL]` Sides **alternate**; when one side has no dice left the other continues.
- `[BEHAVIORAL]` `spendDie` with an illegal `(die, knight)` pair **throws** — it does not
  silently no-op. The panel should never have offered it; if it did, that is a bug and must
  be loud.
- `[BEHAVIORAL]` When the last die is spent, `isComplete()` is true and the courage phase
  runs via the existing `runCouragePhase` — **courage is not a player choice**.
- `[BEHAVIORAL]` A knight removed mid-round (reduced to 0) does not break the session;
  legality is re-derived, never cached.
- `[MECHANICAL]` `cd "$(git rev-parse --show-toplevel)" && npm test -- session` passes,
  covering: 6→1 enforcement, alternation, a side running out, an illegal spend throwing, a
  vanished knight, and completion triggering courage.
- `[STRUCTURAL]` `session.ts` imports **nothing** from `foundry`, `canvas`, `ui`, or
  `game` — verified by `[ -z "$(grep -rnE "\\b(canvas|ui|game)\\." packages/battleframe-greathelm/src/round/session.ts)" ]`
  exiting 0. It is a pure module.

## Completeness Checklist

**`RoundSessionOptions`** — every field must be implemented; no silent omissions.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `knights` | `readonly RoundKnight[] \| (() => readonly RoundKnight[])` | required | every legality query; the live-getter is what makes a vanished knight safe |
| `pools` | `ReadonlyMap<string, readonly RolledDie[]>` | required | minting the unspent dice; shape matches `InitiativeRoll.pools` |
| `firstPlayerId` | `string` | required | `rotateToFirst` at the top of each face step |
| `dice` | `DiceApiLike` | required | `resolveDieAction` → `resolveClashTest`; `runCouragePhase` |
| `measure` | `MeasureApiLike` | required | `isInBaseContact`, `planMovement`, `nearestEnemy` |
| `playerIds` | `readonly string[]` | optional — defaults to `[...pools.keys()]` | alternation order |

**`SessionDie`**

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `id` | `string` | required | `spendDie`, `legalTargetsFor`, SS-02's click target |
| `playerId` | `string` | required | alternation; side filtering |
| `face` | `DieFace` (1–6) | required | 6→1 ordering; SS-02 renders it |
| `action` | `ActionId` | required | SS-02 renders the action name; `requiresClashTest` |

**`RemainingDie`** — `SessionDie` plus:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `offerable` | `boolean` | required | SS-02's "visibly unavailable" criterion |

**`LegalTarget`**

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `knightId` | `string` | required | SS-02's click target; SS-03's highlight key |
| `legal` | `boolean` | required | SS-02, SS-03 |
| `reason` | `IllegalReason` | optional — present iff `legal === false` | SS-02 renders it via `Record<IllegalReason, string>` |

**`LegalTargets`**

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `dieId` | `string` | required | SS-02 correlates the render to the selection |
| `face` | `DieFace` | required | SS-02 header |
| `action` | `ActionId` | required | SS-02 header |
| `playerId` | `string` | required | SS-02 shows whose turn it is |
| `targets` | `readonly LegalTarget[]` | required | SS-02, SS-03 |
| `anyLegal` | `boolean` | required | SS-02 offers `discardDie` only when false |

**`DieOutcome`**

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `die` | `SessionDie` | required | SS-02's report line |
| `knightId` | `string` | required — `""` when discarded | `order()`; SS-02's report line |
| `movement` | `MovementPlan \| null` | required | SS-02 reports the capped allowance (`formatInches`) |
| `clash` | `ClashResult \| null` | required | SS-02 reports rolls and damage |
| `discarded` | `boolean` | required | SS-02 distinguishes "played" from "no legal spend" |
| `courageOutcomes` | `ReadonlyMap<string, CourageTestOutcome>` | optional — present only on the final die | SS-02's end-of-round report |

**`IllegalReason`** — the closed union. All three members must exist; SS-02 maps them exhaustively.

| Member | Meaning |
|---|---|
| `no-enemy-in-base-contact` | Bash/Light/Heavy with nothing touching (QSR p1) |
| `knight-removed` | the knight is no longer on the live board |
| `not-your-knight` | the knight belongs to the other side — never offered; throws if spent |

**Limits and boundaries**

- Die faces: `1..6` — `DieFace` in `constants.ts`; the session mints nothing outside it.
- Face step order: `6 → 1`, descending, no gaps skipped except empty ones — enforced by
  `currentFace()`; the authority is `resolveBattlePhaseOrder`.
- Sides: exactly `2` — GREATHELM is a two-player game (QSR p1). The session does not re-check
  side count; `WrongSideCountError` stays at the call site (`runRoundFromControl`, SS-05).
- Damage cap: `3` — enforced inside `applyClashDamage`. **The session must not re-apply it.**
- Base contact tolerance: `BASE_CONTACT_TOLERANCE_PX = 2` — enforced inside `clash.ts`. **The
  session must not re-derive it, restate it, or compare to `0`.**
- New numeric literals introduced by this sub-spec: **zero**.

## Verification Commands

- **Build:** `cd "$(git rev-parse --show-toplevel)" && npm run build > /tmp/build.log 2>&1; echo $?`
  → `0`. Typechecks (the root script runs `tsc --noEmit` first). **Never pipe into `tail`/`head`.**
- **Tests:** `cd "$(git rev-parse --show-toplevel)" && npm test -- session` → passes.
- **Full suite:** `cd "$(git rev-parse --show-toplevel)" && npm test` → ≥218 tests, none regressed.
  Run alone; never two vitest processes at once.
- **Acceptance:** each `[MECHANICAL]` / `[STRUCTURAL]` criterion has an exact command in
  **Checks** below. `[BEHAVIORAL]` criteria are asserted by the named tests in
  `tests/session.test.ts` (Steps 4, 7, 12, 15, 18).

## Checks

Generated from `[MECHANICAL]` and `[STRUCTURAL]` criteria **only**. `[BEHAVIORAL]` criteria are
excluded by design — they are asserted by `tests/session.test.ts`, which the `npm test -- session`
check runs. Each command exits `0` on pass, `1` with a one-line summary on fail. Run from the
repository root.

| Criterion | Type | Command |
|---|---|---|
| `createRoundSession` exists and exposes the required surface | STRUCTURAL | `f=packages/battleframe-greathelm/src/round/session.ts; [ -f "$f" ] \|\| { echo "FAIL: $f missing"; exit 1; }; for m in createRoundSession remainingDice legalTargetsFor spendDie isComplete activePlayerId; do grep -q "$m" "$f" 2>/dev/null \|\| { echo "FAIL: session.ts does not expose $m"; exit 1; }; done; exit 0` |
| `legalTargetsFor` returns a machine-readable reason | STRUCTURAL | `f=packages/battleframe-greathelm/src/round/session.ts; grep -q "IllegalReason" "$f" 2>/dev/null \|\| { echo "FAIL: session.ts declares no IllegalReason union — the panel would have to compute the reason"; exit 1; }; grep -q "no-enemy-in-base-contact" "$f" 2>/dev/null \|\| { echo "FAIL: session.ts does not emit the no-enemy-in-base-contact reason"; exit 1; }; exit 0` |
| `session.ts` is pure — no `canvas`/`ui`/`game` | STRUCTURAL | `[ -z "$(grep -rnE '\b(canvas\|ui\|game)\.' packages/battleframe-greathelm/src/round/session.ts)" ] \|\| { echo "FAIL: session.ts touches a Foundry global (canvas./ui./game.) — it must be pure and headless"; exit 1; }; exit 0` |
| `session.ts` imports nothing from `foundry` | STRUCTURAL | `[ -z "$(grep -rnE 'from \"foundry\|require\\(.foundry\|foundry\\.applications' packages/battleframe-greathelm/src/round/session.ts)" ] \|\| { echo "FAIL: session.ts imports from foundry — it must be pure and headless"; exit 1; }; exit 0` |
| The session never re-derives the contact predicate | STRUCTURAL | `[ -z "$(grep -rnE '=== 0\|distance === \|BASE_CONTACT_TOLERANCE' packages/battleframe-greathelm/src/round/session.ts)" ] \|\| { echo "FAIL: session.ts re-derives base contact — use isInBaseContact/isBaseContactDistance from src/combat/clash.ts"; exit 1; }; exit 0` |
| The session reuses the verified rules rather than reimplementing them | STRUCTURAL | `f=packages/battleframe-greathelm/src/round/session.ts; for fn in resolveDieAction runCouragePhase actionForFace requiresClashTest; do grep -q "$fn" "$f" 2>/dev/null \|\| { echo "FAIL: session.ts does not reuse $fn — this is a control-flow change, not a rules change"; exit 1; }; done; exit 0` |
| An illegal spend throws rather than no-opping | STRUCTURAL | `f=packages/battleframe-greathelm/src/round/session.ts; grep -q "IllegalSpendError" "$f" 2>/dev/null \|\| { echo "FAIL: session.ts declares no IllegalSpendError — an illegal spend must be loud, never a silent no-op"; exit 1; }; grep -qE "throw new " "$f" 2>/dev/null \|\| { echo "FAIL: session.ts never throws"; exit 1; }; exit 0` |
| `npm test -- session` passes | MECHANICAL | `cd "$(git rev-parse --show-toplevel)" && npm test -- session > /tmp/ss01-test.log 2>&1 \|\| { echo "FAIL: npm test -- session did not pass (see /tmp/ss01-test.log)"; exit 1; }; exit 0` |
| The session's test file covers all six named cases | MECHANICAL | `f=packages/battleframe-greathelm/tests/session.test.ts; [ -f "$f" ] \|\| { echo "FAIL: $f missing"; exit 1; }; for c in "higher face" "alternate" "no dice left" "throws" "removed mid-round" "courage"; do grep -qi "$c" "$f" 2>/dev/null \|\| { echo "FAIL: tests/session.test.ts has no case for '$c'"; exit 1; }; done; exit 0` |
| Core requires zero changes | MECHANICAL | `[ -z "$(grep -rniE 'greathelm\|knight\|sprint\|encircle\|clash' packages/battleframe/src/)" ] \|\| { echo "FAIL: packages/battleframe/src references a GREATHELM concept — core neutrality is breaking, stop and escalate"; exit 1; }; exit 0` |
| `npm run build` exits 0 (typechecks) | MECHANICAL | `cd "$(git rev-parse --show-toplevel)" && npm run build > /tmp/ss01-build.log 2>&1 \|\| { echo "FAIL: npm run build did not exit 0 (see /tmp/ss01-build.log)"; exit 1; }; exit 0` |
| No test regressed | MECHANICAL | `cd "$(git rev-parse --show-toplevel)" && npm test > /tmp/ss01-full.log 2>&1 \|\| { echo "FAIL: the full suite did not pass (see /tmp/ss01-full.log) — 218 tests passed before this sub-spec and none may regress"; exit 1; }; exit 0` |

## Patterns to Follow

**There is a real, live-verified codebase.** This is not greenfield. Every reference below is a
file in this repo that already works in a Foundry v14.363 world.

- `packages/battleframe-greathelm/src/round/loop.ts` — the module to match for shape and
  discipline: exported interfaces, injected `dice`/`measure`, a doc comment on every export citing
  its QSR page or vault note. `resolveBattlePhaseOrder` (line 54) **is** the ordering
  specification — mirror it, do not reinvent it. `resolveDieAction` (line 154) is the one-die
  resolution the session calls. `applyClashDamage` already caps at 3.
- `packages/battleframe-greathelm/src/combat/clash.ts` — `isInBaseContact` / `isBaseContactDistance`
  and the 80-line comment on `BASE_CONTACT_TOLERANCE_PX` explaining why `=== 0` cannot work on
  integer pixel coordinates. **This is the only contact predicate in the ruleset. Call it.**
- `packages/battleframe-greathelm/src/ui/round-control.ts` — `planMovement` (line 321),
  `nearestEnemy` (line 275), `findDefenderInBaseContact` (line 373), and the `RoundKnight` type
  (line 87). Its header comment is the provenance discipline to copy verbatim: *"GREATHELM rules
  come from constants.ts and the vault. Where the QSR gives a human a choice that this automation
  cannot ask for, the choice is made by a documented ENGINE DEFAULT exposed as a swappable seam --
  never by inventing a rule."* This sub-spec is where those seams finally get a human on the other
  end. `WrongSideCountError` (line 55) is the error-class pattern.
- `packages/battleframe-greathelm/src/round/courage.ts` — `runCouragePhase` (line 111) and the
  `CourageKnight` shape. Note `knightsRequiringCourageTest`: **both** damaged **and** in base
  contact, never one or the other.
- `packages/battleframe-greathelm/src/ui/round-control.ts:508` — how `runRoundFromControl` builds
  `warbandsKnights` and why it keeps the views live rather than snapshotting damage.
- `packages/battleframe-greathelm/tests/round-control.test.ts` — the test doubles to reuse:
  `scriptedDice` (deterministic faces, no `Math.random()`) and `lineMeasure` (positions in inches
  along a line; the return value is the **base-to-base gap**, as the real service reports).
  `tests/loop.test.ts` and `tests/base-contact.test.ts` are the assertion style to match.
- `vault/greathelm/action-economy-per-die-not-per-model.md` (`confirmed`) — the rule this whole
  spec exists to restore: *"A knight can be activated multiple times in a round, or not at all. It
  is your choice."* **No activation limit.** The session must never cap a knight's dice.
- `vault/greathelm/battle-phase-initiative-steps.md`, `vault/greathelm/dice-face-to-action-mapping.md`
  (both `confirmed`) — 6→1 and the face→action table. `constants.ts` already holds both.
- `vault/foundry-systems/real-tokens-keep-their-flags-on-the-document.md` (`confirmed`) — read
  before writing a token double, even though this module never touches the canvas.

## Files

Prefix any path a sub-spec will CREATE (not yet present on disk) with `will-create:`.

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe-greathelm/src/round/session.ts` | Create | The suspendable round state machine. Pure, headless, and the single source of truth for legality. |
| `will-create: packages/battleframe-greathelm/tests/session.test.ts` | Create | Headless unit tests: 6→1, alternation, a side running out, illegal spend throws, vanished knight, completion → courage. |

**Modified files: none.** `loop.ts`, `actions.ts`, `courage.ts`, `clash.ts`, `dice-pool.ts` and
`round-control.ts` are **read and reused unchanged**. If you find yourself editing one, stop:
touching `round-control.ts` collides with SS-05's pathspec, and touching a rules module means this
stopped being a control-flow change. If you find yourself needing a file under
`packages/battleframe/`, **stop** — that is the master spec's neutrality escalation trigger.

## Unresolved — escalate, do not decide alone

<!--
  Raised during phase-spec refinement. None of these changes an acceptance criterion.
-->

1. **`discardDie` is new surface, not named in the master spec.** It exists because "a knight
   removed mid-round does not break the session" is otherwise unsatisfiable: a side with no
   knights left holds dice with no legal target and the round deadlocks below `isComplete()`. It
   is the explicit form of behaviour `runRoundFromControl` already has (`src/ui/round-control.ts:570`
   notifies and skips a clash die with no defender) and is commented as **engine behaviour, not a
   rule**. The STRUCTURAL criterion says "exposing **at least**", so the surface is permitted. If
   a reviewer wants the deadlock instead, that is a spec decision, not a worker's.
2. **Master spec SS-05 greps for `assignDiceRoundRobin`; the function in the codebase is
   `assignDiceToKnights`** (`src/ui/round-control.ts:248`). The criterion as written would exit 0
   against code that still round-robins. **Not this sub-spec's criterion — do not change it here.**
   Flagged for SS-05's refinement.
3. **Whether `planMovement`, `nearestEnemy` and `findDefenderInBaseContact` should live in
   `src/round/` rather than `src/ui/`** — architecturally they should, and a pure module importing
   from `src/ui/` reads backwards. Deferred: moving them is outside this sub-spec's file list and
   would collide with SS-05, which rewrites `round-control.ts`. Raise it at SS-05.
</content>
</invoke>
