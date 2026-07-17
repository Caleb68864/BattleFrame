---
type: master-spec
title: Battleframe — Core + GREATHELM MVP
date: 2026-07-16
author: Caleb Bennett
status: draft
---

# Battleframe — Core + GREATHELM MVP

## Meta

- **Client:** Internal / personal
- **Project:** Battleframe
- **Repo:** `C:\Users\CalebBennett\Documents\GitHub\BattleFrame`
- **Date:** 2026-07-16
- **Author:** Caleb Bennett
- **Source design:** `docs/plans/2026-07-16-battleframe-foundry-skirmish-engine-design.md` (status: evaluated)
- **Status:** Draft
- **Scope:** MVP only — design Phases 0–3. Phases 4 / 4.5 / 5 are backlogged.

### Quality scores

| Dimension | Score | Note |
|---|---|---|
| Outcome clarity | 5 | Desired End State is concrete and physically checkable |
| Scope boundaries | 5 | Exclusions section is extensive and evidence-backed |
| Decision guidance | 5 | Intent + Decision Authority + committed interface defaults |
| Edge coverage | 5 | Silent-failure modes named; upgrade path and `not found` escalation added by red-team |
| Acceptance criteria | 4 | Typed throughout; measurement has fixtures. Capped by SS-01 being observational |
| Decomposition | 5 | 12 sub-specs, dependency-ordered; SS-10 split during red-team |
| Purpose alignment | 5 | The design *is* a purpose reframe — canvas layer, not rules engine |
| **Total** | **34 / 35** | Walk-away quality. Red-team: 4 CRITICAL + 10 ADVISORY, all resolved |

## Outcome

A Foundry v14 world running the `battleframe` system with `battleframe-greathelm` enabled,
in which two six-knight forces play a full GREATHELM round — **all three phases: Initiative
→ Battle → Courage**. The dice pool resolves 6→1 with actions hard-selected by die face,
Sprint measures **5" base-to-base** and is verified against a known-distance fixture, clash
tests roll through core dice into chat, damaged knights in base contact take courage tests,
and wounds persist on the Actor.

*(The courage phase was added during prep. The vault confirms — QSR p1, verbatim — that a
round has **exactly three** phases; the original Outcome described only two. A "full round"
missing a confirmed phase is not a full round.)*

Core contains **zero** GREATHELM-specific code, and the core test suite imports **no**
ruleset package.

## Intent

**Purpose.** To play miniature skirmish games on a table that measures correctly — and to
do that once, rather than once per game. Every game researched needs base-to-base distance
and circular bases; Foundry provides neither, and no precedent system has solved it. That
gap is the product. The rules are not.

**When this spec is silent, prefer the choice that keeps core ignorant of any specific
game.**

**Trade-off hierarchy** (higher wins when they conflict):

1. **Core neutrality over convenience.** If core needs to know what a round is, the design
   has failed. A ruleset writing more code is the correct outcome.
2. **Loud failure over plausible output.** Every dangerous failure here is silent — wrong
   ranges, wrong stats. A crash is recoverable; a wrong number is not noticed.
3. **Confirmed research over recollection.** `vault/` beats training memory. Foundry's API
   changed heavily v10→v14 and remembered idioms are usually stale.
4. **Working now over perfect later.** Pre-1.0, single developer, no users. Churn is fine.
5. **Simple over flexible.** The toolkit does not exist yet, on purpose. Do not build
   abstractions here.

**Decision boundaries — stop and ask when:**

- The SS-01 measurement gate fails → **stop**. Re-scope with a human.
- Core needs game-specific knowledge to make GREATHELM work → **stop**. That is the design
  breaking, not a detail.
- A ruleset requires a core change → **stop and record it**. That is the neutrality claim
  failing.
- Anything touches shipping, publishing, licensing, or trademark → **human only**.
- Real Foundry contradicts a vault note → **stop, correct the note, continue.** Foundry is
  right.

## Context

Battleframe is a Foundry VTT **game system**; individual games ship as separately-installed
**ruleset modules** that register with it. This spec builds the system and the first
ruleset.

The architecture rests on ~260 atomized research notes in `vault/` (gitignored). Key
confirmed findings that this spec depends on:

- **Modules can contribute Actor/Item subtypes to a system** — official since Foundry v11.
  Type *names* are declared statically in `module.json`; the **DataModel class** is
  registered at `init` via `CONFIG.Actor.dataModels`, a plain mutable object a module writes
  into without the system's cooperation. (`vault/foundry-systems/modules-can-contribute-document-subtypes.md`)
- **Subtypes are namespaced by package id** — `greathelm.knight` cannot collide with another
  module's `knight`. Do not write type-collision detection.
- **Lancer is the precedent for activation-based combat** — ignore `initiative`, sort on
  ruleset data, `turn: null`, own the tracker via `CONFIG.ui.combat`.
  (`vault/foundry-systems/lancer-activation-based-combat-precedent.md`)
- **Foundry v14 is current** (14.363 confirmed on the target server). ApplicationV2 only,
  no `template.json`.
- **GREATHELM's rulebook is at `vault/greathelm/GREATHELM-QSR.pdf`** (v0.4, 5pp). It is the
  authority. The web is wrong about it — Goonhammer says Run = 6"; the rulebook says
  **Sprint = 5"**.

**Why activation is not in core:** five researched games produced five incompatible turn
structures — GREATHELM fuses initiative/action/sequence into one dice pool; Battlefront
Valkyrie has no activation and runs two orderings per round; INX interrupts with reactions;
Classic BattleTech is phase-structured; Song of Blades discovers turn length mid-turn by a
die roll. No shared primitive exists. See `vault/candidate-rulesets/activation-model-comparison.md`.

**Why nothing ships content:** four of four "free" games (OPR, INX, Valkyrie, BattleTech)
are free-to-read and **not** free-to-ship. See `vault/battletech/licensing-verdict-battletech.md`.

### Committed decisions (no further escalation)

- **Language:** TypeScript. **Build:** Vite. **Tests:** Vitest.
- **Repo layout:** monorepo. `packages/battleframe/` (the system) and
  `packages/battleframe-greathelm/` (the module). Two Foundry packages developed together;
  deployed by copying each into Foundry's `Data/systems/` and `Data/modules/`.
