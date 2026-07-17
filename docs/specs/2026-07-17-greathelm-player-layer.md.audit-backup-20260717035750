---
type: master-spec
title: GREATHELM Player Layer
date: 2026-07-17
author: Caleb Bennett
status: draft
---

# GREATHELM Player Layer

## Meta

- **Client:** Internal / personal
- **Project:** Battleframe
- **Repo:** `C:\Users\CalebBennett\Documents\GitHub\BattleFrame`
- **Date:** 2026-07-17
- **Source design:** `docs/plans/2026-07-17-greathelm-player-layer-design.md`
- **Predecessor:** `docs/specs/2026-07-16-battleframe-core-mvp.md` — MVP complete, verified
  live on Foundry v14.363 (a full round played: Initiative → Battle → Courage, damage
  persisted, courage tests fired).
- **Status:** Draft

### Quality scores

| Dimension | Score | Note |
|---|---|---|
| Outcome clarity | 5 | "A GM plays a round choosing every die, no console" — physically checkable |
| Scope boundaries | 5 | Toolkit extraction, undo, auto-move, multi-client all explicitly out |
| Decision guidance | 5 | Session owns legality; panel asks. Core untouched. |
| Edge coverage | 4 | Silent-wrongness modes named; v14 tinting API unknown and escalated |
| Acceptance criteria | 5 | Reachability criteria throughout — the SS-13 pattern |
| Decomposition | 5 | 5 sub-specs; the session is pure and headless-testable |
| Purpose alignment | 5 | Restores the game's actual decision rather than adding UI |
| **Total** | **34 / 35** | |

## Outcome

A GM opens a GREATHELM round, sees their rolled pool, and **chooses which knight spends which
die** — clicking a die, watching legal knights highlight, clicking one to resolve it. The
initiative winner is asked first-or-second; an attacker with several enemies in contact is
asked which to hit. Each prompt can be turned off.

Round-robin is gone. **The player makes the decisions the rulebook says are theirs.**

Core requires **zero** changes.

## Intent

**Purpose.** The rules engine is correct and live-verified — but the round plays itself.
`vault/greathelm/action-economy-per-die-not-per-model.md` (`confirmed`): the pool is a
**player-level** resource, **any die may activate any knight, there is no activation limit,
and one knight may take every action in a round.** Choosing which knight spends which die
**is** GREATHELM. Round-robin does not approximate that choice — it deletes it.

**Trade-off hierarchy** (higher wins):

1. **Ask, never invent.** Where the QSR gives a human a choice, prompt. A defaulted choice is
   a deleted choice.
2. **One source of truth for legality.** The session decides; the panel asks. Two copies of a
   predicate is how the `=== 0` base-contact bug survived in **three** places.
3. **Loud failure over plausible output.** Every bug this project has shipped was silent.
4. **Core neutrality.** If core needs to know what a die is, stop.
5. **Reuse the verified rules.** `resolveDieAction`, `resolveClashTest`, `runCouragePhase`,
   `planMovement` are correct and proven live. This is control flow, not rules.

**Decision boundaries — stop and ask when:**

- The fix needs any file under `packages/battleframe/` → **stop.** Neutrality is breaking.
- A v14 API's shape is not in `vault/` at `confidence: confirmed` → **escalate, don't guess.**
  Token tinting has **no note at any confidence**.
- A rule is not in the QSR → **escalate.** Do not invent, and do not dress an engine default
  as a rule.

## Context

**The MVP works and is verified live.** A full round played on Foundry v14.363: 14 dice,
initiative on most 6s, actions resolving 6→1, opposed clash tests, damage persisting (3/2/1/1,
capped at 3), four courage tests firing for damaged knights in base contact. This spec does
not change any of that. It changes **who decides**.

**The architectural consequence.** `runRound(options)` is a pure `async` function that
resolves all 14 dice and returns. Player agency means it must **suspend** at each die. That is
exactly what the original design predicted from INX (reactions interrupt) and Classic
BattleTech (*"the target chooses"* before the attacker rolls): *"attack resolution cannot be a
pure function — it must suspend and prompt another player."* It was filed as the toolkit's
**Resolution Stack**, Phase 5, gated on three rulesets. It has arrived early from a fourth
direction: the player's own turn.

