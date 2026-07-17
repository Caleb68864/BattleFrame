---
type: phase-spec
master_spec: "../2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 11
title: "GREATHELM round loop, clash resolution, and sheet"
date: 2026-07-16
depends_on: ["SS-10"]
---

# Sub-Spec 11: GREATHELM Round Loop, Clash Resolution, and Sheet

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

The half of GREATHELM that plays. Consumes SS-10's dice pool and action mapping; owns the
round loop, clash tests, wounds, and the knight sheet.

**This module owns its entire turn loop.** Core provides **no** `nextTurn`, **no**
`advanceActivation`, and **no** round semantics — that is the design, not an omission. From
the master spec's Intent: "Core neutrality over convenience. If core needs to know what a
round is, the design has failed. A ruleset writing more code is the correct outcome." Five
researched games produced five incompatible turn structures and no shared primitive exists
(`vault/candidate-rulesets/activation-model-comparison.md`). So this module writes the loop.
All of it.

If you find yourself wanting to add a helper to `packages/battleframe/src/` to make this
easier, **stop**. That is a master-spec escalation trigger: "A ruleset requires a core change
→ stop and record it. That is the neutrality claim failing."

### The central mechanic

**The round resolves 6→1, so movement always precedes violence.** This is the game's central
elegance and the thing most likely to be broken by a plausible-looking refactor: the 6s that
win initiative are the same 6s that cannot attack. High faces buy mobility and momentum; low
faces buy damage. A great initiative roll wins you the *choice* of turn order and lots of
movement — and leaves you unable to hurt anyone.

The descending order is not a convention. It is the design. Every round has a fixed dramatic
arc: movement (6/5), then Bash (4) — the disruption hinge that strips banked momentum, then
a last repositioning chance (3), then attacks (2/1). You cannot attack before your opponent
has finished moving. See `vault/greathelm/battle-phase-initiative-steps.md` and
`vault/greathelm/dice-face-to-action-mapping.md`, both `confirmed`.

### Rules authority

**Read `vault/greathelm/` — start at `index.md`.** Those 36 notes are the authority available
to you. **Respect the `confidence:` frontmatter** — `unverified` means someone inferred it.

**`vault/greathelm/GREATHELM-QSR.pdf` is deliberately NOT in git.** It is a copyrighted
rulebook that must never be redistributed. It will not exist in your worktree. **Do not go
looking for it and do not try to fetch it.**

**Do not substitute web sources — they are known to be wrong.** Goonhammer says Run = 6"; the
QSR says Sprint = **5"**. This was verified. There is a `[MECHANICAL]` criterion in this
sub-spec whose entire purpose is to stop the Goonhammer value leaking in. If you find
yourself reaching for a web search about GREATHELM rules, stop.

**If a fact you need is marked `not found` in the notes, it stays not-found — escalate; do
not fill it in from genre convention.** An invented rule is indistinguishable from a real one
once it is in code.

**Ship no rules text, no stat blocks, no prose, no artwork.** Mechanics only. This applies
squarely to `knight-sheet.hbs`: it renders **state** — damage, momentum, equipment — not
rules. A sheet that explains how Riposte works is shipping the rulebook.

**Every constant is provisional** and lives in SS-10's `constants.ts`. This sub-spec adds
**no** new numeric literals. If you need a number, it comes from `GREATHELM`.

### Greenfield

**There is no existing codebase.** Every file here is new. There are no in-repo patterns to
detect and none to imitate — the references in **Patterns to Follow** are research notes in
`vault/`, not source files.

### Unresolved — escalate, do not decide alone

<!-- Raised during phase-spec refinement. None of these changes an acceptance criterion. -->

1. **Does momentum persist between rounds?** `not found` — `vault/greathelm/momentum.md`:
   "The QSR never says it resets, and the courage phase doesn't clear it — so it plausibly
   persists, but **this is not confirmed**." It changes round-boundary cleanup. **Do not add
   a reset on the strength of genre convention.** Implement no round-boundary momentum
   cleanup (the QSR describes none), leave a named seam
   (`roundBoundaryMomentumPolicy: "persist"` in `constants.ts`), comment the gap, and
   escalate.
2. **Outnumbering geometry.** `confidence: partial` — `vault/greathelm/outnumbering.md`
   flags two defensible readings of "in base contact with the attacker or defender" and says
   explicitly: "**Flagging as ambiguous — do not hard-code without the full rulebook.**"
   Implement the literal reading (an ally touching *either* combatant counts) behind a named
   seam, mark it `[AMBIGUOUS]`, and record it. The two readings give materially different
   bonuses.
3. **Courage cascade within a phase.** `confidence: partial` — `vault/greathelm/courage-test.md`
   says the intra-phase cascade "follows from" the rules but "no source states explicitly"
   it, and to "**verify against the full rulebook before implementing** — it materially
   changes the death-spiral rate."