- **Base units:** millimetres. That is what miniature bases use and what OPR's API returns
  (`bases: {round: "120x92"}`).
- **Grid default:** gridless (`type: 0`), `distance: 1`, `units: "in"`. GREATHELM is played
  on a sheet of paper.
- **No toolkit in this spec.** It is Phase 5 and is deliberately absent.

## Requirements

1. `battleframe` installs as a Foundry **v14** game system and a world can be created on it.
2. `battleframe-greathelm` installs as a Foundry module, declares `relationships.systems` →
   `battleframe`, and registers through `game.battleframe.api`.
3. Battleframe shows a first-launch setup wizard that detects installed rulesets, allows
   selecting exactly one primary, and warns on conflicts.
4. **Measurement is base-to-base, never centre-to-centre**, and is verified against
   known-distance fixtures rather than by inspection.
5. Miniature bases are modelled as circles/ovals sized in millimetres, mapped onto Foundry's
   rectangular token footprint.
6. Combat persists and syncs, with `initiative: null` permanently; turn order is authored
   solely by the ruleset.
7. Dice go through Foundry `Roll` unmodified, so Dice So Nice works with no integration
   code.
8. GREATHELM plays a full round: dice pool resolves 6→1, die face hard-selects the action,
   Sprint = 5" base-to-base, clash tests render to chat, wounds persist.
9. **Core contains no GREATHELM-specific code.** The core test suite imports no ruleset.
10. Battleframe works with **zero** optional third-party modules installed.
11. **No commercial rules text, stat blocks, unit data, or artwork ship in any package.**

## Sub-Specs

---
sub_spec_id: SS-01
phase: preflight
depends_on: []
dispatch: manual
---

### 1. Run the measurement spike and record results

- **Scope:** Deploy the existing throwaway spike to a Foundry v14 instance, run the three
  probes, and record what is actually observed. **This is a human/operator task** — it needs
  a licensed Foundry, a live world, and eyes on a console. It cannot be automated and is
  marked `dispatch: manual` accordingly.

  **This is a gate.** If probe 2 shows base-to-base is unreachable via `measurePath`'s
  `cost` callback, **stop and re-scope with a human** — core must then own measurement
  outright and replace the ruler, roughly doubling SS-04. Do not proceed on assumption.

- **Files (new):**
  - `vault/foundry-systems/spike-results-measurement.md`
  - `vault/foundry-systems/spike-results-regions.md`
  - `vault/foundry-systems/spike-results-module-subtypes.md`
- **Acceptance criteria:**
  - `[HUMAN REVIEW]` The spike packages in `spike/` load in Foundry v14 without console
    errors. They were written blind from research notes and are expected to need iteration.
  - `[HUMAN REVIEW]` Probe 1: a `bf-ruleset-test.squad` Actor is created, **survives a world
    reload**, and works as a token. Both modules' `squad` types coexist.
  - `[HUMAN REVIEW]` Probe 2: `game.bfSpike.probeMeasurement()` output is recorded verbatim,
    including whether the `cost` callback can express base-to-base and what units a gridless
    scene reports.
  - `[HUMAN REVIEW]` Probe 3: `game.bfSpike.probeRegions()` output is recorded, including
    whether `MeasuredTemplate` is gone and whether Regions can preview without persisting.
  - `[STRUCTURAL]` Each result note carries frontmatter `confidence: confirmed` and cites
    observed console output — not inference.
  - `[STRUCTURAL]` Any existing note in `vault/foundry-systems/` that real Foundry
    contradicts is corrected, with the correction stated explicitly.
- **Decisions (SS-01):** If the spike disagrees with the vault, **the vault is wrong**.
  Correct it. Do not adjust observations to match notes.
- **Dependencies:** none

---
sub_spec_id: SS-02
phase: run
depends_on: ['SS-01']
dispatch: factory
---

### 2. Monorepo scaffold and system manifest

- **Scope:** Stand up the repo: TypeScript, Vite, Vitest, and a loadable (empty) Foundry v14
  system. No game logic. The system must load in Foundry and log readiness — nothing more.
- **Files (new):**
  - `package.json`
  - `tsconfig.json`
  - `vitest.config.ts`
  - `packages/battleframe/package.json`
  - `packages/battleframe/system.json`
  - `packages/battleframe/vite.config.ts`
  - `packages/battleframe/src/battleframe.ts`
  - `packages/battleframe/src/constants.ts`
  - `packages/battleframe/lang/en.json`
  - `README.md`
  - `LICENSE`
- **Acceptance criteria:**
  - `[MECHANICAL]` `npm install && npm run build` exits 0.
  - `[MECHANICAL]` `npm test` exits 0 (a trivial passing test is acceptable here).
  - `[STRUCTURAL]` `packages/battleframe/system.json` contains `"id": "battleframe"`,
    `compatibility: {minimum: "14", verified: "14"}` with **no** `maximum` key, and
    `grid: {type: 0, distance: 1, units: "in"}`.
  - `[STRUCTURAL]` `system.json` declares `documentTypes.Actor.generic` and **no**
    game-specific types.
  - `[MECHANICAL]` `grep -c "template.json" packages/battleframe/system.json` returns 0 —
    deprecated in v14.
  - `[STRUCTURAL]` The build emits an ES module; `system.json` references it via
    `esmodules`, not `scripts`. **Committed default:** Vite outputs to
    `packages/battleframe/dist/battleframe.js`, and `system.json` declares
    `"esmodules": ["dist/battleframe.js"]` — manifest paths are relative to the package root.
  - `[STRUCTURAL]` **Committed default:** the root `package.json` declares npm workspaces
    `["packages/*"]`, so `npm install` at the repo root installs both packages. Without this
    the `npm install` criterion above cannot pass.
  - `[MECHANICAL]` `node -e "const p=require('./package.json'); process.exit(p.workspaces?0:1)"`
    exits 0.
  - `[BEHAVIORAL]` Copying `packages/battleframe/` into Foundry `Data/systems/battleframe/`
    allows a world to be created on it, and the console logs a readiness line at `ready`.
  - `[MECHANICAL]` **No copyrighted source document is tracked.**
    `git ls-files | grep -iE '\.(pdf|epub|mobi|cbz|cbr)$'` returns nothing. Rulebooks
    obtained for reference must never be redistributed — not in the repo, not in a release.
  - `[MECHANICAL]` **The research notes ARE tracked.**
    `git ls-files vault/ | grep -c '\.md$'` returns > 200. Factory workers spawn a worktree
    from HEAD; if the notes are absent, SS-04 and SS-10 have no rulebook and no precedent to
    read, and will fall back to web sources that are known to be **wrong** (see Context).