**Build GREATHELM's own suspendable loop. Do NOT generalise it into core or a toolkit.** One
example is not evidence — that is the whole point of Approach C.

### Committed decisions (no further escalation)

- **Everything lives in `packages/battleframe-greathelm/`.** Core is untouched.
- **Interaction:** a pool panel. Click a die → legal knights highlight → click a knight.
- **All three player choices are prompted**, each with a settings toggle. With every prompt
  off, behaviour matches today's documented defaults.
- **Courage is not a player choice** — the rulebook decides who tests and in what order.
- **GM-only.** A round mutates shared state.
- **Session state is in-memory for the round.** A reload loses it. Acceptable for now, and it
  must be **stated in the UI**, not discovered.

## Requirements

1. A GM plays a full round choosing every die→knight assignment from the UI, no console.
2. `assignDiceRoundRobin` has **zero production callers**.
3. Selecting a die highlights legal knights; illegal knights show **why** they are illegal.
4. The initiative winner is prompted first-or-second; the prompt can be disabled.
5. An attacker with 2+ enemies in base contact is prompted for a target; can be disabled.
6. With all prompts disabled, the round resolves using today's documented defaults.
7. The round session is unit-tested **headless** — no canvas, no Application, no Foundry UI.
8. The session is the **only** place legality is decided.
9. **Core requires zero changes.**
10. `notifyUser` calls `ui.notifications[level]` **bound** — it currently detaches it, throws
    while reporting an error, and masks the original failure.

## Sub-Specs

---
sub_spec_id: SS-01
phase: run
depends_on: []
dispatch: factory
---

### 1. Round session — a suspendable state machine

- **Scope:** Turn the round from one atomic call into a session the UI drives. **Pure and
  headless: no canvas, no Application, no Foundry globals.** This is the load-bearing piece;
  everything else asks it questions.

  **Reuse the verified rules unchanged** — `resolveDieAction`, `resolveClashTest`,
  `planMovement`, `runCouragePhase` are correct and proven live. This is control flow only.

  **Rejected design, do not revisit:** keeping `runRound` and passing a `chooseKnight`
  callback. It inverts control — the round would call *up* into the UI and block. A session
  the UI *pulls* from is testable without a canvas and matches how the game is played.
- **Files (new):**
  - `packages/battleframe-greathelm/src/round/session.ts`
  - `packages/battleframe-greathelm/tests/session.test.ts`
- **Acceptance criteria:**
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
  - `[STRUCTURAL]` `discardDie(dieId, reason)` exists and spends a die **without** activating a
    knight. *(Added during prep.)* Without it, the criterion below is **unsatisfiable**: a side
    whose knights are all gone still holds dice with no legal target, so the round
    **deadlocks** — never illegal, never spendable, never complete. This is the explicit form
    of what `round-control.ts:570` already does implicitly (notify + skip a clash die with no
    defender).
  - `[BEHAVIORAL]` A knight removed mid-round (reduced to 0) does not break the session;
    legality is re-derived, never cached. A side with **no** legal target for a held die can
    discard it and the round still reaches `isComplete()` — **it must never deadlock.**
  - `[MECHANICAL]` `cd "$(git rev-parse --show-toplevel)" && npm test -- session` passes,
    covering: 6→1 enforcement, alternation, a side running out, an illegal spend throwing, a
    vanished knight, and completion triggering courage.
  - `[STRUCTURAL]` `session.ts` imports **nothing** from `foundry`, `canvas`, `ui`, or
    `game` — verified by `[ -z "$(grep -rnE "\\b(canvas|ui|game)\\." packages/battleframe-greathelm/src/round/session.ts)" ]`
    exiting 0. It is a pure module.
- **Dependencies:** none

---
sub_spec_id: SS-02
phase: run
depends_on: ['SS-01']
dispatch: factory
---

### 2. Pool panel — click a die, click a knight

- **Scope:** The affordance. An ApplicationV2 panel showing the active player's unspent dice,
  each with the action its face buys (`6`=Sprint, `5`=Encircle, `4`=Bash, `3`=Shift,
  `2`=Light, `1`=Heavy — the single constant in `constants.ts`).

  **The panel asks the session for legality. It never computes it.** Two copies of a predicate
  is how the `=== 0` bug survived in three places.