4. **Voluntary pass.** `not found` — `vault/greathelm/turn-options-activate-adjust-pass.md`:
   the QSR states only the *compulsory* case ("If you have no dice in the current initiative
   step, you must pass"). Whether you *may* pass while holding a legal die is unknown. Read
   strictly, you may not. Implement the strict reading; flag it.

<!-- Scope note, flagged rather than resolved: the master spec scopes SS-11 as "the round
     loop" and the vault (game-phases-round-structure.md, confirmed) establishes the round
     as exactly three phases — Initiative, Battle, Courage. But no SS-11 acceptance
     criterion mentions the courage phase, and neither the master spec's Outcome nor SS-12's
     full-round criterion includes it. This phase spec implements the courage phase because
     it is part of "the round" and is fully confirmed, but flags that it is uncovered by any
     criterion. If the reviewer intends courage to be out of MVP scope, cut it here — do not
     silently expand SS-11. -->

## Interface Contracts

### Provides

- `GreathelmRound` (`src/round/loop.ts`): the round state machine. Owns the entire turn loop.
  Initiative phase → Battle phase (6→1, alternating) → Courage phase → next round.
- `resolveClash(params)` (`src/combat/clash.ts`): the strictly-sequenced clash test. Returns
  a result object, applies nothing. The caller applies.
- `KnightSheet` (`src/sheets/knight-sheet.ts`): ApplicationV2 sheet for
  `battleframe-greathelm.knight`, registered with the **module's own** package id.
- `combat.flags.battleframe.order: string[]` — **written by this module.** Core reads it and
  never computes it.
- `combat.flags["battleframe-greathelm"].round` — the module's own round state: pools,
  current step, active side. Core never reads this and does not know it exists.

### Requires

- **From SS-10:** `FACE_TO_ACTION`, `GREATHELM` (every constant), `KnightData`,
  `poolSize()`, `rollPool()`, `rerollNonSixes()`, `tallyFaces()`, `determineInitiative()`,
  `actionForFace()`, `actionSpec()`, and the registered module + settings namespace.
- **From SS-04:** `game.battleframe.measure.between(tokenA, tokenB)` → `{distance, units,
  mode: "base-to-base"}`, taking **Tokens, not points**. Every distance in this sub-spec goes
  through it. A centre-to-centre distance anywhere is a bug, not a variant.
- **From SS-07:** `game.battleframe.dice.roll(formula, data?)` → a standard Foundry `Roll`.
  Every roll in this sub-spec — clash d6s, the armour table, courage tests — goes through it.
  **Never `Math.random`.**
- **From SS-06:** the combat shell. Combatants carry `initiative: null` permanently; order
  lives in `combat.flags.battleframe.order: string[]` (Combatant ids), **read** by core,
  **written** by this module. Core provides no `nextTurn` and no round semantics.
- **From SS-08:** the Actor document class and the `flags.battleframe.schemaVersion`
  stamping convention.

### Shared State

- `combat.flags.battleframe.order` — **the seam between this module and core.** Core reads;
  this module writes. This is the only place the two meet on turn order, and it is why core
  can host a game whose turn structure it knows nothing about.

  **What the array means here needs care.** GREATHELM alternates *player turns*, not model
  activations — there is no per-knight order (`vault/greathelm/action-economy-per-die-not-per-model.md`:
  a knight can act many times or never). So the flag carries the tracker's **display**
  projection: Combatant ids grouped by warband, the active warband first, stable within a
  warband. It is refreshed as alternation flips. The *real* round state lives in this
  module's own flag.

  This projection is **engineering, not a rule** — `confidence: unverified`. Comment it as
  such. It is a display decision, and it is reversible.
- `actor.system.damage` / `actor.system.momentum` — persisted on the Actor via
  `actor.update()`. Wounds must survive a world reload.
- `CONFIG.Actor.dataModels["battleframe-greathelm.knight"]` — registered by SS-10; the sheet
  registers against the same namespaced type.

## Implementation Steps

### Step 1: Write failing test — the round resolves 6→1

- **File:** `packages/battleframe-greathelm/tests/loop.test.ts`
- **Test name:** `battle phase walks the initiative steps 6 down to 1`
- **Asserts:** Given pools A `[6,6,4,2]` and B `[5,4,1]`, the sequence of `currentStep`
  values observed as dice are spent is exactly `[6, 5, 4, 2, 1]`. Step `3` is **skipped
  entirely** — no die in play holds it. The step never rises. Spending the last die at a step
  immediately advances to the next-highest face **in play across both pools**, not the next
  integer down.
- **Run:** `npm test -- loop`
- **Expected:** FAILS — `Cannot find module '../src/round/loop'`.

### Step 2: Implement the step machine

- **File:** `packages/battleframe-greathelm/src/round/loop.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. `vault/greathelm/battle-phase-initiative-steps.md`
  (`confirmed`, QSR p1 verbatim + Kickstarter): "The highest value die in play is the current
  initiative step. When all dice of the current initiative step are spent, the next highest
  die value in play immediately becomes the new initiative step."
- **Changes:** `currentStep` is **derived, never stored** —
  `max(unspent faces across BOTH pools)`. The step is **global**, computed across both
  players, so empty steps are skipped. Recompute on every spend.

  Model the round as `vault/greathelm/engine-implications.md` §1 describes (that note is
  `unverified` inference — its *framing* is opinion; the underlying rules it cites are
  confirmed):

  ```
  Round { pools: {sideA: Multiset<1..6>, sideB: Multiset<1..6>}, currentStep, activeSide }
  ```

  Do **not** build "initiative" and "actions" as separate subsystems. The pool *is* the turn
  structure: initiative, action economy, action selection, and sequencing, all one object.
  Legality: an action is available iff the acting side holds an unspent die with
  `face === currentStep`. Spending consumes the die **and** selects the action.

### Step 3: Verify test passes

- **Run:** `npm test -- loop`
- **Expected:** PASSES.

### Step 4: Write failing test — alternation and turn options

- **File:** `packages/battleframe-greathelm/tests/loop.test.ts`
- **Test name:** `players alternate one action at a time` and
  `a side with no die at the current step must pass`
- **Asserts:** Alternation is **one action at a time**, not one model at a time — after any
  single option is taken, the active side flips. Each of the three turn options ends the
  turn: activate, adjust, pass. A side holding no die at the current step **passes
  automatically** and the turn flips without consuming anything. A side holding a legal die
  may **not** voluntarily pass (the strict reading — flagged unresolved). Dice adjust rotates
  one of the acting side's **highest** dice down exactly one pip (6→5), never up, and ends
  the turn; the die is not lost, only delayed to the next step down.
- **Run:** `npm test -- loop`
- **Expected:** FAILS.

### Step 5: Implement turn options

- **File:** `packages/battleframe-greathelm/src/round/loop.ts`
- **Action:** modify
- **Pattern:** `vault/greathelm/turn-options-activate-adjust-pass.md` (`confirmed`, QSR p1
  verbatim) and `vault/greathelm/dice-adjust-rotate-down.md` (`confirmed`).
- **Changes:** Exactly three options, each ending the turn: **Knight activation** (the die's
  face must equal the current step), **Dice adjust** (rotate one of your *highest* dice down
  one number — downgrade only, restricted to dice at the current step), **Pass** (mandatory
  when you have no dice in the current step).

  Mark the voluntary-pass prohibition `[STRICT READING]` in a comment: the QSR states only
  the compulsory case, and whether you may pass while holding a legal die is `not found`.

  **No `activated` flag on any knight.** A knight may be activated many times in a round or
  not at all — the budget is the dice pool and nothing else. Adding a limiter would break the
  design; the restraint is positional and economic (momentum caps at 3, outnumbering punishes
  a lone runner), not a hard rule.

### Step 6: Verify test passes

- **Run:** `npm test -- loop`
- **Expected:** PASSES.

### Step 7: Write failing test — Sprint measures 5" base-to-base

- **File:** `packages/battleframe-greathelm/tests/loop.test.ts`
- **Test name:** `Sprint moves up to 5 inches measured base-to-base`
- **Asserts:** With a stubbed `game.battleframe.measure.between` recording its calls, a Sprint
  activation validates the move against `GREATHELM.sprintInches`, which is **5** — not 6.
  The distance is obtained from `game.battleframe.measure.between(token, destinationToken)`
  and the returned `mode` is asserted to be `"base-to-base"`; a result with any other mode is
  **rejected**, not coerced. A 5.0" move is legal ("up to" — partial moves allowed); a 5.1"
  move is rejected. Encircle validates against `3`, Shift against `1`, Bash push against `3`.
  No test and no implementation contains the literal `6` as a distance.
- **Run:** `npm test -- loop`
- **Expected:** FAILS.

### Step 8: Implement movement validation

- **File:** `packages/battleframe-greathelm/src/round/loop.ts`
- **Action:** modify
- **Pattern:** `vault/greathelm/movement-and-measurement.md` (`confirmed`, QSR v0.4): Sprint
  5", Encircle 3", Shift 1", Bash push 3", Dodge 1". All are "up to" — partial moves allowed.
- **Changes:** Every distance goes through `game.battleframe.measure.between` and every limit
  comes from `GREATHELM`. **No literal distances in this file.**

  **Sprint is 5", not 6".** The QSR v0.4 says 5"; Goonhammer says 6" and Goonhammer is wrong.
  This is the single most likely wrong-number bug in the project, it is silent, and there is a
  `[MECHANICAL]` grep criterion guarding it. Comment the constant's provenance at the point
  of use.

  Assert the returned `mode` is `"base-to-base"`. Measurement is the engine's reason to exist
  and a centre-to-centre value here would be silently, unnoticeably wrong. Prefer loud failure
  over plausible output.

  **Out of scope, `not found` / deferred:** the QSR's collision constraints ("Knights cannot
  move through spaces smaller than their base width, or through terrain"; "models cannot move
  through other models"). Real collision needs a service core does not have and no acceptance
  criterion requires it. Validate the **distance**; leave a named seam for collision, comment
  the gap, and do not fake it.

### Step 9: Verify test passes

- **Run:** `npm test -- loop`
- **Expected:** PASSES.

### Step 10: Write failing test — clash sequencing

- **File:** `packages/battleframe-greathelm/tests/loop.test.ts`
- **Test name:** `a clash test enforces both blind commitments before any roll`
- **Asserts:** `resolveClash` **rejects** being called without a declared defense and a
  committed momentum spend — the defense and the momentum are committed **before** either d6
  is rolled, and the implementation cannot roll first and ask later. Attacker **wins ties**:
  attacker 4 vs defender 4 → attacker wins; the defender needs to be **strictly higher**.
  A won clash for the attacker triggers the armour table roll; a Bash never does. The winner
  — attacker **or** defender — gains 1 momentum. Momentum spend is **attacker only**: a
  defender's spend is rejected. Every roll goes through the stubbed
  `game.battleframe.dice.roll`.
- **Run:** `npm test -- loop`
- **Expected:** FAILS — `Cannot find module '../src/combat/clash'`.

### Step 11: Implement the clash test

- **File:** `packages/battleframe-greathelm/src/combat/clash.ts`
- **Action:** create
- **Pattern:** `vault/greathelm/clash-test.md` (`confirmed`, QSR p2 verbatim) — the strict
  resolution order; `vault/greathelm/clash-bonuses.md`, `vault/greathelm/clash-defenses.md`,
  `vault/greathelm/heavy-armor-table.md`, `vault/greathelm/outnumbering.md` (all `confirmed`
  except the outnumbering geometry reading, which is `partial`).
- **Changes:** Implement the sequence exactly, in this order — see the **Completeness
  Checklist**:

  1. Attacker declares the action (spends the die) — requires base contact.
  2. **Defender declares a defense — BLIND, before any roll.**
  3. **Attacker commits momentum — BLIND, before any roll, irrevocably.**
  4. Both roll 1d6 through `game.battleframe.dice.roll`, add bonuses.
  5. Compare. **Attacker wins ties.**
  6. If the defender lost: defender rolls the armour table.
  7. Winner gains 1 momentum, either side.

  **Steps 2 and 3 are blind commitments made before information exists. This cannot be
  collapsed into a single roll without destroying the game.** That is not a style
  preference — it is where the bluffing lives, and it is why *hasty rolling* exists as a
  written rule. Any implementation that rolls first and prompts after has implemented a
  different game.

  `resolveClash` **applies nothing** — it returns a result. The caller applies damage and
  momentum. Keep the resolution pure so it is testable without a live document.

  **Undeclared defense is a valid state, not an error.** `vault/greathelm/hasty-rolling.md`
  (`confirmed`, QSR p2) makes it a real rule: it resolves as a **bonus-free defense** — the
  attack still misses on a defender win, but no rider applies (no Riposte damage, no Parry
  momentum, no Dodge move, no shield +2). This is the correct default for a timeout. Do not
  make it an auto-loss and do not throw.

  Mark the outnumbering geometry `[AMBIGUOUS]` per the Unresolved list.

### Step 12: Verify test passes

- **Run:** `npm test -- loop`
- **Expected:** PASSES.

### Step 13: Write failing test — a clash renders to chat and a wound persists

- **File:** `packages/battleframe-greathelm/tests/loop.test.ts`
- **Test name:** `a clash test rolls through the core dice service and posts to chat` and
  `damage is written to the Actor`
- **Asserts:** The clash rolls through `game.battleframe.dice.roll` — a stub records the
  formulas — and the resulting card is rendered through SS-07's chat path, carrying the
  ruleset id `"battleframe-greathelm"`. Applying a landed Light attack calls
  `actor.update({"system.damage": 1})` — damage is written to the **Actor**, not to a
  transient, so it survives a world reload. A knight reaching `damage >= 3` is **immediately**
  removed — not at end of phase — and the removal instantly shrinks that side's pool for
  subsequent rounds and removes an outnumbering contributor mid-round.
- **Run:** `npm test -- loop`
- **Expected:** FAILS.

### Step 14: Implement application and chat

- **File:** `packages/battleframe-greathelm/src/combat/clash.ts`
- **Action:** modify
- **Pattern:** `vault/greathelm/damage-and-removal.md` (`confirmed`, QSR p2): "When knights
  gain 3 or more damage markers, they are immediately removed from play."
  `vault/greathelm/heavy-armor-table.md` (`confirmed`): 6 Impervious → 0 damage; 2–5 Struck →
  damage as declared; 1 Pierced → damage **+1**.
- **Changes:** Apply via `actor.update()`. Render the card via SS-07's chat path, carrying
  the ruleset id — SS-07's contract requires chat cards to name the ruleset that produced
  them. **No rules text on the card**: it shows the rolls, the bonuses, and the outcome.
  It does not explain the rule.

  Note `damage` is **not** capped at 3 in the schema: a Pierced heavy attack delivers 3 in one
  blow, and clamping would be a silent rule change. `>= 3` triggers removal.

### Step 15: Verify test passes

- **Run:** `npm test -- loop`
- **Expected:** PASSES.

### Step 16: Write failing test — turn order is written by this module

- **File:** `packages/battleframe-greathelm/tests/loop.test.ts`
- **Test name:** `the module writes combat.flags.battleframe.order`
- **Asserts:** Starting a round calls `combat.update()` with a
  `flags.battleframe.order` array of Combatant id strings. Alternation rewrites it. **Core
  never computes it** — no core function is called to produce it. Every Combatant retains
  `initiative: null`; nothing in this module writes a number to `initiative`.
- **Run:** `npm test -- loop`
- **Expected:** FAILS.

### Step 17: Implement the order flag

- **File:** `packages/battleframe-greathelm/src/round/loop.ts`
- **Action:** modify
- **Pattern:** `vault/foundry-systems/lancer-activation-based-combat-precedent.md`
  (`confirmed`) — the master spec prefers "copying Lancer's proven combat pattern over
  inventing one": ignore `initiative`, sort on ruleset data, `turn: null`, own the tracker.
- **Changes:** Write `combat.flags.battleframe.order` — Combatant ids grouped by warband,
  active warband first. Store the real round state (pools, step, active side) in the
  module's **own** flag namespace, `combat.flags["battleframe-greathelm"].round`. Core does
  not know that flag exists and must never need to.

  **Never write a numeric `initiative`** — a master-spec must-not, and SS-06 keeps it `null`
  permanently.

  Comment the display projection as `confidence: unverified` engineering, not a rule.

### Step 18: Verify test passes

- **Run:** `npm test -- loop`
- **Expected:** PASSES.

### Step 19: Write failing test — degenerate rounds

- **File:** `packages/battleframe-greathelm/tests/loop.test.ts`
- **Test name:** `a knight with zero dice does not break the loop` and
  `a round where one side has no legal action completes`
- **Asserts:** A side with an **empty pool** does not throw, does not hang, and does not
  deadlock — the other side plays out its dice and the round completes to the courage phase.
  A side holding dice but with **no legal action** at the current step (e.g. only Heavy
  attacks while no knight is in base contact) passes rather than throwing. Both pools empty →
  the battle phase ends immediately and the round advances. `poolSize(0)` is `1`, and a side
  with zero knights in play produces a round that terminates.
- **Run:** `npm test -- loop`
- **Expected:** FAILS.

### Step 20: Implement degenerate-round handling

- **File:** `packages/battleframe-greathelm/src/round/loop.ts`
- **Action:** modify
- **Pattern:** The master spec's Edge Cases table: "Ruleset throws in its own loop → Contain,
  surface the ruleset id, keep the world usable. Core cannot fix it."
- **Changes:** Contain every throw inside this module's loop, surface the ruleset id, and
  keep the world usable. Core cannot fix a ruleset's loop and must not try. An empty pool is
  a normal state, not an error.

### Step 21: Verify test passes

- **Run:** `npm test -- loop`
- **Expected:** PASSES. This is the full `[MECHANICAL]` criterion: full 6→1 ordering, an
  empty pool, and a round where one side has no legal action.

### Step 22: Implement the courage phase

- **File:** `packages/battleframe-greathelm/src/round/loop.ts`
- **Action:** modify
- **Pattern:** `vault/greathelm/courage-phase.md` and `vault/greathelm/courage-test.md`
  (both `confirmed`, QSR p2 verbatim; the intra-phase cascade is `partial`).
- **Changes:** After all initiative dice are spent, the round moves to the courage phase.
  A knight tests iff **both**: it has ≥1 damage marker **and** it is in base contact with an
  enemy. Base contact is determined via `game.battleframe.measure.between` — distance `0` is
  contact (SS-04 returns **exactly 0** for touching bases, never a small positive number).

  Difficulty = (allied knights removed from play) + (damage on the testing knight). Roll 1d6
  through `game.battleframe.dice.roll`; **≥ difficulty passes**; a natural **6 always
  passes** regardless. Failure → the knight **immediately flees** (`removedFromPlay: true`,
  `removalReason: "fled"`).

  Test order: the player with the **most total damage markers across their whole warband**
  takes **all** their tests first; tie → **fewest remaining knights** tests first.

  Mark the intra-phase cascade `[PARTIAL]` per the Unresolved list — implement the reading
  that a knight fleeing mid-phase raises difficulty for subsequent tests in the same phase,
  flag it, and record it. It materially changes the death-spiral rate.

  **Out of scope:** victory conditions and round limits. `vault/greathelm/victory-condition-quickstart.md`
  is quickstart-only and the full scoring system is `not found`; the QSR has no round limit.
  Do not invent either.

### Step 23: Implement the knight sheet

- **File:** `packages/battleframe-greathelm/src/sheets/knight-sheet.ts`
- **Action:** create
- **Pattern:** `vault/foundry-systems/applicationv2-sheet-structure.md` (`confirmed`) for the
  class stack and `vault/foundry-systems/v13-v14-sheet-registration-namespaces.md`
  (`confirmed`) for the v14 namespaced registration call.
- **Changes:** `class KnightSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2)`. **ApplicationV2 only** — v14, no V1 sheets.

  Register through `foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor,
  "battleframe-greathelm", KnightSheet, {types: ["battleframe-greathelm.knight"],
  makeDefault: true})`. The second argument is the **package id** and it must be the
  **module's own**, not `game.system.id`. That argument is the module/system boundary.

  Use `static DEFAULT_OPTIONS` (auto-merges up the chain — no `mergeObject`), `static PARTS`,
  and `_prepareContext()`. Note the gotcha: `{{system.x}}` reads the *context* while
  `name="system.x"` writes the *document path* — they coincide by habit, not by rule.

### Step 24: Implement the sheet template

- **File:** `packages/battleframe-greathelm/templates/knight-sheet.hbs`
- **Action:** create
- **Pattern:** ApplicationV2 `PARTS` — each part returns exactly one top-level element, and
  `DocumentSheetV2` wraps in a `form`.
- **Changes:** Render **state only**: damage (0..3), momentum (0..3), and the three equipment
  booleans. **No rules text**, no effect descriptions, no armour table, no courage table, no
  prose, no artwork. All labels come from `lang/en.json`.

  There is no stat line to render — knights are mechanically identical
  (`vault/greathelm/knights-have-no-stat-line.md`). If the sheet grows a stats block,
  something has been invented.

### Step 25: Verify the full sub-spec

- **Run:** `npm run build && npm test -- loop`
- **Expected:** Both exit 0. Then run every command in **Checks** and confirm each exits 0.

### Step 26: Record the inventions in the vault

- **File:** `vault/greathelm/open-questions.md`
- **Action:** modify
- **Changes:** Record each seam this sub-spec left, naming the implementing file: the
  momentum round-boundary policy (Tier 1, item 4), the outnumbering geometry reading (Tier 2,
  item 5), the courage intra-phase cascade (Tier 2, item 6), and the strict voluntary-pass
  reading (Tier 2, item 7). The standing instruction in that note is to make each unknown an
  explicit, swappable seam rather than a hard-coded plausible rule — these are those seams,
  and they must be findable when the full rulebook arrives.

### Step 27: Commit

- **Stage:** `git add packages/battleframe-greathelm/ vault/greathelm/open-questions.md`
- **Message:** `feat: GREATHELM round loop, clash resolution, and sheet`

## Acceptance Criteria

Preserved verbatim from the master spec.

- `[BEHAVIORAL]` The round resolves **6→1**, so movement always precedes violence. This is
  the game's central elegance — the 6s that win initiative are the same 6s that cannot
  attack.
- `[BEHAVIORAL]` Sprint moves up to **5"**, measured via
  `game.battleframe.measure.between` — **base-to-base**. Not 6". The web is wrong about
  this number.
- `[MECHANICAL]` `grep -rn '\b6"' packages/battleframe-greathelm/src/` returns nothing —
  guards against the Goonhammer value leaking in.
- `[BEHAVIORAL]` A clash test rolls through `game.battleframe.dice.roll` and renders to
  chat.
- `[BEHAVIORAL]` Wounds persist on the Actor across a world reload.
- `[STRUCTURAL]` Turn order is written to `combat.flags.battleframe.order` **by this
  module**. Core never computes it.
- `[BEHAVIORAL]` A knight with zero dice (no models) does not break the loop.
- `[STRUCTURAL]` The sheet uses ApplicationV2 via
  `foundry.applications.sheets.ActorSheetV2` + `HandlebarsApplicationMixin`, registered
  with the **module's own** package id.
- `[MECHANICAL]` `npm test -- loop` passes, covering: full 6→1 ordering, an empty pool,
  and a round where one side has no legal action.
- `[MECHANICAL]` `grep -rn "battleframe-greathelm\|greathelm" packages/battleframe/src/`
  returns nothing — core stays ignorant.

<!-- Preserved verbatim per instruction; two hazards noted rather than corrected.

     (1) The `grep -rn '\b6"' ...` criterion has a false-positive mode: the pattern matches
     the trailing `6"` of any string literal ending in the digit 6 — e.g. a version string
     "0.4.6" or an id ending in 6. If it fires, do NOT weaken the check; inspect the hit. The
     intent is unambiguous: no 6-inch distance may exist in this package.

     (2) The final criterion greps `packages/battleframe/src/` — core — from within SS-11,
     which touches no core file. It is a standing invariant re-asserted here, not work. It is
     also fully covered by SS-12's neutrality test. Harmless duplication; keeping it. -->

