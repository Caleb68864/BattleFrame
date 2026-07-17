---
type: redteam-report
generated: 2026-07-16
target: 2026-07-16-battleframe-core-mvp.md
findings_count: 14
critical: 4
advisory: 10
patched: 14
---

# Red Team Review: 2026-07-16-battleframe-core-mvp.md

Spec. 11 sub-specs / 62 acceptance criteria at review time (12 / 63 after patching).
All 9 roles run. **4 CRITICAL, 10 ADVISORY — all resolved.**

## CRITICAL Findings

### C-1: Workers cannot read the research the spec tells them to read
- **Role:** Developer Implementer / Integration Architect
- **Location:** SS-04 Scope, SS-10 Scope, Context
- **Issue:** `.gitignore` ignored all of `vault/`. The factory spawns a worktree **from
  HEAD**, so `vault/` would not exist there — yet SS-04 said *"Read
  `vault/foundry-systems/spike-results-measurement.md` before writing any code"* and SS-10
  said *"`vault/greathelm/GREATHELM-QSR.pdf` is the authority. Read it."*
- **Evidence:** Verified. `.gitignore:2` was `vault/`. `GREATHELM-QSR.pdf` and
  `lancer-activation-based-combat-precedent.md` confirmed on disk, both unreachable from a
  worktree.
- **Impact:** SS-10 is the MVP. Its worker would have had **no rulebook** and would have
  fallen back to web sources known to be wrong (Goonhammer: Run 6"; rulebook: Sprint **5"**).
  This finding alone produces a wrong game.
- **Fix applied:** `.gitignore` narrowed from `vault/` to `vault/**/*.pdf` (+ epub/mobi/cbz/
  cbr/zip). The **notes are tracked**; the **copyrighted source document is not**. SS-10
  retargeted to read `vault/greathelm/` notes rather than the PDF, with an explicit warning
  that the PDF will not exist and that web sources must not be substituted. Two
  `[MECHANICAL]` criteria added to SS-02: no PDF is tracked, and >200 notes are.
- **Note:** this reversed an explicit user instruction ("the vault folder can get ignored").
  Raised with the user rather than changed silently; they confirmed the intent was copyright
  protection, which the narrower ignore serves better.

### C-2: SS-08 declared migration flag plumbing in scope with no criterion to build it
- **Role:** Data / Migration Steward
- **Location:** SS-08 Decisions vs. Acceptance criteria
- **Issue:** The Decisions block said *"Only the flag plumbing is in scope here"*; none of
  the six acceptance criteria mentioned the flag. It would not have been built.
- **Impact:** Stamping documents from day one is the one part of migrations expensive to
  retrofit — precisely the part that would have been silently skipped.
- **Fix applied:** Four criteria added — `flags.battleframe.schemaVersion` stamped at create
  time; `getSchemaVersion`/`setSchemaVersion` exported and unit-tested including the
  no-flag case; a `[MECHANICAL]` grep asserting no world-level schema setting exists; and
  `flags.battleframe.orphanedFrom` preserving the original payload so conversion is
  reversible.

### C-3: SS-10 oversized
- **Role:** Scope Realist
- **Location:** SS-10 (13 files)
- **Issue:** Spanned manifest, registration, data model, dice pool, action mapping, round
  loop, clash resolution, sheet, template, i18n, and two test suites. The spec's own
  scorecard already conceded *"SS-10 is the largest and could split further."* Rule of thumb
  is 1–3 files. Matches the historical high-defer pattern.
- **Fix applied:** Split. **SS-10** = foundation (manifest, registration, KnightData, dice
  pool, face→action mapping, constants) — 9 files. **SS-11** = round loop, clash, sheet —
  5 files. Integration renumbered **SS-11 → SS-12**, `depends_on` updated to `['SS-09',
  'SS-11']`. Dependency graph re-verified as an acyclic DAG.

### C-4: SS-04 depended on a manual sub-spec's artifact with no defined fallback
- **Role:** Developer Implementer
- **Location:** SS-04 Scope
- **Issue:** SS-04 must read `spike-results-measurement.md`, produced by SS-01
  (`dispatch: manual`). The file does not exist and no behavior was defined for its absence.
- **Impact:** A worker finds no file and either guesses or stalls. Guessing here produces
  silently wrong ranges in every game Battleframe will ever host.
- **Fix applied:** Explicit stop-and-escalate. *"If that file does not exist, STOP and
  escalate. Do not proceed... its absence means the gate has not been run, not that it
  passed."*

## ADVISORY Findings

| ID | Finding | Role | Resolution |
|---|---|---|---|
| A-1 | `esmodules` / Vite output path never committed | Developer | Committed default: `dist/battleframe.js`, `"esmodules": ["dist/battleframe.js"]` |
| A-2 | npm workspaces undeclared but root `npm install` asserted | Developer | Committed default `workspaces: ["packages/*"]` + `[MECHANICAL]` check |
| A-3 | No sub-spec owned creating the `game.battleframe` namespace | Architect | Assigned to SS-12 explicitly |
| A-4 | SS-06 multi-client sync tagged `[BEHAVIORAL]`, needs two browsers | QA | Split; sync retagged `[HUMAN REVIEW]` |
| A-5 | SS-07 Dice So Nice test needs a third-party module | QA | Retagged `[HUMAN REVIEW]`; default test env stated as zero third-party modules |
| A-6 | No mechanical guard the proprietary PDF stays untracked | Security | `[MECHANICAL]` `git ls-files \| grep -iE '\.(pdf\|epub\|mobi\|cbz\|cbr)$'` returns nothing |
| A-7 | **Dropped requirement** — brain dump's *"ruleset modules must clearly identify any separately required official rulebook"* | Product | Restored as a `[STRUCTURAL]` criterion on SS-10's `module.json` |
| A-8 | Trademark question (design OQ7) absent from spec | Product | Added to Out of Scope: public distribution is human-only |
| A-9 | Design claims measurement "inspectable"; no criterion enforced it | SRE | `[STRUCTURAL]` criterion — returns `{distance, units, mode}` + debug log of centre-to-centre, both radii, result |
| A-10 | Ruleset version incompatibility *after* a world exists uncovered | End User | Edge case added — warn, name both versions, never silently deactivate |

## Construction-Site Check (Phase 2.5)

**No findings.** SS-12 matches the `wire` / `integrate` trigger, but names a concrete call
site — `packages/battleframe/src/battleframe.ts` at the `init` hook — plus the full service
list. SS-10's registration names both the symbol (`registerRuleset`) and the API surface.
No vague seams; the spec's committed interface defaults (inherited from the design's
Commander's Intent) already carry concrete signatures.

## Role Scorecards

Developer: 3 | QA: 2 | End User: 1 | Architect: 2 | Scope Realist: 1 | Security: 1 |
SRE: 1 | Data: 1 | Product: 2

## Observations

**The strongest and weakest parts came from the same source.** The spec is unusually
specific because it rests on ~260 confirmed research notes — and its worst defect (C-1) was
that those notes were unreachable. Depth of research is worth nothing if the executor can't
see it.

**Two findings were dropped user requirements, not invented ones.** A-7 (identify the
required rulebook) came from the original brain dump and vanished during design. C-1
reversed an explicit instruction. Both were restored/raised rather than papered over.

**Score after patching: 32 → 34/35.** Edge coverage 4→5 (upgrade path, `not found`
escalation), decomposition 4→5 (SS-10 split). Acceptance criteria stays at 4: SS-01 is
irreducibly observational — a human with a licensed Foundry must look at a console, and no
tagging fixes that.