- **Files (new):**
  - `packages/battleframe-greathelm/src/ui/pool-panel.ts`
  - `packages/battleframe-greathelm/templates/pool-panel.hbs`
  - `packages/battleframe-greathelm/tests/pool-panel.test.ts`
- **Files (modify):**
  - `packages/battleframe-greathelm/lang/en.json`
- **Acceptance criteria:**
  - `[STRUCTURAL]` Uses ApplicationV2 via `foundry.applications.api.ApplicationV2` +
    `HandlebarsApplicationMixin`, per `vault/foundry-systems/applicationv2-sheet-structure.md`.
  - `[BEHAVIORAL]` Shows **every unspent die, both sides**, with its face and action name;
    only currently-offerable dice are selectable. *(Clarified during prep.)* **6→1 is a global
    rule** — a die is unavailable because *the opponent* holds a higher face. An
    active-side-only panel cannot explain why your 4 is greyed out, which makes the game look
    broken rather than sequenced.
  - `[BEHAVIORAL]` Clicking a die selects it; clicking it again deselects.
  - `[BEHAVIORAL]` With a die selected, the panel shows each legal knight and, for illegal
    ones, **the session's reason** rendered as human text.
  - `[BEHAVIORAL]` Clicking a knight spends the die and the panel re-renders from session
    state — **legality is re-derived on every render, never cached**.
  - `[STRUCTURAL]` **Every string is an i18n key present in `lang/en.json`.** Verified:
    every `battleframe-greathelm.*` key referenced by this sub-spec's files exists in the lang
    file. (Three keys shipped missing last time and rendered as raw keys on the knight sheet.)
  - `[STRUCTURAL]` **i18n keys are literal, never runtime-assembled.** *(Added during prep.)*
    A key built as `` `battleframe-greathelm.reasons.${reason}` `` is **invisible to the check
    above** — which is precisely how three keys shipped missing while every test passed. Map
    the `IllegalReason` union to keys with an exhaustive `Record`, so a new reason **breaks the
    build** rather than rendering a raw key at the table.
  - `[BEHAVIORAL]` The panel states plainly that a reload loses a half-played round.
  - `[MECHANICAL]` `cd "$(git rev-parse --show-toplevel)" && npm test -- pool-panel` passes.
  - `[STRUCTURAL]` The panel contains **no rules logic** — verified by
    `[ -z "$(grep -rnE "base contact|=== 0|DIE_FACE_TO_ACTION\\[" packages/battleframe-greathelm/src/ui/pool-panel.ts)" ]`
    exiting 0. It asks the session.
- **Dependencies:** SS-01

---
sub_spec_id: SS-03
phase: run
depends_on: ['SS-01']
dispatch: factory
---

### 3. Canvas highlighting — show what is touching

- **Scope:** Make contact and legality **visible on the board**, not just in a panel. When a
  die is selected, legal knights are highlighted; base-contact pairs are indicated.

  **The v14 token-tinting API is `not found` in the vault at any confidence.** Feature-detect
  and degrade — if tinting is unavailable, the panel still works and the round is still
  playable. **Do not assert an API you have not verified** (the `getSceneControlButtons`
  precedent: it worked, but only because it accommodated both shapes and asserted nothing).
- **Files (new):**
  - `packages/battleframe-greathelm/src/ui/highlight.ts`
  - `packages/battleframe-greathelm/tests/highlight.test.ts`
- **Acceptance criteria:**
  - `[BEHAVIORAL]` With a die selected, knights the session reports as legal are visibly
    distinguished from those that are not.
  - `[BEHAVIORAL]` Base-contact pairs are indicated.
  - `[STRUCTURAL]` Legality comes from the session. `highlight.ts` contains no contact maths —
    `[ -z "$(grep -rnE "measure\\.between|=== 0" packages/battleframe-greathelm/src/ui/highlight.ts)" ]`
    exits 0.
  - `[BEHAVIORAL]` If the tinting API is unavailable, highlighting is skipped, a single debug
    line is logged, and **the round remains fully playable**. No throw.
  - `[BEHAVIORAL]` Highlighting is cleared when the die is deselected, when the round ends,
    and when the panel closes — no leaked tints. *(Retagged during prep: this describes
    runtime lifecycle, not a static property, so `[STRUCTURAL]` was wrong — it has no
    meaningful grep and would have invited a fake one.)*
  - `[MECHANICAL]` `cd "$(git rev-parse --show-toplevel)" && npm test -- highlight` passes,
    including the API-absent path.
  - `[HUMAN REVIEW]` On a live v14 canvas, selecting a die visibly highlights the right
    knights. **Record the tinting API's real shape in `vault/foundry-systems/` afterwards** —
    it is currently unrecorded.