- **Decisions (SS-02):** Run `git init` and make the first commit as part of this sub-spec —
  the repo is not yet under version control. `.gitignore` ignores `vault/**/*.pdf` (and
  other source-document formats) but **tracks `vault/**/*.md`**. This is deliberate and was
  changed during red-team: the notes are our own writing and workers need them; only the
  proprietary source documents stay local.
- **Dependencies:** SS-01

---
sub_spec_id: SS-03
phase: run
depends_on: ['SS-02']
dispatch: factory
---

### 3. Base model — miniature bases as circles

- **Scope:** Model a miniature base as a circle/oval sized in millimetres, and map it onto
  Foundry's rectangular token footprint. Measurement is meaningless without this, so it
  lands first.
- **Files (new):**
  - `packages/battleframe/src/base/base-model.ts`
  - `packages/battleframe/src/base/types.ts`
  - `packages/battleframe/tests/base-model.test.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `getBase(token)` reads `token.flags.battleframe.base` shaped
    `{shape: "circle"|"oval", widthMm: number, heightMm: number}`.
  - `[STRUCTURAL]` When the flag is **absent**, a circle is derived from the token footprint
    and a debug line is logged once — not per call.
  - `[STRUCTURAL]` When the flag is **present**, it wins over the footprint.
  - `[MECHANICAL]` `npm test -- base-model` passes with cases for: circle, oval, missing
    flag, zero-size, and a base larger than its token. **Zero-size throws a specific error
    and never coerces** — per Edge Cases ("handles invalid input" → strict) and trade-off #2
    (loud failure over plausible output). A base of size 0 makes every distance wrong
    silently. Specified during prep; it was previously left to inference.
  - `[STRUCTURAL]` `radiusPx(token, scene)` converts mm → pixels using the scene's grid
    size and distance, and is unit-tested against a known scene configuration.
- **Decisions (SS-03):** Millimetres, always. Convert at the boundary. Never store inches or
  pixels in the base model.
- **Dependencies:** SS-02

---
sub_spec_id: SS-04
phase: run
depends_on: ['SS-03']
dispatch: factory
---

### 4. Measurement service — base-to-base distance

- **Scope:** The engine's reason to exist. Base-to-base distance for gridless, square and
  hex scenes, with fixtures that prove it.

  **Read `vault/foundry-systems/spike-results-measurement.md` (produced by SS-01) before
  writing any code** — it determines whether `measurePath`'s `cost` callback suffices or
  whether core must measure directly.

  **If that file does not exist, STOP and escalate. Do not proceed.** SS-01 is
  `dispatch: manual` and requires a human with a licensed Foundry; its absence means the gate
  has not been run, not that it passed. Guessing here produces silently wrong ranges in every
  game Battleframe will ever host — the single worst failure mode in this project.
- **Files (new):**
  - `packages/battleframe/src/measurement/measure.ts`
  - `packages/battleframe/src/measurement/types.ts`
  - `packages/battleframe/tests/measure.test.ts`
  - `packages/battleframe/tests/fixtures/known-distances.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `game.battleframe.measure.between(tokenA, tokenB)` returns
    `{distance: number, units: string, mode: "base-to-base"}` and takes **Tokens, not
    points**.
  - `[MECHANICAL]` `npm test -- measure` passes against known-distance fixtures covering:
    gridless, square, and hex; equal and unequal base sizes.
  - `[BEHAVIORAL]` Two tokens whose bases touch return **exactly 0**, not a small positive
    number.
  - `[BEHAVIORAL]` Two tokens whose bases **overlap** return 0 — never negative.
  - `[STRUCTURAL]` A property test asserts `between(a,b) === between(b,a)`.
  - `[STRUCTURAL]` A test asserts base-to-base equals centre-to-centre **minus the sum of
    base radii**, for non-overlapping tokens.
  - `[MECHANICAL]` `grep -rn "measurePath" packages/battleframe/src/ | grep -v "measurement/"`
    returns nothing — measurement is not reimplemented anywhere else.
  - `[HUMAN REVIEW]` The on-screen ruler and `measure.between()` agree. If they diverge,
    players trust the ruler and the game is silently wrong.
  - `[STRUCTURAL]` **Measurement is inspectable, not implicit.** The returned object carries
    enough to explain itself — at minimum `{distance, units, mode}` — and a debug-level log
    records centre-to-centre, both base radii, and the resulting base-to-base value. A wrong
    distance is otherwise undebuggable: there is no error, just a number that is quietly
    incorrect.
- **Decisions (SS-04):** If the SS-01 gate showed `cost` cannot express base-to-base,
  implement measurement directly on `canvas.dimensions` + the base model and **stop before
  replacing the ruler** — that is a separate, larger piece of work needing a human decision.
- **Dependencies:** SS-03

---
sub_spec_id: SS-05
phase: run
depends_on: ['SS-02']
dispatch: factory
---

### 5. Ruleset registry and public API

- **Scope:** The registration surface rulesets bind to: validation, compatibility checks,
  exactly one active primary, and the `game.battleframe.api` namespace. **There is no
  official API mechanism for Foundry systems** — `game.system.api` is pure convention, so
  this namespace is ours to define.
