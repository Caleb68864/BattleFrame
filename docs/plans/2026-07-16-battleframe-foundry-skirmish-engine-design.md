---
date: 2026-07-16
topic: "Battleframe — a ruleset-neutral Foundry VTT game system for miniature skirmish games"
author: Caleb Bennett
status: evaluated
evaluated_date: 2026-07-16
tags:
  - design
  - battleframe
  - foundry-vtt
---

# Battleframe — Design

## Summary

Battleframe is a Foundry VTT **game system** that provides the reusable digital table for
miniature skirmish wargames, while individual games ship as separately-installed **ruleset
modules** that register with it.

The central finding of the research phase is that **Battleframe is not a rules engine — it
is a miniatures-wargame canvas layer and ruleset host.** Eight parallel research tracks
(~260 atomized notes in `vault/`) examined five real games and Foundry's own system API.
No two games shared an activation model, an objective model, or a campaign model. But every
single one needs base-to-base measurement, miniature bases modelled as circles, and
post-v14 Region-based areas — and **none of those exist in Foundry or in any precedent
system.**

So the engine owns the *table*, not the *rules*.

## Approach Selected

**Approach C — Thin core + opt-in toolkit.**

Core owns documents, sheets, dice, measurement, and the ruleset registry. A separate,
**deletable** toolkit offers turn-order schedulers, a resolution stack, and objective and
campaign helpers. Rulesets use the toolkit or ignore it.