## Completeness Checklist

### Clash test — the strict resolution order

`packages/battleframe-greathelm/src/combat/clash.ts`. **Every step, in this order.** Steps 2
and 3 are blind commitments made before any die is rolled; collapsing them into a single roll
implements a different game.

| # | Step | Constraint |
|-------|------|----------|
| 1 | Attacker declares the action, spending the die | Requires **base contact** with an enemy. Faces 4 (Bash), 2 (Light), 1 (Heavy) only |
| 2 | **Defender declares a defense** | **BLIND** — before any roll. Parry / Riposte / Block / Dodge. Undeclared is a *valid* state: bonus-free defense (hasty rolling), not an error |
| 3 | **Attacker commits momentum** | **BLIND** — before any roll, irrevocably. **Attacker only**; a defender spend is rejected |
| 4 | Both roll 1d6, add bonuses | Through `game.battleframe.dice.roll`. Never `Math.random` |
| 5 | Compare | **Attacker wins ties.** Defender must be **strictly higher** |
| 6 | If the defender lost: armour table | Defender rolls. **Bash never reaches this table.** **Riposte bypasses it entirely** |
| 7 | Winner gains 1 momentum | **Either side** — attacker or defender. Capped at 3; overflow discarded |

### Clash bonuses — all five

`vault/greathelm/clash-bonuses.md` (`confirmed`, QSR p2). Added to the d6.