- **Files (new):**
  - `packages/battleframe/src/rulesets/registry.ts`
  - `packages/battleframe/src/rulesets/types.ts`
  - `packages/battleframe/src/rulesets/validate.ts`
  - `packages/battleframe/src/api/index.ts`
  - `packages/battleframe/src/hooks/index.ts`
  - `packages/battleframe/tests/registry.test.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `game.battleframe.api.registerRuleset(def)` returns
    `{ok: true} | {ok: false, errors: string[]}` and **does not throw**.
  - `[STRUCTURAL]` `def` is `{id, title, version, battleframeCompatibility: {minimum, verified}, primary: boolean}`.
  - `[BEHAVIORAL]` Registering a duplicate `id` returns `{ok: false}` with an actionable
    error naming the conflict.
  - `[BEHAVIORAL]` Registering with `battleframeCompatibility.minimum` above the running
    system version returns `{ok: false}` and does **not** partially register.
  - `[BEHAVIORAL]` Registration never activates. `getActiveRuleset()` returns null until
    `activateRuleset(id)` is called.
  - `[BEHAVIORAL]` Two rulesets with `primary: true` both register successfully; the
    conflict is surfaced at activation, not registration.
  - `[STRUCTURAL]` Hooks `battleframe.ready`, `battleframe.rulesetRegistered`, and
    `battleframe.rulesetActivated` fire, named exactly so.
  - `[MECHANICAL]` `npm test -- registry` passes.
  - `[MECHANICAL]` `grep -rn "greathelm" packages/battleframe/src/` returns nothing.
- **Decisions (SS-05):** Do **not** write type-name collision detection — Foundry namespaces
  subtypes by package id, so collisions are structurally impossible. Police ruleset `id`
  only. If SS-01 showed module `init` precedes system `init`, move registration to `setup`
  and note it.
- **Dependencies:** SS-02

---
sub_spec_id: SS-06
phase: run
depends_on: ['SS-05']
dispatch: factory
---

### 6. Combat shell — persistence without a turn model

- **Scope:** A Combat document and tracker that persist and sync **without knowing what a
  round is**. This is the component most likely to be argued about, because it looks like it
  should own more. It must not. Follow the Lancer precedent —
  read `vault/foundry-systems/lancer-activation-based-combat-precedent.md` first.
- **Files (new):**
  - `packages/battleframe/src/combat/battleframe-combat.ts`
  - `packages/battleframe/src/combat/tracker.ts`
  - `packages/battleframe/src/combat/types.ts`
  - `packages/battleframe/tests/combat.test.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` Combatants carry `initiative: null` permanently; nothing writes a number
    to it.
  - `[STRUCTURAL]` Order lives in `combat.flags.battleframe.order: string[]` (Combatant ids)
    and is **read** by core, never written by core.
  - `[MECHANICAL]` `grep -rn "rollInitiative\|_sortCombatants" packages/battleframe/src/combat/`
    returns nothing.
  - `[BEHAVIORAL]` The tracker renders in the order given by the flag, including when the
    flag changes mid-round.
  - `[BEHAVIORAL]` An **empty** order array renders an empty tracker without error — some
    games have no per-unit activation at all.
  - `[BEHAVIORAL]` Order and combat state survive a world reload.
  - `[HUMAN REVIEW]` Order and combat state sync to a **second connected client**. Retagged
    during red-team: this needs two live browsers and cannot be asserted by a worker.
  - `[STRUCTURAL]` The tracker is registered via `CONFIG.ui.combat`.
  - `[MECHANICAL]` `npm test -- combat` passes.
- **Decisions (SS-06):** Core provides **no** `nextTurn`, `advanceActivation`, or round
  semantics. If a ruleset needs one, the ruleset writes it. This is deliberate — see Intent.

  **Two facts are `not found` in the vault. Do not guess either — surfaced during prep:**
  1. **The v14 ApplicationV2 combat-tracker base class.** `CONFIG.ui.combat` as the
     registration key is `confirmed`; the superclass's v14 namespace path is recorded
     nowhere. Resolve it against the real v14 API or escalate. **Do not extrapolate from
     `v13-v14-sheet-registration-namespaces.md`** — that note covers *sheets*, which are a
     different registration path.
  2. **Whether `Combatant#initiative`'s schema accepts `null`.**
     `combat-overridable-methods-reference.md` records that `required`/`nullable`/`integer`
     are not stated in the docs. **If the schema rejects `null` at runtime, escalate** — do
     not fall back to `0`. Lancer does `initiative ??= 0`; this project forbids it. That
     divergence is deliberate.
- **Dependencies:** SS-05

---
sub_spec_id: SS-07
phase: run
depends_on: ['SS-02']
dispatch: factory
---

### 7. Dice service — deliberately thin

- **Scope:** A passthrough to Foundry `Roll` plus chat rendering. Its thinness is the
  feature: it is what makes Dice So Nice work with zero integration code.
- **Files (new):**
  - `packages/battleframe/src/dice/dice.ts`
  - `packages/battleframe/src/dice/chat.ts`
  - `packages/battleframe/tests/dice.test.ts`
- **Acceptance criteria:**
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
- **Decisions (SS-07):** Add **no** dice mechanics — no exploding, no re-rolls, no
  success-counting. Those belong to rulesets. If this file grows past ~100 lines, something
  has gone wrong.
- **Dependencies:** SS-02

---
sub_spec_id: SS-08
phase: run
depends_on: ['SS-05']
dispatch: factory
---

### 8. Generic Actor type and fallback conversion

- **Scope:** The system's own minimal Actor type. It exists for two reasons: so Battleframe
  is usable with no ruleset installed, and as the landing pad when a ruleset module is
  disabled and its subtypes vanish — which otherwise **looks exactly like data loss**.