- **Dependencies:** SS-01

---
sub_spec_id: SS-04
phase: run
depends_on: ['SS-01']
dispatch: factory
---

### 4. The other two player choices, and the toggles

- **Scope:** The initiative winner's **first-or-second** choice, and **which** touching enemy
  to attack when several qualify. Both are QSR-confirmed player choices that SS-13 defaulted
  away. Each prompt gets a settings toggle; with prompts off, today's documented defaults
  apply.

  **`forced-first` is a rule, not a choice** — when only one player has 6s they are *forced*
  to go first. Do not prompt for it.
- **Files (new):**
  - `packages/battleframe-greathelm/src/ui/choice-prompts.ts`
  - `packages/battleframe-greathelm/tests/choice-prompts.test.ts`
- **Files (modify):**
  - `packages/battleframe-greathelm/src/constants.ts`
  - `packages/battleframe-greathelm/src/main.ts`
  - `packages/battleframe-greathelm/lang/en.json`
- **Acceptance criteria:**
  - `[BEHAVIORAL]` When the initiative winner may choose, they are prompted first-or-second.
    When `forced-first` applies, **no prompt** — it is a rule.
  - `[BEHAVIORAL]` When an attacker has 2+ enemies in base contact, they are prompted which to
    hit. With exactly one, no prompt.
  - `[STRUCTURAL]` Two world settings, both `default: true` (prompt by default — asking is the
    point), registered under `MODULE_ID`.
  - `[BEHAVIORAL]` With a prompt disabled, the documented default applies (`"first"`; first
    enemy in contact) and **the default is stated in the settings hint**, so it is a choice
    rather than a surprise.
  - `[STRUCTURAL]` The dialog API is **feature-detected**, matching the existing
    `resolveConversionPrompt` precedent — `DialogV2` has **no vault note at any confidence**.
    If no dialog resolves, fall back to the default and log; **never block the round**.
  - `[STRUCTURAL]` Every new string is an i18n key present in `lang/en.json`.
  - `[MECHANICAL]` `cd "$(git rev-parse --show-toplevel)" && npm test -- choice-prompts`
    passes, covering: prompt shown, prompt disabled → default, `forced-first` → no prompt,
    single enemy → no prompt, dialog API absent → default + log.
  - `[HUMAN REVIEW]` **Both prompts actually appear in a live v14 world**, and each toggle
    silences its own. **Then record `DialogV2`'s real shape in `vault/foundry-systems/`** —
    `grep -rni "DialogV2" vault/` currently returns **nothing**, so this ships against an API
    with no note at any confidence. *(Added during prep: SS-03 and SS-05 had live checks and
    this did not, despite carrying the same class of unverified-API risk. A feature-detect
    that has never been watched succeed is a hypothesis, not a fallback.)*
- **Decisions (SS-04):** Settings keys live in `constants.ts` (they are module configuration,
  not GREATHELM rules) but their **defaults are not rules either** — comment them as engine
  behaviour. Do not file `"first"` beside `SPRINT_MOVE_INCHES`.
- **Dependencies:** SS-01

---
sub_spec_id: SS-05
phase: run
depends_on: ['SS-02', 'SS-03', 'SS-04']
dispatch: factory
---

### 5. Integration — kill round-robin, wire the panel

- **Scope:** Replace the auto-battler with the game. The scene control opens the panel instead
  of resolving the round; `assignDiceRoundRobin` loses its last caller.
- **Files (modify):**
  - `packages/battleframe-greathelm/src/ui/round-control.ts`
  - `packages/battleframe-greathelm/src/main.ts`