| Bonus | Value | Applies to | Note |
|-------|------|----------|----------|
| Outnumbering | `+1` per ally | **Both** sides | Ally in base contact with attacker **or** defender. Unbounded. **Geometry reading is `partial` — flag `[AMBIGUOUS]`** |
| Momentum spent | `+1` each | **Attacker only** | "any amount", so max **+3** given the cap of 3 |
| One-handed weapon | `+1` | **Light melee (face 2) only** | Action-matched. Never helps Heavy |
| Two-handed weapon | `+1` | **Heavy melee (face 1) only** | Action-matched. Never helps Light |
| Shield | `+2` | **Block defense only** | Not Parry, not Riposte, not Dodge |

### Clash defenses — all four

`vault/greathelm/clash-defenses.md` (`confirmed`, QSR p2). Declared **before rolling**. All
four defend all damage on success; they differ **only** in the rider.

| Defense | Rider on success | Roll bonus |
|-------|------|----------|
| `parry` | **+1 additional momentum** (so +2 total, with the clash win) | none |
| `riposte` | Deal the attacker **1 damage, with no armour table roll** — the only guaranteed damage in the game, and the only way a defender deals damage | none |
| `block` | none | **+2 with a shield** |
| `dodge` | **1" of movement, immediately** | none |
| `hasty` (undeclared) | **none** — the attack misses, no rider applies | none |