- **Files (new):**
  - `packages/battleframe/src/data/generic-actor.ts`
  - `packages/battleframe/src/documents/actor.ts`
  - `packages/battleframe/src/applications/generic-actor-sheet.ts`
  - `packages/battleframe/templates/generic-actor-sheet.hbs`
  - `packages/battleframe/src/rulesets/orphan-check.ts`
  - `packages/battleframe/tests/orphan-check.test.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `GenericActorData` extends `foundry.abstract.TypeDataModel` — not bare
    `DataModel` — and is registered at `init` via `CONFIG.Actor.dataModels.generic`.
  - `[STRUCTURAL]` The sheet uses ApplicationV2 via
    `foundry.applications.sheets.ActorSheetV2` + `HandlebarsApplicationMixin`, registered
    through `foundry.applications.apps.DocumentSheetConfig`.
  - `[BEHAVIORAL]` At `ready`, Actors whose `type` belongs to a **disabled** module are
    detected and the GM is warned loudly, naming the module and the count.
  - `[BEHAVIORAL]` The warning offers conversion to `generic` and **preserves the original
    `system` payload** so nothing is destroyed.
  - `[BEHAVIORAL]` **No orphaned Actor is ever silently dropped or auto-converted.** The GM
    decides.
  - `[MECHANICAL]` `npm test -- orphan-check` passes, covering: no orphans, one orphan, and
    orphans from two different disabled modules.
  - `[STRUCTURAL]` **Migration flag plumbing exists.** Core stamps
    `flags.battleframe.schemaVersion` on Actors **core itself creates** (the generic type),
    using core's own version. **Core does not stamp on a ruleset's behalf** — it would have
    to know the ruleset to do so, which breaks neutrality. Rulesets stamp their own
    documents using the exported helper below. Scope clarified during prep.
  - `[STRUCTURAL]` `getSchemaVersion(doc)` / `setSchemaVersion(doc, v)` are exported and
    unit-tested, including a document with **no** flag (treat as unversioned — never assume
    current).
  - `[MECHANICAL]` `grep -rn "schemaVersion" packages/battleframe/src/settings/` returns
    nothing — version is **per-document**, never a world setting. Documents arrive from
    ruleset compendia at arbitrary versions and a world-level number cannot describe that.
  - `[STRUCTURAL]` Orphan conversion writes the original payload to
    `flags.battleframe.orphanedFrom = {packageId, type, system}` so nothing is destroyed and
    the conversion is reversible.
- **Decisions (SS-08):** Migration versioning lives in **per-document flags**, not a world
  setting. **Only the flag plumbing is in scope here** — stamping and reading. No migration
  runner (backlogged to `docs/backlog/battleframe-migration-runner.md`). The plumbing lands
  now because stamping documents from day one is the part that is expensive to retrofit; the
  runner is not.

  **Do NOT give `GenericActorData` an `ObjectField` freeform payload.** Decided during prep.
  The supporting note (`objectfield-as-a-freeform-system-data-escape-hatch.md`) is
  `confidence: unverified` and self-flags that nested contents may bypass `htmlFields`
  sanitization — a security concern, not an inconvenience. It is also unnecessary: the
  orphan payload lives in **flags**, which need no schema.

  **`not found` — do not guess, implement defensively and let the live world settle it:**
  whether orphaned documents remain reachable via `game.actors` or only via
  `game.actors.invalidDocumentIds`. This determines how `findOrphanedActors` enumerates.
  Also `not found`: a confirmed v14 signature for `game.settings.registerMenu` (only
  `game.settings.register` is confirmed).
- **Dependencies:** SS-05

---
sub_spec_id: SS-09
phase: run
depends_on: ['SS-05']
dispatch: factory
---

### 9. Setup wizard

- **Scope:** First-launch wizard that finds installed rulesets, takes exactly one primary,
  and refuses to leave the world ambiguous.
- **Files (new):**
  - `packages/battleframe/src/applications/setup-wizard.ts`
  - `packages/battleframe/templates/setup-wizard.hbs`
  - `packages/battleframe/src/settings/index.ts`
  - `packages/battleframe/styles/battleframe.css`
  - `packages/battleframe/tests/settings.test.ts`
- **Acceptance criteria:**
  - `[BEHAVIORAL]` On first launch with setup incomplete, the wizard opens automatically for
    a GM and **never** for a player.
  - `[BEHAVIORAL]` It lists each registered ruleset with title, version, and compatibility.
  - `[BEHAVIORAL]` Selecting a primary calls `activateRuleset(id)` **first**, and writes the
    `activeRulesetId` world setting **only on success**. Order specified during prep: the
    reverse leaves a world persistently pointing at a ruleset that failed to activate, which
    survives reloads and looks like corruption.
  - `[BEHAVIORAL]` With **two** `primary: true` rulesets registered, the wizard warns,
    names both, and offers to disable one. It **refuses to activate either** until resolved.
  - `[BEHAVIORAL]` With **zero** rulesets installed, the wizard explains that Battleframe is
    an engine and needs a ruleset — rather than appearing broken.
  - `[BEHAVIORAL]` The wizard reopens from a settings menu after first launch.
  - `[STRUCTURAL]` World settings exist for `activeRulesetId`, `setupCompleted`, and
    `defaultGridUnit`.
  - `[MECHANICAL]` `npm test -- settings` passes.
- **Decisions (SS-09):** The zero-ruleset case is a real product state, not an error.
  Battleframe with no ruleset is a table and a ruler. Say so plainly.
- **Dependencies:** SS-05

---
sub_spec_id: SS-10
phase: run
depends_on: ['SS-04', 'SS-06', 'SS-07', 'SS-08']
dispatch: factory
---

### 10. GREATHELM module foundation — registration, knight, dice pool

- **Scope:** The first real ruleset, and the proof that core is neutral. A separate Foundry
  **module** that contributes its own Actor subtype.

  **This sub-spec is the foundation only:** manifest, registration, the knight data model,
  the dice pool, and the face→action mapping. The round loop, clash resolution, and the
  sheet are **SS-11**. Split during red-team — the combined sub-spec touched 13 files and
  matched the historical high-defer pattern.

  **Read `vault/greathelm/` — start at `index.md`.** Those 36 notes are the authority
  available to you. They were written directly from the official QSR, and mechanics 1–6 and
  9 are transcribed verbatim from it, each marked `confirmed` with a source. **Respect the
  `confidence:` frontmatter** — `unverified` means someone inferred it.

  **`vault/greathelm/GREATHELM-QSR.pdf` is deliberately NOT in git** — it is a copyrighted
  rulebook and must never be redistributed. It will not exist in your worktree. Do not go
  looking for it, and **do not substitute web sources: they are known to be wrong.**
  Goonhammer says Run = 6"; the rulebook says Sprint = **5"**. If a fact you need is not in
  the notes, it is `not found` — **escalate; do not fill it in from genre convention.**

  Every constant is provisional: the QSR is v0.4, explicitly pre-1.0 and "introductory".

  **Ship no rules text.** Implement mechanics; ship no prose, no stat blocks, no artwork.
  The rulebook is proprietary and users must obtain their own.

  Scope is the **round loop only** (across SS-10 + SS-11). Scenes, campaigns, warband
  construction, and objectives are "not found" in the QSR — **not invented**. Out of scope.
- **Files (new):**
  - `packages/battleframe-greathelm/package.json`
  - `packages/battleframe-greathelm/module.json`
  - `packages/battleframe-greathelm/vite.config.ts`
  - `packages/battleframe-greathelm/src/main.ts`
  - `packages/battleframe-greathelm/src/constants.ts`
  - `packages/battleframe-greathelm/src/data/knight.ts`
  - `packages/battleframe-greathelm/src/round/dice-pool.ts`
  - `packages/battleframe-greathelm/src/round/actions.ts`
  - `packages/battleframe-greathelm/lang/en.json`
  - `packages/battleframe-greathelm/tests/dice-pool.test.ts`
- **Acceptance criteria:**
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
- **Decisions (SS-10):** Initiative ties are **not specified** in the v0.4 QSR. Re-roll tied
  pools; mark it clearly as an **invented house rule** in a code comment and record it in
  `vault/greathelm/open-questions.md`. Do **not** present it as a real rule.
- **Dependencies:** SS-04, SS-06, SS-07, SS-08

---
sub_spec_id: SS-11
phase: run
depends_on: ['SS-10']
dispatch: factory
---

### 11. GREATHELM round loop, clash resolution, and sheet

- **Scope:** The half of GREATHELM that plays. Consumes SS-10's dice pool and action
  mapping; owns the round loop, clash tests, wounds, and the knight sheet.

  **This module owns its entire turn loop.** Core provides no `nextTurn` and no round
  semantics — that is the design, not an omission. Read `vault/greathelm/` for the
  mechanics; respect `confidence:` frontmatter; escalate rather than invent anything marked
  `not found`.
- **Files (new):**
  - `packages/battleframe-greathelm/src/round/loop.ts`
  - `packages/battleframe-greathelm/src/round/courage.ts`
  - `packages/battleframe-greathelm/src/combat/clash.ts`
  - `packages/battleframe-greathelm/src/sheets/knight-sheet.ts`
  - `packages/battleframe-greathelm/templates/knight-sheet.hbs`
  - `packages/battleframe-greathelm/tests/loop.test.ts`
  - `packages/battleframe-greathelm/tests/courage.test.ts`
- **Acceptance criteria:**
  - `[BEHAVIORAL]` The round resolves **6→1**, so movement always precedes violence. This is
    the game's central elegance — the 6s that win initiative are the same 6s that cannot
    attack.
  - `[BEHAVIORAL]` Sprint moves up to **5"**, measured via
    `game.battleframe.measure.between` — **base-to-base**. Not 6". The web is wrong about
    this number.
  - `[MECHANICAL]` `grep -n 'SPRINT' packages/battleframe-greathelm/src/constants.ts` shows
    the value **5**, and the Sprint constant is referenced nowhere else as a literal.
    Rewritten during prep: the original `grep -rn '\b6"'` **false-positives on any version
    string** — `"0.4.6"` ends in `6"`. A positive assertion on the constant is both narrower
    and stronger than a negative grep for the wrong value.
  - `[BEHAVIORAL]` A clash test rolls through `game.battleframe.dice.roll` and renders to
    chat.
  - `[BEHAVIORAL]` Wounds persist on the Actor across a world reload.
  - `[BEHAVIORAL]` **The courage phase runs.** After all initiative dice are spent, any
    knight that is **both** damaged (≥1 damage marker) **and** in base contact with an enemy
    takes a courage test. An undamaged knight never tests; a damaged knight standing alone
    never tests. Added during prep — the round has exactly three phases (QSR p1, confirmed)
    and this one was missing.
  - `[BEHAVIORAL]` Courage test **order**: the player with the most total damage markers
    across their warband takes **all** their tests first; tie → fewest remaining knights
    tests first.
  - `[STRUCTURAL]` Base contact is `game.battleframe.measure.between(a, b) === 0` — it is
    **not** a separate engagement-range concept. GREATHELM has no zone of control and no
    engagement range; touching bases is the only spatial relation in the game
    (`vault/greathelm/base-contact-and-engagement.md`, confirmed). This is the direct
    consumer of SS-04's "touching bases return exactly 0" criterion.
  - `[STRUCTURAL]` Turn order is written to `combat.flags.battleframe.order` **by this
    module**. Core never computes it.
  - `[BEHAVIORAL]` A knight with zero dice (no models) does not break the loop.
  - `[STRUCTURAL]` The sheet uses ApplicationV2 via
    `foundry.applications.sheets.ActorSheetV2` + `HandlebarsApplicationMixin`, registered
    with the **module's own** package id.
  - `[MECHANICAL]` `npm test -- loop courage` passes, covering: full 6→1 ordering, an empty
    pool, a round where one side has no legal action, and courage tests for — damaged +
    in-contact (tests), damaged + alone (does not test), undamaged + in-contact (does not
    test), and both tiebreaks.
  - `[MECHANICAL]` `grep -rn "battleframe-greathelm\|greathelm" packages/battleframe/src/`
    returns nothing — core stays ignorant.