- **Acceptance criteria:**
  - `[MECHANICAL]` **Round-robin is dead.**
    `[ -z "$(grep -rn "assignDiceToKnights" packages/battleframe-greathelm/src --include=*.ts | grep -v "export function")" ]`
    exits 0 — no production caller remains.

    **Corrected during prep — this criterion was broken and would have passed vacuously.**
    It originally grepped for `assignDiceRoundRobin`, **which does not exist**; the real
    function is `assignDiceToKnights` (`round-control.ts:248`, called at `:495`). A grep for
    a nonexistent name matches nothing, so the check that exists solely to prove round-robin
    is dead **passed today, with round-robin fully wired.** That is the fourth check in this
    project to measure nothing — after nine inverted greps, a literal `<placeholder>`, and
    ACs that dead code satisfied. **Before trusting any grep-based criterion, run it against
    the CURRENT tree and confirm it FAILS.** A check that passes before the work is done is
    not a check.
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
- **Dependencies:** SS-02, SS-03, SS-04

## Edge Cases

| Scenario | Handling |
|---|---|
| Panel offers a die the session rejects | **Throw.** That is a bug, not a user error. |
| Selected die's only target dies mid-round | Re-derive legality every render; never cache |
| A side runs out of dice | The other continues; no stall |
| Knight reduced to 0 mid-round | Session tolerates a vanished knight |
| Client reloads mid-round | Round is lost. **State it in the UI** — do not let it be discovered |
| Tinting API unavailable | Skip highlighting, log once, **round still playable** |
| Dialog API unavailable | Fall back to the documented default, log, never block |
| Only one player has 6s | `forced-first` — **no prompt**, it is a rule |
| Exactly one enemy in contact | No target prompt |
| All prompts disabled | Today's documented defaults; behaviour unchanged |

## Out of Scope

- **Toolkit extraction / a generic Resolution Stack.** One example is not evidence. Phase 5,
  gated on three structurally different rulesets.
- **Undo.** No history layer exists.
- **Multi-client turn passing.** GM-only.
- **Persisting a half-played round** across reloads.
- **Auto-moving tokens.** Deliberate: the vault confirms knights cannot move through models,
  terrain, or gaps narrower than their base, so sliding a token along a straight line would
  break a confirmed rule **silently**. The engine states the legal distance; the GM moves.
- **Any rule the QSR does not state.** Where it gives a human a choice, ask.
- **Changing the rules engine.** It is correct and live-verified.

## Constraints

### Musts
- Everything in `packages/battleframe-greathelm/`.
- The session is the only place legality is decided.
- The session is pure — testable headless.
- Every user-facing string is an i18n key that **exists** in `lang/en.json`.
- Unverified v14 APIs are feature-detected and degrade.

### Must-Nots
- **Must not** touch `packages/battleframe/`.
- **Must not** generalise the session into core or a toolkit.
- **Must not** duplicate a legality predicate.
- **Must not** use `=== 0` for contact.
- **Must not** invent a rule, or dress an engine default as one.
- **Must not** silently no-op an illegal action.
- **Must not** leave `assignDiceRoundRobin` wired.

### Preferences
- Prefer the **verified vault** over recollection; respect `confidence:`.
- Prefer **asking** the player over defaulting.
- Prefer **reachability** criteria over existence criteria.
- Prefer reusing the live-verified rules functions unchanged.

### Escalation triggers
- Needs a core change → **stop.** Neutrality is breaking.
- A v14 API is not in the vault at `confirmed` → **escalate**, feature-detect, do not assert.
- A rule is not in the QSR → **escalate.** Do not invent.

## Verification

1. `cd "$(git rev-parse --show-toplevel)" && npm run build` — exits 0 (typechecks too).
2. `cd "$(git rev-parse --show-toplevel)" && npm test` — exits 0, **≥218 tests**, none regressed.
3. `node scripts/deploy-local.mjs --dest "$(mktemp -d)"` — exits 0.
4. Deploy to a live v14 world. **Hard-reload** — Foundry caches system JS for 4 hours and you
   will otherwise debug the old bundle.
5. Open the GREATHELM scene control → the **panel** opens; the round does **not** self-resolve.
6. Confirm the pool shows 7 dice with their actions, highest face first.
7. Select a die → legal knights highlight; illegal ones show why.
8. Click a knight → the die resolves. Play **every** die.
9. Confirm clashes roll, damage applies (on the **token's** actor — these are unlinked tokens;
   `game.actors` will read 0), and courage fires at the end.
10. Confirm the first-or-second and target prompts appear, and that each toggle silences its own.
11. **Answer honestly: did core need any change?**