### Heavy armour table — all three outcomes

`vault/greathelm/heavy-armor-table.md` (`confirmed`, QSR p2). Rolled by the defender **after
losing** a clash. Winning a clash does **not** guarantee damage.

| Roll | Result | Effect |
|-------|------|----------|
| `6` | Impervious | **0** damage applied |
| `2`–`5` | Struck | Damage applied **as declared** |
| `1` | Pierced | Damage **+1** applied |

### Round phases — all three

`vault/greathelm/game-phases-round-structure.md` (`confirmed`, QSR p1). Every round, in order.

| Phase | Contents | Ends when |
|-------|------|----------|
| Initiative | Gather (`poolSize`), roll, organise descending, re-roll non-6s once, determine order | Order determined |
| Battle | Walk steps **6→1**; alternate one action at a time; activate / adjust / pass | All dice spent |
| Courage | Damaged knights in base contact test; most-damaged warband tests all its tests first | All tests resolved |

Dice do **not** carry between rounds — the pool is regenerated and re-rolled fresh
(`confidence: partial`; the QSR leaves no mechanism for carryover). Then the round repeats.

### `combat.flags.battleframe.order`

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `flags.battleframe.order` | `string[]` — Combatant ids | required | **Written by this module.** Read by SS-06's tracker. Core never computes it |
| `flags["battleframe-greathelm"].round.pools` | `{sideA: number[], sideB: number[]}` | required | This module only. The unspent faces per side |
| `flags["battleframe-greathelm"].round.activeSide` | `"sideA" \| "sideB"` | required | This module only. Flips per action |
| `flags["battleframe-greathelm"].round.spent` | `number[]` | required | This module only. Consumed dice, for audit and the chat log |
| `initiative` (on every Combatant) | `null` | **permanently null** | SS-06. **Nothing here writes a number to it** |