- **Dependencies:** SS-10

---
sub_spec_id: SS-12
phase: run
depends_on: ['SS-09', 'SS-11']
dispatch: factory
---

### 12. Integration — wire it up and prove neutrality

- **Scope:** Wire every core service into the system entry point, prove the whole flow works
  end to end, and prove the neutrality claim mechanically rather than by assertion.

  **Note on `battleframe.ts`:** SS-02 creates it as a bare skeleton that only logs readiness.
  This sub-spec **rewrites it in full** to import and initialise every core service in the
  correct order, and to construct the `game.battleframe` namespace object that SS-04, SS-05
  and SS-07 all attach to. Both sub-specs legitimately declare the file — SS-02 owns its
  existence, SS-12 owns its content.
- **Files (new):**
  - `packages/battleframe/src/battleframe.ts`
  - `packages/battleframe/tests/integration/neutrality.test.ts`
  - `packages/battleframe/tests/integration/full-round.test.ts`
  - `scripts/deploy-local.mjs`
  - `docs/DEPLOY.md`
- **Acceptance criteria:**
  - `[INTEGRATION]` All core services (base model, measurement, registry, combat shell,
    dice, generic actor, settings, wizard) are imported and initialised from
    `packages/battleframe/src/battleframe.ts` at `init`, in an order that lets rulesets
    register afterwards.
  - `[INTEGRATION]` **Seam test, in-repo:** a **synthetic** ruleset definition (defined in the
    test, not imported from `battleframe-greathelm`) registers → activates → rolls a pool →
    writes an order → measures base-to-base → posts to chat. This proves **the public seams
    suffice to host a ruleset** without core importing one.

    Clarified during prep: this criterion and the neutrality criterion below **contradicted
    each other** as originally written — a literal "full GREATHELM round" test inside
    `packages/battleframe/tests/` would import the ruleset and trip neutrality. The synthetic
    definition resolves it, and is the better test anyway.
  - `[HUMAN REVIEW]` **The real full round is played in a live Foundry**, per the Verification
    section — not asserted by this suite. **Do not let a green tick stand in for the round
    having actually been played.** The seam test proves the seams; only a human proves the
    game.
  - `[MECHANICAL]` **The neutrality test:** `npm test -- neutrality` asserts that no file
    under `packages/battleframe/src/` imports from `packages/battleframe-greathelm/`, and
    that the core test suite imports no ruleset package. This is requirement 9, made
    executable.
  - `[MECHANICAL]` `grep -rniE "greathelm|knight|sprint|encircle|clash" packages/battleframe/src/`
    returns nothing. **This check is intentionally aggressive and will occasionally match an
    innocent comment** — e.g. "clash" in prose about conflicting ruleset ids. When it fires,
    **reword the comment; do not weaken the check.** Core staying free of game vocabulary is
    the point, not a side effect. Noted during prep.
  - `[BEHAVIORAL]` Disabling `battleframe-greathelm` leaves the world loadable, with the
    orphan warning from SS-08 firing rather than a crash.
  - `[BEHAVIORAL]` With **no** ruleset installed at all, the system still loads, the wizard
    explains itself, and the ruler measures.
  - `[MECHANICAL]` `node scripts/deploy-local.mjs --dest <foundry-data-dir>` copies both
    packages into `Data/systems/` and `Data/modules/` and exits 0.
  - `[HUMAN REVIEW]` **Did core need any change to host GREATHELM?** If yes, that is a design
    failure — record it in `docs/plans/` rather than quietly absorbing it.
