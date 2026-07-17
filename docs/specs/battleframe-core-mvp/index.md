---
type: phase-spec-index
master_spec: "../2026-07-16-battleframe-core-mvp.md"
date: 2026-07-16
sub_specs: 12
---

# Battleframe — Core + GREATHELM MVP — Phase Specs

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md)
(34/35, red-teamed: 4 CRITICAL + 10 ADVISORY, all resolved).

> [!warning] SS-04 is gated on SS-01, and SS-01 needs a human
> **SS-01 is `dispatch: manual`.** It requires a licensed Foundry v14 instance and a person
> looking at a browser console. It is not a formality — it decides whether base-to-base
> measurement is reachable at all, and therefore whether SS-04 is a small service or a full
> measurement layer plus a ruler replacement (roughly doubling it).
>
> **The Foundry documentation cannot answer this.** `vault/foundry-systems/` *is* the docs,
> read carefully. Core issue
> [#11428](https://github.com/foundryvtt/foundryvtt/issues/11428) is open, unmilestoned, and
> unanswered by staff. Re-reading the API will not close it.
>
> **The gate scope was narrowed after prep.** It originally sat on SS-02, blocking
> everything. It belongs on **SS-04 only** — the sole consumer of the spike results. Seven
> sub-specs need nothing from it and can build now.

## Build status

| | Sub-Specs | State |
|---|---|---|
| **Buildable now** | SS-02, SS-03, SS-05, SS-06, SS-07, SS-08, SS-09 | 7 — documented Foundry API work, no dependence on the spike |
| **Gated on SS-01** | SS-04 | The measurement question. Needs a human. |
| **Behind SS-04** | SS-10, SS-11, SS-12 | GREATHELM needs measurement; integration needs everything |

## Sub-Specs

| Sub-Spec | Title | Depends on | Phase Spec |
|---|---|---|---|
| SS-01 | Run the measurement spike and record results **(manual)** | — | [sub-spec-1-run-the-measurement-spike.md](sub-spec-1-run-the-measurement-spike.md) |
| SS-02 | Monorepo scaffold and system manifest | SS-01 | [sub-spec-2-monorepo-scaffold-and-system-manifest.md](sub-spec-2-monorepo-scaffold-and-system-manifest.md) |
| SS-03 | Base model — miniature bases as circles | SS-02 | [sub-spec-3-base-model.md](sub-spec-3-base-model.md) |
| SS-04 | Measurement service — base-to-base distance | SS-03 | [sub-spec-4-measurement-service.md](sub-spec-4-measurement-service.md) |
| SS-05 | Ruleset registry and public API | SS-02 | [sub-spec-5-ruleset-registry-and-public-api.md](sub-spec-5-ruleset-registry-and-public-api.md) |
| SS-06 | Combat shell — persistence without a turn model | SS-05 | [sub-spec-6-combat-shell.md](sub-spec-6-combat-shell.md) |
| SS-07 | Dice service — deliberately thin | SS-02 | [sub-spec-7-dice-service.md](sub-spec-7-dice-service.md) |
| SS-08 | Generic Actor type and fallback conversion | SS-05 | [sub-spec-8-generic-actor-type-and-fallback-conversion.md](sub-spec-8-generic-actor-type-and-fallback-conversion.md) |
| SS-09 | Setup wizard | SS-05 | [sub-spec-9-setup-wizard.md](sub-spec-9-setup-wizard.md) |
| SS-10 | GREATHELM module foundation | SS-04, SS-06, SS-07, SS-08 | [sub-spec-10-greathelm-module-foundation.md](sub-spec-10-greathelm-module-foundation.md) |
| SS-11 | GREATHELM round loop, clash, sheet | SS-10 | [sub-spec-11-greathelm-round-loop-clash-and-sheet.md](sub-spec-11-greathelm-round-loop-clash-and-sheet.md) |
| SS-12 | Integration — wire it up and prove neutrality | SS-09, SS-11 | [sub-spec-12-integration.md](sub-spec-12-integration.md) |

## Waves

Derived from the dependency DAG. Verified acyclic; no consumer precedes its producer.

| Wave | Sub-Specs | Note |
|---|---|---|
| 1 | SS-02 | Scaffold. Nothing parallelises before it exists. Runs immediately — no deps. |
| 2 | SS-03, SS-05, SS-07 | Parallel — three independent branches off the scaffold |
| 3 | SS-06, SS-08, SS-09 | Parallel |
| — | **SS-01** | **Manual gate**, out-of-band. Blocks only SS-04. |
| 4 | SS-04 | **Blocked until SS-01 is answered by a human** |
| 5 | SS-10 | Needs measurement + combat + dice + actor |
| 6 | SS-11 | Needs SS-10's dice pool and action mapping |
| 7 | SS-12 | Integration. Last, by definition. |

Waves 1–3 (seven sub-specs) run without the gate. SS-01 can be answered any time before
wave 4 and nothing stalls.

## Requirement Traceability Matrix

Every numbered requirement from the master spec, mapped to the sub-spec(s) whose acceptance
criteria cover it. **No orphaned requirements.**

| Requirement | Covered By |
|---|---|
| R1: Installs as a Foundry v14 system; a world can be created | SS-02 |
| R2: Ruleset module declares `relationships.systems` and registers via `game.battleframe.api` | SS-10 |
| R3: Setup wizard detects rulesets, one primary, warns on conflicts | SS-09 |
| R4: Measurement is base-to-base, verified against fixtures | **SS-04** (gated on SS-01) |
| R5: Bases modelled as circles/ovals in millimetres | SS-03 |
| R6: Combat persists; `initiative` null; order authored by ruleset | SS-06 |
| R7: Dice through Foundry `Roll`; Dice So Nice free | SS-07 |
| R8: GREATHELM plays a full round | SS-10, SS-11 *(split — SS-10 owns the pool, SS-11 owns the loop)* |
| R9: Core contains no GREATHELM code; core tests import no ruleset | **SS-12** *(the neutrality test)* |
| R10: Works with zero third-party modules | SS-12 |
| R11: No commercial rules text, stat blocks, unit data, or artwork ship | SS-02 *(mechanical: no PDF tracked)*, SS-10 *(ship no rules text)* |

## Cross-Spec Dependency Audit

**No violations.** Every producer sits in an earlier or equal wave to its consumers:

- `game.battleframe` namespace — **constructed by SS-12**, attached to by SS-04/SS-05/SS-07.
  This looks inverted but is not: those sub-specs *define* services and *export* them;
  SS-12 assembles the namespace. Their unit tests import modules directly and do not depend
  on the global. Verified against SS-12's `[INTEGRATION]` criterion.
- `measure.between` (SS-04) → consumed by SS-11 (wave 5 > 3) ✓
- `dice.roll` (SS-07) → consumed by SS-11 (wave 5 > 2) ✓
- `registerRuleset` (SS-05) → consumed by SS-10 (wave 4 > 2) ✓
- `combat.flags.battleframe.order` (SS-06 reads, SS-11 writes) → SS-11 in wave 5 > 3 ✓
- Base model (SS-03) → consumed by SS-04 (wave 3 > 2) ✓

## Decomposition Balance Check

**Passed.** No sub-spec touches 4+ cross-cutting concerns. SS-06 touches two (persistence,
state management). SS-08 touches two (persistence, migration). Both below threshold.

SS-10 was **split during red-team** (13 files → SS-10 at 9 + SS-11 at 5) after matching the
historical high-defer pattern.

## Construction-Site Check

**No findings.** SS-12 matches the `wire`/`integrate` trigger but names a concrete call site
— `packages/battleframe/src/battleframe.ts` at the `init` hook — plus the full service list.
SS-10's registration names both symbol (`registerRuleset`) and API surface. No vague seams.

## Execution

```
/forge-run docs/specs/2026-07-16-battleframe-core-mvp.md
```

Point at the **master spec file**, not this directory — forge-run auto-detects linked phase
specs. `--sub N` runs a single sub-spec.

**But do not run it yet.** SS-01 must be answered by a human first. See the warning at the
top of this file.