`currentStep` is **derived, never stored**: `max(unspent faces across both pools)`.

### Limits and boundaries

- Initiative steps: `6` down to `1` — enforced by the derived `currentStep`. Empty steps are
  **skipped entirely**; the step is global across both pools; the step never rises.
- Sprint: **5"** — `GREATHELM.sprintInches`, enforced in `loop.ts` against
  `measure.between`. **Not 6".**
- Encircle: **3"**. Shift: **1"**. Bash push: **3"**. Dodge: **1"**. All "up to" — partial
  moves allowed.
- Momentum: `0..3` — schema-enforced; overflow **discarded**, not banked. Max spend `+3`.
- Damage: `>= 3` → **immediate** removal, not end-of-phase. Not clamped at 3 — a Pierced
  heavy delivers 3 in one blow.
- Courage: `difficulty = alliesRemoved + ownDamage`; `1d6 >= difficulty` passes; natural `6`
  always passes. Difficulty 0 or 1 is an auto-pass.
- Base contact: `measure.between(...).distance === 0`. Exactly 0 for touching bases, 0 for
  overlapping, never negative (SS-04's contract).
- Dice adjust: **one pip, down only**, from your **highest** dice. Ends the turn.

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test -- loop`
- **Acceptance:** Run every command in **Checks** below; each exits 0. The remaining
  criteria need a live Foundry v14 world and cannot be asserted by a worker — verify them in
  the SS-12 integration pass:
  - `[BEHAVIORAL]` the round resolves 6→1 *in play* (the unit test covers the machine; the
    live round is SS-12's `[INTEGRATION]` criterion)
  - `[BEHAVIORAL]` Sprint moves 5" *on a real canvas*, and the ruler agrees with the engine
  - `[BEHAVIORAL]` a clash test *renders to chat*
  - `[BEHAVIORAL]` wounds persist *across a world reload*
  - `[BEHAVIORAL]` a knight with zero dice does not break the loop *in play*

## Checks

Commands drawn from `[MECHANICAL]` and `[STRUCTURAL]` criteria only. `[BEHAVIORAL]` and
`[HUMAN REVIEW]` criteria are excluded — they cannot be asserted by a shell command. Each
command exits 0 on pass, or 1 with a one-line summary on fail. Run from the repo root.

| Criterion | Type | Command |
|---|---|---|
| No `6"` anywhere in the module — guards against the Goonhammer value | MECHANICAL | `! grep -rn '\b6"' packages/battleframe-greathelm/src/ \|\| { echo "6\" found in packages/battleframe-greathelm/src/ — the QSR says Sprint is 5\"; Goonhammer's 6\" is wrong"; exit 1; }` |
| Sprint is 5", read from constants, never a literal | MECHANICAL | `node -e "const s=require('fs').readFileSync('packages/battleframe-greathelm/src/constants.ts','utf8');if(!/sprintInches:\s*5\b/.test(s)){console.error('constants.ts: sprintInches must be 5');process.exit(1)}" && ! grep -rnE 'sprint[A-Za-z]*\s*[:=]\s*6\b' packages/battleframe-greathelm/src/ \|\| { echo "Sprint distance is not 5 — the web is wrong about this number"; exit 1; }` |
| Turn order is written to `combat.flags.battleframe.order` by this module | STRUCTURAL | `grep -rq 'flags.battleframe.order\|"battleframe.order"\|battleframe: *{ *order' packages/battleframe-greathelm/src/round/loop.ts \|\| { echo "loop.ts: must write combat.flags.battleframe.order — core never computes it"; exit 1; }` |
| Nothing writes a numeric `initiative` | STRUCTURAL | `! grep -rnE 'initiative\s*[:=]\s*[0-9]' packages/battleframe-greathelm/src/ \|\| { echo "numeric initiative written — Combatants must carry initiative: null permanently"; exit 1; }` |
| The sheet uses ApplicationV2 via `ActorSheetV2` + `HandlebarsApplicationMixin` | STRUCTURAL | `grep -q 'foundry.applications.sheets.ActorSheetV2' packages/battleframe-greathelm/src/sheets/knight-sheet.ts && grep -q 'HandlebarsApplicationMixin' packages/battleframe-greathelm/src/sheets/knight-sheet.ts \|\| { echo "knight-sheet.ts: must use foundry.applications.sheets.ActorSheetV2 + HandlebarsApplicationMixin (ApplicationV2 only on v14)"; exit 1; }` |
| The sheet registers with the module's **own** package id | STRUCTURAL | `grep -q '"battleframe-greathelm"' packages/battleframe-greathelm/src/sheets/knight-sheet.ts && ! grep -q 'game.system.id' packages/battleframe-greathelm/src/sheets/knight-sheet.ts \|\| { echo "knight-sheet.ts: must register with the module's own package id 'battleframe-greathelm', not game.system.id"; exit 1; }` |
| No ApplicationV1 sheet classes (v14 is ApplicationV2-only) | STRUCTURAL | `! grep -rn 'foundry.appv1' packages/battleframe-greathelm/src/ \|\| { echo "ApplicationV1 usage found — v14 target is ApplicationV2 only"; exit 1; }` |
| `npm test -- loop` passes | MECHANICAL | `npm test -- loop` |
| Core stays ignorant of the ruleset | MECHANICAL | `! grep -rn "battleframe-greathelm\|greathelm" packages/battleframe/src/ \|\| { echo "core references greathelm — requirement 9 violated; this is the design failing, not a detail"; exit 1; }` |
| No `Math.random` — all randomness through Foundry `Roll` | STRUCTURAL | `! grep -rn 'Math\.random' packages/battleframe-greathelm/src/ \|\| { echo "Math.random found — all randomness must go through game.battleframe.dice.roll"; exit 1; }` |
| All distances go through the core measurement service | STRUCTURAL | `grep -rq 'measure.between' packages/battleframe-greathelm/src/round/loop.ts \|\| { echo "loop.ts: distances must be measured via game.battleframe.measure.between — a centre-to-centre distance is a bug, not a variant"; exit 1; }` |
| No new numeric literals — every constant comes from `constants.ts` | STRUCTURAL | `! grep -rnE '\b(Inches\|Momentum\|Damage\|Limit)\s*[:=]\s*[0-9]' packages/battleframe-greathelm/src/round/loop.ts packages/battleframe-greathelm/src/combat/clash.ts \|\| { echo "numeric literal found in loop.ts/clash.ts — all constants must come from GREATHELM in constants.ts"; exit 1; }` |
| Ship no rules text: no rulebook, artwork, or binaries tracked | STRUCTURAL | `[ -z "$(git ls-files packages/battleframe-greathelm/ \| grep -iE '\.(pdf\|epub\|mobi\|cbz\|cbr\|png\|jpg\|jpeg\|webp\|svg\|gif)$')" ] \|\| { echo "packages/battleframe-greathelm: tracked rulebook/artwork file(s) — no rules content or artwork may ship"; exit 1; }` |
| Build succeeds | MECHANICAL | `npm run build` |

## Patterns to Follow

**There is no existing codebase — this project is greenfield.** Every file here is new, and
SS-10 (this sub-spec's only dependency) is being built in the same run. There are no in-repo
source patterns to detect and none to cite. What follows are **research notes in `vault/`**,
which the master spec ranks above recollection.

**Rules authority — `vault/greathelm/`:**

- `vault/greathelm/index.md`: **start here.** The map of all 36 notes and the confidence
  discipline.
- `vault/greathelm/battle-phase-initiative-steps.md` (`confirmed`): the 6→1 walk, the global
  step derived from the highest die *in play*, skipped empty steps, one-action alternation.
  **The core of this sub-spec.**
- `vault/greathelm/dice-face-to-action-mapping.md` (`confirmed`): the central table, and why
  only 4/2/1 are clash tests. Read from SS-10's `FACE_TO_ACTION` — do not restate it.
- `vault/greathelm/clash-test.md` (`confirmed`): the strict resolution order, and why it
  cannot be collapsed into one roll. Non-negotiable.
- `vault/greathelm/clash-bonuses.md` (`confirmed`; outnumbering geometry `partial`): all five
  modifiers and their action-matching.
- `vault/greathelm/clash-defenses.md` (`confirmed`): all four defenses and their riders.
- `vault/greathelm/heavy-armor-table.md` (`confirmed`): the second roll. Why winning a clash
  does not guarantee damage.
- `vault/greathelm/hasty-rolling.md` (`confirmed`): the null defense, and the correct
  software default for an undeclared defense or a timeout.
- `vault/greathelm/outnumbering.md` (`partial` on the geometry): **"do not hard-code without
  the full rulebook."** Read before implementing the bonus.
- `vault/greathelm/momentum.md` (`confirmed`; round-persistence `not found`): cap 3,
  attacker-only spend, sources, and the unresolved round-boundary question.
- `vault/greathelm/damage-and-removal.md` (`confirmed`): cap 3, **immediate** removal, and
  why removal shrinks the pool mid-game.
- `vault/greathelm/courage-phase.md` / `vault/greathelm/courage-test.md` (`confirmed`; the
  intra-phase cascade is `partial`): who tests, in what order, and the formula.
- `vault/greathelm/movement-and-measurement.md` (`confirmed`): real inches. Sprint **5"**.
  The distance discrepancy and its verdict.
- `vault/greathelm/base-contact-and-engagement.md` (`confirmed`): the only engagement
  concept. `inBaseContact(a,b)` is the hottest predicate in the ruleset — it gates attacks,
  outnumbering, and courage.
- `vault/greathelm/turn-options-activate-adjust-pass.md` (`confirmed`; voluntary pass
  `not found`) and `vault/greathelm/dice-adjust-rotate-down.md` (`confirmed`): the three turn
  options and the downgrade-only rotate.
- `vault/greathelm/action-economy-per-die-not-per-model.md` (`confirmed`): **no `activated`
  flag.** The budget is the pool.
- `vault/greathelm/engine-implications.md` (`unverified` — inference, flagged as such): §1
  the round primitive, §3 clash sequencing, §4 geometry. Engineering opinion; the rules it
  cites are confirmed elsewhere. Treat the framing as a suggestion, the citations as fact.
- `vault/greathelm/open-questions.md` (`unverified`): what is genuinely unknown. **Read
  before architecting.** Four items on the Unresolved list above come from here.

**Foundry API — `vault/foundry-systems/`:**

- `vault/foundry-systems/lancer-activation-based-combat-precedent.md` (`confirmed`): the
  master spec's preferred pattern — ignore `initiative`, sort on ruleset data, `turn: null`,
  own the tracker. The closest precedent to a wargame activation model.
- `vault/foundry-systems/applicationv2-sheet-structure.md` (`confirmed`): the class stack,
  `DEFAULT_OPTIONS`, `PARTS`, `_prepareContext`, and the `{{system.x}}` vs `name="system.x"`
  gotcha.
- `vault/foundry-systems/v13-v14-sheet-registration-namespaces.md` (`confirmed`): the exact
  v14 registration call, and why the package-id argument is the module/system boundary.
- `vault/foundry-systems/modules-can-register-sheets-for-system-types.md`: nothing restricts
  `types` to the caller's own subtypes. Context; this module registers for its own type.
- `vault/foundry-systems/combat-overridable-methods-reference.md` and
  `vault/foundry-systems/turn-order-model-is-replaceable-but-storage-is-not.md`: what core
  combat will and will not do for you. Relevant because this module owns the loop.

## Files

Prefix any path a sub-spec will CREATE (not yet present on disk) with `will-create:`.
**Every path in this sub-spec is new.**

| File | Action | Purpose |
|------|--------|---------|
| will-create: packages/battleframe-greathelm/src/round/loop.ts | Create | The entire turn loop: initiative phase, battle phase walking 6→1 with one-action alternation, the three turn options, movement validation via `measure.between`, the courage phase, and the write to `combat.flags.battleframe.order` |
| will-create: packages/battleframe-greathelm/src/combat/clash.ts | Create | The strictly-sequenced clash test — blind defense, blind momentum, opposed d6 through `dice.roll`, attacker wins ties, armour table, momentum award. Returns a result; applies nothing |
| will-create: packages/battleframe-greathelm/src/sheets/knight-sheet.ts | Create | ApplicationV2 sheet (`ActorSheetV2` + `HandlebarsApplicationMixin`), registered via `DocumentSheetConfig` with the module's own package id for type `battleframe-greathelm.knight` |
| will-create: packages/battleframe-greathelm/templates/knight-sheet.hbs | Create | Renders state only — damage, momentum, equipment. No rules text, no stat line, no artwork |
| will-create: packages/battleframe-greathelm/tests/loop.test.ts | Create | Test file: full 6→1 ordering, an empty pool, a round where one side has no legal action, alternation, turn options, Sprint = 5" base-to-base, clash sequencing, damage persistence, the order flag |
| vault/greathelm/open-questions.md | Modify | Record the momentum round-boundary policy, the outnumbering geometry reading, the courage intra-phase cascade, and the strict voluntary-pass reading as named, swappable seams |