- **Dependencies:** SS-09, SS-11

## Edge Cases

**Disambiguations** — resolved so no agent has to guess:

- **"handles invalid input" → strict.** Imports and registrations **reject** anything
  non-conforming with a specific error. Never coerce. Silent wrongness is the enemy here;
  a wrong points cost is a wrong game, not a degraded one.
- **"measurement" → always base-to-base.** A centre-to-centre distance anywhere in the
  codebase is a bug, not a variant.
- **"supports hex" → renders and measures on hex scenes.** It does **not** mean facing,
  hexside rules, or MP budgets. Those are Classic BattleTech's, and BattleTech is out of
  scope.
- **"ruleset conflict" → two `primary: true` rulesets active.** Not version mismatch, which
  is a separate rejection at registration.

**Scenarios:**

| Scenario | Handling |
|---|---|
| Bases touch | Distance is exactly `0`, never a small positive number |
| Bases overlap | Distance is `0`, never negative |
| Token has no base flag | Derive a circle from the footprint; debug-log **once**, not per call |
| Ruleset module disabled | Warn loudly, name the module, offer conversion, preserve the payload. Never auto-convert |
| Two primary rulesets | Warn, name both, refuse to activate either until resolved |
| Zero rulesets installed | A real product state — a table and a ruler. Explain, don't error |
| Ruleset throws in its own loop | Contain, surface the ruleset id, keep the world usable. Core cannot fix it |
| Empty combat order | Render an empty tracker — some games have no per-unit activation |
| GREATHELM initiative tie | Not specified in v0.4. Re-roll; mark as an invented house rule; record it |
| Dice So Nice absent | Rolls resolve normally. It is optional, always |
| Player opens a GM-only wizard | Never opens for a player |
| Ruleset upgraded to an incompatible version **after** a world exists | Warn at `ready`, name the ruleset and both versions, and **do not silently deactivate**. A world mid-campaign must not lose its ruleset without the GM being told. Added during red-team |
| A fact needed by a ruleset is marked `not found` in the vault | **Escalate. Do not invent.** An invented rule is indistinguishable from a real one in the code and silently corrupts the game |

## Out of Scope

**Design phases deferred (backlogged):**

- **Phase 4** — `battleframe-opr` + import. **Gated on ASM-2**: nobody has confirmed Army
  Forge has a user-facing JSON export. Verify before building anything OPR-specific.
- **Phase 4.5** — `battleframe-alphastrike`. The real neutrality proof (phase-based, no
  per-unit activation). Deferred, not dropped.
- **Phase 5** — toolkit extraction. **Do not do this early.** Extraction from too few
  examples is worse than no toolkit, and extracting from GREATHELM alone would produce a
  dice-pool-shaped toolkit.

**Cut from MVP on evidence:**

- **Area Service / Regions.** GREATHELM's QSR has Bash/Light/Heavy melee and no blast
  templates — the MVP needs no AoE. Build it when a ruleset needs it.
- **Migration runner.** No data exists to migrate. Flag plumbing only (SS-08).
- **Import/export.** BYO-data has no consumer until Phase 4.

**Never in scope:**

- Any commercial rules text, stat block, unit datum, or artwork — in any package.
- **Public distribution of `battleframe-greathelm`.** The module name uses a trademarked
  game title; nominative fair use is likely but fact-specific, and no lawyer has looked.
  Personal use is a different risk posture. **Naming and publishing are human-only decisions**
  — see the design's Open Question 7. Added during red-team.
- Bundled compendium content for any researched game. Four of four are free-to-read, not
  free-to-ship.
- Activation, objective, condition, or campaign models **in core**. Ever.
- Public API stability guarantees. Pre-1.0 churn is accepted.
- GREATHELM Scenes, campaigns, warband construction, objectives — "not found" in the QSR,
  and not invented.