Rationale: the research demonstrated we **do not yet know** the right turn-order
abstraction. Approach B (engine owns the round loop, rulesets supply a turn-order provider)
requires betting on an interface today, and the evidence says that bet loses — see
[Why not Approach B](#why-not-approach-b). Approach C lets the abstractions be *discovered*
from two or three shipped rulesets instead of guessed from one brain dump. If the toolkit
turns out wrong, it gets deleted and the system survives. Under B, the same mistake **is**
the system.

This also matches the stated constraint: *build for myself now, open it up later, design the
seams so that isn't a rewrite.*

---

## Architecture

### The three layers

```
┌─────────────────────────────────────────────────────────────┐
│  RULESET MODULES          battleframe-opr, -greathelm, ...  │
│  Own: subtypes · schemas · sheets · turn loop · combat math │
│  Declare documentTypes in module.json; register at init      │
└───────────────────────────┬─────────────────────────────────┘
                            │  calls (never called back)
┌───────────────────────────▼─────────────────────────────────┐
│  TOOLKIT  (opt-in library — shipped, never required)        │
│  Schedulers · Resolution stack · Objective & campaign helpers│
│  DELETABLE. If an abstraction is wrong, it dies alone.      │
└───────────────────────────┬─────────────────────────────────┘
                            │  built on
┌───────────────────────────▼─────────────────────────────────┐
│  CORE SYSTEM  (battleframe)                                 │
│  ① Measurement — base-to-base, gridless-first  ★ the value  │
│  ② Base model — circles, not rectangles        ★ the value  │
│  ③ Regions/AoE — post-MeasuredTemplate                      │
│  ④ Ruleset registry + lifecycle                             │
│  ⑤ Combat shell — persistence + tracker, NO turn model      │
│  ⑥ Dice (thin passthrough → DsN free)                       │
│  ⑦ Import plumbing (BYO-data)                               │
│  ⑧ Generic fallback type · settings · migrations · i18n     │
└─────────────────────────────────────────────────────────────┘
```

### The load-bearing rule

**Calls only go downward.** Rulesets call the toolkit; the toolkit calls core. Core never
calls up into a ruleset. The toolkit never calls a ruleset back.

This inversion is the entire difference between Approach B and C.

### Why not Approach B

Under B, core owns the round loop and calls the ruleset asking *"who acts next?"* Each
researched game breaks that callback in a **different direction**:

| Game | What breaks the callback |
|---|---|
| Song of Blades / Rampant / TNT | **"Greed ends your turn"** — turn length is discovered *mid-turn* by a die roll. There is no list of activations to walk. |
| Battlefront Valkyrie | **Two different orderings in one round** — movement uses half/all/half, combat uses 1:1 alternation. One round, two algorithms. |
| INX | **Reactions interrupt** the active unit. Breaks one-actor-at-a-time. |
| GREATHELM | Initiative, action economy, action selection and sequencing are **one object** (the dice pool). Nothing to decompose. |
| Classic BattleTech | **Phase-structured, not unit-activated.** All units move before any unit shoots. |

Under C, each of these is just code the ruleset writes. Nothing to fight.

### Confirmed Foundry precedent

- **Modules can contribute Actor/Item subtypes to a system.** Official since v11:
  *"As of version 11, modules can extend document sub-types similarly to how systems do."*
  Type *names* are declared statically in `module.json`; the **DataModel class** is
  registered at `init` via `CONFIG.Actor.dataModels` — a plain mutable object a module
  writes into without the system's cooperation. (`vault/foundry-systems/`)
- **Subtypes are namespaced by package id** — `opr.squad` and `greathelm.warband` cannot
  collide. The registry polices *ruleset IDs*, not type names.
- **Lancer already solved the tracker problem** — ignore `initiative`, sort on ruleset data,
  `turn: null`, own the tracker via `CONFIG.ui.combat`. Battleframe copies this.
- **Target v14** (stable since April 2026; confirmed 14.363 running on the target server).
  ApplicationV2 only. No `template.json`. No `maximum` in `compatibility`.

---

## Components

Each component below is likely its own spec. What matters here is the **boundary** —
especially what each one refuses to own.

### Core

| # | Component | Owns | Does NOT own |
|---|---|---|---|
| ① | **Measurement** | Base-to-base distance, range checks, movement paths, gridless-first w/ hex+square, diagonal rules | What a distance *means* (GREATHELM's 5" Sprint is ruleset data) |
| ② | **Base Model** | Miniature base as a **circle/oval** with real-world size (25mm, 32mm, 120×92mm), mapped onto Foundry's rectangular token footprint; optional facing | What facing *does* (BattleTech's hexside→hit-table is ruleset logic) |
| ③ | **Area Service** | Circles/cones/lines as **Scene Regions**; containment queries; ephemeral previews over persisted Documents | Blast rules, AoE damage |
| ④ | **Ruleset Registry** | Registration, validation, version compat, exactly one active primary, extension association, lifecycle order, actionable developer errors | Anything a ruleset does |
| ⑤ | **Combat Shell** | Combat/Combatant documents, persistence, multiplayer sync, tracker UI *shell*, history/undo | **Turn order. What a round is. Whose turn it is.** `initiative` stays null. |
| ⑥ | **Dice Service** | Thin passthrough to Foundry `Roll`; chat cards | Any dice mechanic. Thin *because* thin = Dice So Nice works free. |
| ⑦ | **Import/Export** | File drop plumbing, schema validation framework, provenance tracking | Ruleset-specific parsers |
| ⑧ | **Foundation** | Settings, per-document migration flags, i18n, `game.battleframe.api`, hooks, generic fallback Actor type | — |

**⑤ is the component most likely to be argued about, because it looks like it should own
more. It must not.** That is the thesis of this design.

### Toolkit — opt-in, deletable

- **Schedulers** — alternating · phase-IGOUGO · dice-pool · per-round-initiative
- **Resolution Stack** — interrupts, "target chooses" prompts, reaction windows
- **Objectives** · **Campaign** · **Conditions**

The **Resolution Stack** is the most valuable and most speculative piece. Two unrelated
games independently demand it:

- **INX** — reaction tokens let a non-active unit act during another's activation.
- **Classic BattleTech** — *"the target chooses"* resolves geometric ties **before the
  attacker rolls**.

Both mean **attack resolution cannot be a pure function** — it must suspend and prompt
another player. Genuinely hard, genuinely shared, and exactly the kind of thing that should
prove itself in the toolkit before anyone promotes it to core.

---

## Data Flow

### Registration (cold start)

```
1. INSTALL      battleframe (system) + battleframe-greathelm (module)
                module.json declares documentTypes + relationships.systems → battleframe

2. init         SYSTEM: registers core services, generic Actor type, game.battleframe.api
                MODULE: CONFIG.Actor.dataModels["greathelm.knight"] = KnightData
                        DocumentSheetConfig.registerSheet(...)
                ⚠ init order system-before-module is UNVERIFIED — see Open Questions

3. setup/ready  MODULE: game.battleframe.api.registerRuleset({ id, version, compat, ... })
                REGISTRY: validate → check compat → store (does NOT activate)

4. WIZARD       User selects exactly one primary ruleset
                World setting: activeRulesetId = "greathelm"

5. ACTIVATE     Registry marks primary → fires battleframe.rulesetActivated
```

### Content in — BYO-data

```
Army Forge  ──user exports──▶  .json file  ──drag-drop──▶  Foundry canvas
                                                                  │
                                        core: file plumbing + provenance
                                                                  │
                                        ruleset: parse + validate ▼
                                                          Actor (opr.squad)
                                                          system.quality = 4
                                                          system.bases.round = "120x92"
```

**No network. No CORS. No proxy. No ToS ambiguity. Nothing is distributed.**

This is the settled shape of the whole content strategy: **the engine ships empty and the
user brings their own data.** Two unrelated research tracks converged on it independently
(OPR acquisition; BattleTech licensing), and in both cases it was also the *easier* build.

### Play

```
RULESET owns the loop  ──calls──▶  core.measurement.distance(a, b)   → base-to-base inches
                       ──calls──▶  core.areas.preview(circle, 3")     → Region
                       ──calls──▶  core.dice.roll("2d6")              → Foundry Roll (DsN free)
                       ──writes──▶ core.combat  (persistence + sync only)

CORE never calls back up.
```

### Key transformation points

| Transformation | Owner | Risk |
|---|---|---|
| Army Forge JSON → Actor | Ruleset | **Silent schema drift** — wrong points costs |
| base size (mm) → token footprint | Core | Wrong base = every range wrong |
| pixels → base-to-base inches | Core | **The critical unknown** |

---

## Error Handling

### The theme: every dangerous failure here is SILENT

A crash is fine — you see it and fix it. The failures that matter in this design all produce
plausible, wrong answers.

| Failure | Behaviour | Surfacing |
|---|---|---|
| **Ruleset module disabled** | Subtypes vanish; existing Actors become unusable and *look like data loss* | Detect at ready; warn loudly; offer conversion to the generic type. **Never silently drop data.** |
| **Two primary rulesets enabled** | Ambiguous world | Wizard warns; offers to disable the conflicting module. Refuse to activate either until resolved. |
| **Incompatible ruleset version** | — | Reject at registration with an actionable developer error. Never partially activate. |
| **Import schema drift** | OPR's API is undocumented and unversioned; a field rename yields **silently wrong stats** | Validate against an expected schema; **fail loudly on unknown shape**. Never import a partially-understood list. |
| **Measurement mismatch** | Every range check silently wrong | Visible ruler; show the computed value; make base-to-base *inspectable*, not implicit. |
| **Ruleset throws in its own turn loop** | Core cannot recover — it doesn't own the loop | Contain, surface the ruleset id, keep the world usable. Accept that core cannot fix it. |

### The three most likely failure modes

1. **Import schema drift** — because OPR's API is undocumented, unversioned, and
   unannounced. Correctness here is binary: a wrong points cost is not a degraded
   experience, it's a wrong game.
2. **Measurement wrong** — because there's no precedent and no test oracle other than
   physically measuring.
3. **Module-disabled data panic** — because it *looks* like data loss and users will react
   accordingly.

All three are silent. **The design principle that follows: prefer loud failure over
plausible output.**

---

## Verification Strategy

> Added by evaluation. The Error Handling section above identifies three failure modes and
> states that **all three are silent** — then the original design contained no test plan at
> all. Silent wrongness is exactly the failure class testing exists to catch, and a
> plausible-but-wrong answer is worse here than a crash.

### Measurement has no natural oracle — build one

You cannot eyeball whether 5" is 5". Nothing in Foundry will tell you it's wrong.

- **Known-distance fixtures.** A test scene with tokens at surveyed positions and known
  base sizes; assert base-to-base distances to a stated tolerance. Cover: gridless, square,
  hex; equal and unequal base sizes; touching bases (distance 0); overlapping bases
  (must not go negative).
- **Property test:** `distance(a,b) === distance(b,a)`, and distance decreases by exactly
  the sum of base radii versus center-to-center.
- **The ruler must agree with the rules.** If the on-screen ruler and the rules engine
  disagree, players trust the ruler and the game is silently wrong. Assert they match.

### Import parsing — golden files and a drift canary

- **Golden files.** Commit real exported army JSON as fixtures; assert parsed Actors
  field-by-field. Points costs and Quality/Defense are **binary correctness** — a wrong
  value is a wrong game, not a degraded one.
- **Schema-drift canary.** OPR's API is undocumented, unversioned, and unannounced. A
  scheduled check that fetches a known list and diffs its shape against the expected schema
  turns a silent corruption into a loud alert. **This is the highest-value test in the
  project** relative to its cost.
- **Unknown-field policy:** fail loudly. Never import a partially-understood list.

### Ruleset isolation — the neutrality claim, made testable

- The core test suite **must not import any ruleset package.** If it does, the layering has
  already leaked.
- **Contract tests** each ruleset runs against core, proving core made no assumption about
  its turn model.
- **The real proof:** Alpha Strike (phase-based) must pass with **zero core changes**. Any
  core change required to host it is a design failure and must be recorded as one.

### What is NOT worth testing

Foundry itself. Do not test that `CONFIG.Actor.dataModels` works — that's confirmed and
it's their code. Test **our** arithmetic and **our** parsing.

---

## Success Criteria

Revised from the brain dump against the research. Struck items are recorded under
[Exclusions](#exclusions).

- [ ] Battleframe installs as a Foundry **game system** (v14).
- [ ] A user can create a world using Battleframe.
- [ ] Battleframe displays its first-launch setup wizard.
- [ ] A separate ruleset module declares Battleframe compatibility via
      `relationships.systems`.
- [ ] The ruleset module registers through `game.battleframe.api`.
- [ ] The user selects a primary ruleset through Battleframe Setup.
- [ ] Battleframe warns about incompatible or conflicting rulesets.
- [ ] Battleframe works with **no** optional third-party modules installed.
- [ ] Dice So Nice animates Battleframe rolls when installed.
- [ ] Sequencer and animation modules remain optional.
- [ ] Battleframe APIs and hooks are documented.
- [ ] **No commercial game rules or game data are included in Battleframe or any ruleset
      module.** (Upgraded from principle to hard requirement — see Exclusions.)
- [ ] **Base-to-base measurement is correct and inspectable.** (New — the engine's reason
      to exist.)
- [ ] **Two rulesets whose turn order comes from different sources both work without core
      changes.** GREATHELM re-rolls order from a dice pool; OPR inherits it from last round's
      completion order. <!-- Assumption: ASM-3 — CONTRADICTED. Both are alternating
      activation. The OPR research states they "differ in exactly one function." This is a
      weaker claim than "genuinely different turn models" and is stated weakly on purpose. -->
- [ ] **A third ruleset with a structurally different turn model works without core
      changes.** Alpha Strike is the cheap candidate: phase-based (all units move before any
      unit shoots), inches-based, already researched. **This — not the OPR/GREATHELM pair —
      is the actual proof of neutrality**, because a phase-structured game has no per-unit
      activation at all.
- [ ] **Measurement is verified against known-distance fixtures**, not by inspection.

## Exclusions

**Cut from the brain dump by research:**

- **Activation engine as a core responsibility.** Five games, five turn models, zero shared
  primitive. → toolkit.
- **`advanceActivation(request)`** in the public API — presupposes an activation model core
  will not have.
- **Round/phase engine as core** — BattleTech is phase-based; GREATHELM is not. → toolkit.
- **Objective framework, campaign infrastructure, condition framework as core** — Battlefront
  Valkyrie has *no* objectives, *no* scoring and *no* campaign. → toolkit.
- **"Battleframe world schema version" as a world setting** → per-document flags. Documents
  arrive from ruleset compendia at arbitrary versions.
- **Bundled rules content of any kind.** Four of four "free" games (OPR, INX, Valkyrie,
  BattleTech) are **free-to-read, not free-to-ship**. The compendium-pack strategy in the
  brain dump describes a nearly empty set.
- **A demo ruleset as the proof of the architecture.** A demo designed alongside the engine
  fits the engine by construction — it proves loading works, not that the abstractions are
  right. Replaced by two *real* rulesets with different turn models.

**Out of scope for MVP:**

- Great Helm's Scene/campaign/warband layers — undocumented in the free QSR; **not found,
  not invented.**
- Classic BattleTech — the hex/facing/heat stress test. Late, deliberately.
- Battlefront Valkyrie, INX — survey targets, not build targets.
- OPR Regiments (facing/formations) and Warfleets (no Quality/Defense/AP).
- Any network fetch of ruleset data.
- Public API stability guarantees — pre-1.0 churn is accepted and expected.

---

## Build Sequence

| Phase | Deliverable | Why here |
|---|---|---|
| ~~**0**~~ | ~~Spike — go/no-go gate~~ **DISSOLVED** | Code still at `spike/`, now **verification, not a gate**. It answers whether the *ruler* can show base-to-base and what units a gridless scene reports — useful, non-blocking. Measurement needed no gate: gridless base-to-base is arithmetic. |
| **1** | Core canvas — measurement, base model, areas | The engine's actual value. Everything else is scaffolding around it. |
| **2** | Registry + combat shell + generic type + setup wizard | Makes it a system. |
| **3** | `battleframe-greathelm` | **MVP.** Small (5-page QSR), self-contained, needs no import, and its dice-pool-as-action model is the hardest possible first test. |
| **4** | `battleframe-opr` + drag-drop import | Second turn-order *source* (inherited order). Brings the import story and structured data. **Gated on ASM-2** — see below. |
| **4.5** | `battleframe-alphastrike` | **Promoted into the plan by evaluation.** The first *structurally* different turn model: phase-based, no per-unit activation. Without this, "ruleset-neutral" is unproven — see Gap 2 / ASM-3. |
| **5** | Toolkit extraction | **Last, on purpose.** Extract from *three* real rulesets — two alternating, one phase-based. Extracting from the alternating pair alone would produce an alternating-shaped toolkit: the exact trap this design exists to avoid, merely deferred. |

### Phase gates

| Gate | Question | If it fails |
|---|---|---|
| ~~**Phase 0 → 1**~~ | ~~Is base-to-base reachable via `measurePath`'s `cost` callback?~~ | **REMOVED — the question was malformed.** See Open Question 1. Core measures directly on `canvas.dimensions` + the base model; `measurePath` is not used, and gridless needs no diagonal rule. SS-04 shipped without this gate. |
| **Phase 4 entry** | **Does Army Forge have a user-facing JSON export?** | The drag-drop mechanism does not exist. Fall back to share-link + companion proxy, or ask OPR for a CORS header. **Verify this before building anything OPR-specific.** This is now the project's only real unanswered gate. |
| **Phase 5 entry** | Have three rulesets with different turn structures shipped? | Do not extract the toolkit. Extraction from too few examples is worse than no toolkit. |

### Measurement — what was actually true

Core implements measurement directly on `canvas.dimensions` + the base model, **gridless
only**. That is `max(0, hypot(dx,dy)/pxPerUnit - rA - rB)` — a few lines, no Foundry API, no
seam. Shipped in SS-04 with known-distance fixtures.

**This was written up as "the single largest scope risk in the design" and it was not a risk
at all.** The error: a research note said the override seam is *thin*, which means *do the
maths yourself*; that got inflated into *measurement may be unreachable*, and the supporting
citation (#11428) turned out to be about **square-grid diagonal rules** — irrelevant to a
gridless paper game. The whole build queued behind a human-only spike for hours on the
strength of it. Recorded here rather than quietly deleted, because the failure mode —
inflating a headline into a blocker without re-reading the source — is more reusable than
the fact.

Square and hex measurement **are** genuinely deferred (BattleTech's problem, a late stress
test). Replacing the **ruler** so it displays base-to-base is a real follow-up, but cosmetic:
movement is a rigid translation, so only *contact* and *range* differ, and players don't
drag-measure those.

**MVP = Phases 1–3** (Phase 0 dissolved). GREATHELM playable on a verified table.

**"Playable" means, concretely:** two forces of six knights on a gridless paper-sized scene;
a full round resolves via the dice pool (6→1) with actions hard-selected by die face;
Sprint = 5" measured **base-to-base** and verified against a known-distance fixture; clash
tests roll through core dice and render to chat; wounds persist on the Actor. It does **not**
mean Scenes, campaigns, warband construction, or objectives — all of which are
[Open Question 8](#open-questions) and are "not found," not designed.

---

## Open Questions

| # | Question | What the answer changes |
|---|---|---|
| 0 | **Does Army Forge have a user-facing JSON export?** <!-- Assumption: ASM-2 — UNSUPPORTED. The research confirmed an API; it never confirmed an export button. Drag-drop was chosen specifically to avoid the API. --> The research confirmed a fetchable **API**; it did **not** confirm an export-to-file. Drag-drop was selected precisely to avoid the API — so this assumption is load-bearing and unverified. | **The flagship feature's delivery mechanism.** If no export exists, drag-drop is impossible and the choice must be re-made (share-link + proxy, or ask OPR for CORS). Phase 4 gate. Verify **before** building anything OPR-specific. |
| 1 | ~~**Can base-to-base be reached via `measurePath`'s `cost` callback?**~~ **RESOLVED 2026-07-16 — the question was malformed.** #11428 is about overriding the **diagonal rule**, and diagonal rules only exist on **square grids**. The MVP is **gridless**. For a gridless scene base-to-base is `max(0, hypot(dx,dy)/pxPerUnit - rA - rB)` — arithmetic on the base model, needing no Foundry API and no seam. `measurePath` is not used. | **Nothing. This was never the risk.** It was inflated from a research note's headline ("no clean override seam" = *do the maths yourself*, not *it cannot be done*) and it blocked the build for hours. SS-04 shipped without it; 119 tests pass. The residual question — can the **ruler** display base-to-base so player and engine agree — is cosmetic: **movement is a rigid translation**, so 5" is 5" either way; only *contact* and *range* differ, and players don't drag-measure those. |
| 2 | Can Scene Regions replace MeasuredTemplate (deleted in v14) for previews? Regions are *persisted Documents*; templates were ephemeral. | Whether AoE is cheap or a subsystem. |
| 3 | Are module-supplied subtypes ergonomic when *every* unit is module-provided? Does a subtype Actor **survive a world reload**? | Expected to pass. If not, fall back to a generic type + ruleset blob (the Custom System Builder path) and lose schema validation. |
| 4 | Does system `init` run before module `init`? | Whether rulesets can call `game.battleframe.api` at `init` or must wait for `setup`. |
| 5 | **OPR: what happens with uneven unit counts?** Unspecified across four official documents including Tournament Guidelines. Lists are equal *points*, not units — so this is the **normal case**. | Sits on the turn engine's critical path. You must rule on it. |
| 6 | **Legal review.** Are stat blocks uncopyrightable facts or copyrightable compilation? Is MegaMek/Flechs' survival a right or mere **tolerance**? | Not answerable by an agent. Needs a lawyer **before anything ships**. Does not block personal use. |
| 7 | **Trademark:** can a module be named "Battleframe: Great Helm"? Nominative fair use is likely but fact-specific. | Naming, not architecture. Low risk while personal-use-only. |
| 8 | GREATHELM: what carries between **Scenes**? Warband construction? Campaign persistence? | **Not found** in the free v0.4 QSR — not invented. The ~$25 full rulebook likely closes this. Round loop is fully sourced and safe to build; everything *above* it is not. |
| 9 | GREATHELM QSR is **v0.4, explicitly pre-1.0 and "introductory."** | Every constant is provisional. Externalise them; do not hard-code. |

---

## Approaches Considered

**Approach A — Thin core only.** Engine owns documents, sheets, dice, measurement,
registry. Rulesets own all game logic including their turn loop.
*Rejected:* can't be wrong, but offers so little that every ruleset reimplements everything
and the second gains nothing from the first. Hard to answer "what is the engine for?"

**Approach B — Scheduler engine.** Engine owns the round loop, Combat document, tracker and
a resolution stack; rulesets supply a turn-order provider.
*Rejected:* requires betting on an interface today. The research says the bet loses — see
[Why not Approach B](#why-not-approach-b). Five games break the callback in five different
directions. If the bet is wrong, the mistake *is* the system.

**Approach C — Thin core + opt-in toolkit.** ✅ **Selected.**
Abstractions get discovered from real rulesets rather than guessed. Wrong toolkit is
deletable; wrong core is not. Matches the "me now, public later" constraint.
*Accepted costs:* early duplication (OPR and Alpha Strike will both write alternating
activation before the toolkit earns it); a core that looks thin as a standalone product; and
the discipline to leave things in the toolkit that you'd rather promote.

---

## Research Provenance

~260 atomized notes across eight parallel tracks in `vault/` (gitignored):

| Folder | Notes | Decisive finding |
|---|---|---|
| `greathelm/` | 36 + QSR PDF | Dice **face value IS the action**; initiative/action/sequence are one object |
| `one-page-rules/` | 43 | **`All Rights Reserved`** — not open. Foundry's `initiative: number` fights OPR at every step |
| `opr-acquisition/` | 22 | Live JSON API; **no LLM needed**; **no Foundry OPR module exists** |
| `incountry/` | 23 | Lean breaks geometric LOS; reactions break one-actor-at-a-time |
| `battlefront-valkyrie/` | 32 | **No activation at all**; two orderings in one round |
| `battletech/` | 33 | Content unshippable (*nemo dat*); **hex/inches fault line** |
| `candidate-rulesets/` | 32 | Open licences are a **desert**; "greed ends your turn" is the load-bearing test |
| `foundry-systems/` | 38 | Module subtypes work (**confirmed**); **the canvas is the risky part, not the plugin architecture** |

**Rigor notes.** Agents twice nearly recorded the opposite of the truth and caught
themselves: a search asserted OPR was CC BY-NC-SA (it was 1d6chan's *own wiki footer*
scraped and misattributed), and archive.org's "CC BY-NC" tag on Turnip28 was applied by a
random uploader, not the rights holder. Every licence claim here rests on a fetched and
quoted licence page. Unknowns are recorded as "not found" rather than filled from genre
convention — notably GREATHELM's Scene semantics and INX's suppression/morale rules.

**This document contains no legal advice.**

---

## Commander's Intent

**Desired End State**
A Foundry v14 world running Battleframe with `battleframe-greathelm` enabled, in which two
six-knight forces play a full GREATHELM round on a gridless paper-sized scene: the dice pool
resolves 6→1 with actions hard-selected by die face, Sprint measures **5" base-to-base**
verified against a known-distance fixture, clash tests roll through core dice into chat, and
wounds persist. Core contains **zero** GREATHELM-specific code, and the core test suite
imports **no** ruleset package.

**Purpose**
To play miniature skirmish games on a table that measures correctly — and to do it once,
rather than once per game. Every ruleset needs base-to-base distance, circular bases, and
post-v14 Region areas; none of that exists in Foundry or any precedent system. That gap is
the product. The rules are not.

When a judgment call arises and this plan is silent, **prefer the choice that keeps core
ignorant of any specific game.**

**Constraints**
- **MUST NOT** ship rules text, stat blocks, unit data, or artwork from any commercial
  game — in core or any ruleset module. Four of four researched games are free-to-read and
  **not** free-to-ship. This is a legal boundary, not a style preference.
- **MUST NOT** let core contain a turn model, activation concept, objective model, or
  campaign model. If core needs to know what a round is, the design has failed.
- **MUST NOT** call upward: core never calls the toolkit; the toolkit never calls a ruleset.
- **MUST** fail loudly on unknown import schemas. Never import a partially-understood list.
- **MUST** target Foundry v14, ApplicationV2 only, no `template.json`, no `maximum` in
  `compatibility`.
- **MUST** keep the dice service a thin passthrough to Foundry `Roll` — that thinness is
  what makes Dice So Nice work for free.
- **MUST** treat every GREATHELM constant as provisional (QSR is v0.4, pre-1.0).

**Freedoms** — the agent MAY, without asking:
- Choose file/folder layout, naming, and module boundaries within a component.
- Choose the test framework and runner (none exists yet — greenfield).
- Choose the build tooling (Vite is suggested in the brain dump, not required).
- Choose internal data structures, caching, and algorithms inside core services.
- Choose sheet markup, styling, and UX within a ruleset.
- Choose how to represent bases internally, provided the public shape below holds.

### Committed interface/contract defaults

Unresolved contracts become vague acceptance criteria downstream, so each is decided here.
**Override any of these if the spike contradicts it** — they are defaults, not laws.

- **Ruleset registration** → **Default:**
  `game.battleframe.api.registerRuleset(def) → {ok: true} | {ok: false, errors: string[]}`
  where `def = {id, title, version, battleframeCompatibility: {minimum, verified}, primary: boolean}`.
  Returns a result object; does **not** throw. Rejects duplicate `id`. Registration never
  activates. _(Override if the spike shows module `init` precedes system `init`, in which
  case registration moves to `setup`.)_

- **Measurement** → **Default:**
  `game.battleframe.measure.between(tokenA, tokenB) → {distance: number, units: string, mode: "base-to-base"}`
  Distance is **base-to-base** and never negative; touching bases return `0`. Takes Tokens,
  not points — the base model is the whole reason this exists.
  _(Shipped as specified. The gate that once qualified this was removed — see Open Question 1.)_

- **Base model** → **Default:** `token.flags.battleframe.base = {shape: "circle"|"oval", widthMm: number, heightMm: number}`.
  Absent flag ⇒ derive a circle from the token's footprint and log once at debug.
  Millimetres because that is what miniature bases and OPR's API both use
  (`bases: {round: "120x92"}`).

- **Areas** → **Default:**
  `game.battleframe.areas.preview(shape) → {commit(): Promise<Region>, cancel(): void}`.
  Explicit commit/cancel because Regions are **persisted Documents** and templates were
  ephemeral — the caller must decide.

- **Combat shell** → **Default:** Combatants carry `initiative: null` permanently. Ordering
  lives in `combat.flags.battleframe.order: string[]` (Combatant ids), authored solely by
  the ruleset. Core reads it to render; core never writes it. This is the Lancer pattern.

- **Import** → **Agent-free:** the parser's internal shape is the ruleset's business. Any
  consistent design is fine, provided unknown fields fail loudly.

---

## Execution Guidance

> **Note:** these shortcuts are normally derived from scanning the existing codebase.
> **There is no codebase** — BattleFrame is greenfield. They are derived instead from the
> ~260 research notes in `vault/` and from confirmed Foundry precedent. Trust them at the
> confidence level marked in the source notes, not more.

**Observe** — signals to watch during implementation:
- Foundry's browser console on world load — a broken manifest fails **silently** in the UI
  and loudly in the console.
- Whether a subtype Actor **survives a world reload** (server-side manifest validation).
- Known-distance fixture results after any measurement change.
- Whether the on-screen ruler and the rules engine agree. If they diverge, stop.
- Golden-file diffs after any import parser change.

**Orient** — context to hold:
- `vault/foundry-systems/` is the API reference. Prefer it over training recall: Foundry's
  API changed substantially v10→v14 and remembered idioms are usually stale.
- v13/v14 namespaces moved: `foundry.documents.collections.Actors`,
  `foundry.applications.apps.DocumentSheetConfig`, `foundry.appv1.sheets.*`.
- The Lancer system is the precedent for activation-based combat. Read it before writing
  the tracker.
- `vault/greathelm/GREATHELM-QSR.pdf` is the authority for GREATHELM. The web is wrong
  about it — Goonhammer says Run = 6"; the rulebook says Sprint = **5"**.
- Notes carry `confidence: confirmed | partial | unverified`. **Respect it.** `unverified`
  means someone inferred it.

**Escalate when:**
- Army Forge has no JSON export → **stop**. The import approach must be re-decided.
- Core needs to know anything game-specific to make a ruleset work → **stop**. That is the
  design failing, not a detail.
- Anything touches shipping, distribution, or publishing rules content → **human only**.
- A ruleset needs a core change to function → **stop and record it**. That is the
  neutrality claim breaking.
- Real Foundry contradicts a vault note → **stop, correct the note, then continue.** The
  note is wrong; Foundry is right.

**Shortcuts — apply without deliberation:**
- Combat: `initiative: null`, `turn: null`, ruleset-authored order, own the tracker via
  `CONFIG.ui.combat`. **Do not reinvent this — Lancer already proved it.**
- Register data models at `init` via `CONFIG.Actor.dataModels["<pkg>.<type>"]`. Extend
  `foundry.abstract.TypeDataModel`, never bare `DataModel`.
- Declare subtype **names** statically in the manifest; register the **class** at runtime.
  Both are required; neither alone works.
- Do not write collision detection for type names — Foundry namespaces subtypes by package
  id. Police ruleset **ids** instead.
- Migration version lives in **per-document flags**, not a world setting.
- Every distance is base-to-base. If you write a center-to-center distance anywhere, it is
  a bug.

---

## Decision Authority

**Agent decides autonomously:** file/folder structure · naming · test framework, runner and
organization · build tooling · internal algorithms and data structures within a component ·
sheet markup and styling · error message wording · commit granularity.

**Agent recommends, human approves:** the public `game.battleframe.api` surface · the
measurement API shape · the base model shape · any new external dependency · any change to
the core/toolkit/ruleset boundary · promoting anything from toolkit into core · deviations
from the committed defaults above.

**Human decides — no delegation:**
- **Anything legal.** Shipping content, licensing, trademark use, whether "Battleframe:
  Great Helm" is a permissible name, whether MegaMek/Flechs survive by right or tolerance.
  An agent must not form a view here. *(Legal review required before any public
  distribution; does not block personal use.)*
- Whether to publish anything publicly at all.
- Buying rulebooks (GREATHELM full rules ~$25) to close research gaps.
- Contacting OPR about licensing or CORS.
- Scope: adding or removing a ruleset from the build sequence.
- Proceeding past a failed **Phase 4** gate (Army Forge export) — the only gate still live.

---

## War-Game Results

**Most likely failure — ASM-2, not measurement.** Measurement is flagged, gated, and
everyone is watching it. The quiet killer is Army Forge having no export button: Phase 4
begins, the drag-drop mechanism turns out not to exist, and core has already been built
around a BYO-data story with no delivery path.
*Mitigation:* Phase 4 entry gate. Verify before writing any OPR code.

**Second most likely — the neutrality claim is never actually tested.** GREATHELM and OPR
are both alternating-activation; shipping both proves far less than it appears to, and a
toolkit extracted from that pair would be alternating-shaped — reintroducing the exact bias
this design exists to remove.
*Mitigation:* Phase 4.5 (Alpha Strike, phase-based) promoted into the plan, and the Phase 5
gate forbids extraction before three structurally different rulesets exist.

**Dependency disruption — OPR's undocumented API.** Unversioned, unannounced, and a field
rename silently corrupts points costs.
*Mitigation:* already strong in the design (fail loudly on unknown schema), now reinforced
with a schema-drift canary.

**Scale stress — N/A.** Scale here means ruleset count, and the registry handles it. Table
size is bounded by the genre: these are paper-sized games.

**6-month maintenance — strong.** The Research Provenance section is unusually good: a
stranger can reconstruct not just *what* was decided but *why*, and which claims are
confirmed versus inferred. The `confidence` markers throughout `vault/` are the single best
maintenance asset this project has.

**Resilience gap (accepted):** no rollback or feature-flag strategy. Acceptable — this is
greenfield, pre-1.0, single-developer, with no users and no production. Revisit at 1.0.

**Operational gap (partially accepted):** no logging or diagnostics story. Mitigated where
it matters: measurement must be **inspectable** rather than implicit, because a wrong
distance is otherwise undebuggable.

---

## Evaluation Metadata

- Evaluated: 2026-07-16
- Cynefin Domain: **Complex** — plan depth matches; Approach C is a probe-sense-respond
  strategy, which is the correct response to Complex
- Assumptions audited: 14 (3 confirmed · 3 supported · 6 unsupported · **2 contradicted**)
- Critical Gaps: 3 (3 resolved)
- Important Gaps: 4 (3 resolved · 1 accepted: resilience)
- Suggestions: 2 (1 resolved · 1 accepted)
- Frameworks applied: Commander's Intent · OODA · Cynefin · MDMP War-Gaming · RAPID · HRO
- Primitives framework: **skipped** (not an agentic design)

---

## Next Steps

**Blocking gates — do these before building:**

- [ ] **Check whether Army Forge has a user-facing JSON export** (ASM-2 / Open Question 0).
      Cheapest task here, gates the flagship feature, and nobody has looked. Do it first.
- [x] ~~Run the Phase 0 spike — **go/no-go on measurement**~~ **Not a gate.** Downgraded to
      verification; SS-04 shipped gridless base-to-base without it. Run `spike/` when
      convenient to answer the *ruler* question and gridless unit reporting — neither blocks.
- [ ] Record spike results as `confirmed` notes in `vault/foundry-systems/`; correct any
      note real Foundry contradicts

**Then:**

- [ ] Turn this design into a Forge spec (`/forge docs/plans/2026-07-16-battleframe-foundry-skirmish-engine-design.md`)
- [ ] `git init` — the repo is not yet under version control
- [ ] Decide the OPR uneven-unit-count rule (Open Question 5) — it is the *normal* case, not an edge case

**Human-only, unblocked, do whenever:**

- [ ] Consider buying the GREATHELM full rulebook (~$25) to close Open Question 8 — likely
      the best value-per-dollar in the project
- [ ] Ask OPR about licensing and a CORS header — free to ask; they may well say yes
- [ ] **Legal review before any public distribution.** Personal use is a different risk
      posture and is not blocked by this.