## Constraints

### Musts

- Target Foundry **v14**, ApplicationV2 only, no `template.json`, no `maximum` in
  `compatibility`.
- All distance is **base-to-base**.
- Data models extend `foundry.abstract.TypeDataModel`, never bare `DataModel`.
- Subtype **names** in the manifest; the **class** at `init`. Both are required.
- Migration version in **per-document flags**, not a world setting.
- Fail loudly on unknown schemas.

### Must-Nots

- **Must not** ship commercial rules text, stat blocks, unit data, or artwork.
- **Must not** put a turn model, activation concept, objective model, or campaign model in
  core.
- **Must not** call upward — core never imports a ruleset.
- **Must not** write a numeric `initiative` to any Combatant.
- **Must not** use `Math.random()` — it defeats Dice So Nice.
- **Must not** write type-name collision detection. Foundry namespaces subtypes already.
- **Must not** invent a rule that the QSR does not state. Mark inventions as inventions.
- **Must not** enable `--passWithNoTests` in `vitest.config.ts`. Every filtered check in this
  spec (`npm test -- base-model`, `-- measure`, `-- neutrality`, …) would pass **vacuously**
  when the test file is missing or misnamed — turning the entire verification layer into
  theatre. Surfaced during prep. A missing test must fail.

### Preferences

- Prefer **confirmed vault research** over recollection. Foundry's API changed heavily
  v10→v14; remembered idioms are usually stale. Notes carry `confidence:` — respect it.
- Prefer **a ruleset writing more code** over core learning anything game-specific.
- Prefer **loud failure** over plausible output.
- Prefer **concrete constants in one place**, externalised — the QSR is v0.4 and every
  number is provisional.
- Prefer **copying Lancer's proven combat pattern** over inventing one — **with one
  deliberate divergence.** Lancer does `initiative ??= 0`; this project's Must-Not makes a
  numeric `initiative` illegal. Where they conflict, **the Must-Not wins**: Battleframe keeps
  `initiative` null. Surfaced during prep — do not "follow Lancer exactly" into a violation.
  If Foundry's schema rejects `null` at runtime, **escalate**; do not quietly fall back to
  `0`.

### Escalation triggers

- The SS-01 measurement gate fails → **stop and re-scope with a human.**
- Core needs game-specific knowledge to make GREATHELM work → **stop.** The design is
  breaking.
- A ruleset requires a core change → **stop and record it.** The neutrality claim is failing.
- Real Foundry contradicts a vault note → **stop, correct the note, continue.**
- Anything touching publishing, distribution, licensing, or trademark → **human only.**

## Verification

**End-to-end, in order:**

1. `npm install && npm run build && npm test` — all exit 0.
2. `node scripts/deploy-local.mjs --dest <foundry-data-dir>` — exits 0.
3. Create a Foundry v14 world on **Battleframe**. The setup wizard opens for the GM.
4. Enable `battleframe-greathelm`. It appears in the wizard with title, version, and
   compatibility. Select it as primary.
5. Create two forces of six knights. Deploy them on a gridless paper-sized scene.
6. Roll the dice pool. Confirm: size is models + 1; most 6s takes initiative; actions resolve
   **6→1**.
7. Sprint a knight. Confirm it moves up to **5"**, and that the ruler agrees with the rules
   engine.
8. **Physically verify one measurement against a fixture.** Measurement has no natural
   oracle — this step is not optional.
9. Run a clash test. Confirm it posts to chat and that a wound persists across reload.
9b. **Play the courage phase.** Confirm a damaged knight in base contact tests; a damaged
    knight alone does not; an undamaged knight in contact does not. Confirm the
    most-damage-first order. This is the third phase of the round — a round that stops after
    the battle phase is not a full round.
10. **Disable the GREATHELM module.** Confirm the world still loads and the orphan warning
    fires naming the module — no crash, no silent data loss.
11. `npm test -- neutrality` — proves core imports no ruleset.
12. **Answer honestly: did core need any change to host GREATHELM?** If yes, the design has
    failed and that belongs in `docs/plans/`, not in a quiet commit.

## Phase Specs

Refined by `/forge-prep` on 2026-07-16.

| Sub-Spec | Phase Spec |
|---|---|
| SS-01. Run the measurement spike **(manual gate)** | `docs/specs/battleframe-core-mvp/sub-spec-1-run-the-measurement-spike.md` |
| SS-02. Monorepo scaffold and system manifest | `docs/specs/battleframe-core-mvp/sub-spec-2-monorepo-scaffold-and-system-manifest.md` |
| SS-03. Base model | `docs/specs/battleframe-core-mvp/sub-spec-3-base-model.md` |
| SS-04. Measurement service | `docs/specs/battleframe-core-mvp/sub-spec-4-measurement-service.md` |
| SS-05. Ruleset registry and public API | `docs/specs/battleframe-core-mvp/sub-spec-5-ruleset-registry-and-public-api.md` |
| SS-06. Combat shell | `docs/specs/battleframe-core-mvp/sub-spec-6-combat-shell.md` |
| SS-07. Dice service | `docs/specs/battleframe-core-mvp/sub-spec-7-dice-service.md` |
| SS-08. Generic Actor type and fallback conversion | `docs/specs/battleframe-core-mvp/sub-spec-8-generic-actor-type-and-fallback-conversion.md` |
| SS-09. Setup wizard | `docs/specs/battleframe-core-mvp/sub-spec-9-setup-wizard.md` |
| SS-10. GREATHELM module foundation | `docs/specs/battleframe-core-mvp/sub-spec-10-greathelm-module-foundation.md` |
| SS-11. GREATHELM round loop, clash, sheet | `docs/specs/battleframe-core-mvp/sub-spec-11-greathelm-round-loop-clash-and-sheet.md` |
| SS-12. Integration | `docs/specs/battleframe-core-mvp/sub-spec-12-integration.md` |

Index: `docs/specs/battleframe-core-mvp/index.md`
Red team: `docs/specs/battleframe-core-mvp/redteam-report.md`

**Do not run the factory yet.** SS-01 is `dispatch: manual` and gates everything — it needs
a human with a licensed Foundry v14 instance. See the index for why.
