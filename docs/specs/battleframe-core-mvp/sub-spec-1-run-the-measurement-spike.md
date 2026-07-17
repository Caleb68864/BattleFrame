---
type: phase-spec
master_spec: "docs/specs/2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 1
title: "Run the measurement spike and record results"
date: 2026-07-16
depends_on: []
dispatch: manual
---

# Sub-Spec 1: Run the measurement spike and record results

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

Deploy the existing throwaway spike in `spike/` to a Foundry v14 instance, run the three
probes, and record what is **actually observed** — verbatim console output, not inference.

**This is a human/operator task.** It requires a licensed Foundry, a live world, a browser
with a console, and a human deciding when output looks wrong. It cannot be automated and is
marked `dispatch: manual` accordingly. There are no unit tests here and no TDD loop — the
steps below are **operator instructions**, and the deliverable is three research notes.

**This is a GATE.** If probe 2 shows base-to-base is unreachable via `measurePath`'s `cost`
callback, **stop and re-scope with a human**. Core must then own measurement outright and
replace the ruler, roughly doubling SS-04. Do not proceed on assumption. SS-04 explicitly
refuses to run without `vault/foundry-systems/spike-results-measurement.md` on disk: its
absence means the gate has not been run, not that it passed.

**Spike code already exists.** Read `spike/README.md` first — it names every observation to
make, keyed `1.1`–`1.8`, `2.1`–`2.5`, `3.1`–`3.4`. The spike ships three packages:
`spike/bf-test/` (system), `spike/bf-ruleset-test/` and `spike/bf-ruleset-test-2/` (two
modules, deliberately declaring a colliding `squad` type name to test namespacing). The code
was written blind from research notes against a Foundry that was never run — it is
`unverified` and **is expected to need iteration**. Iterating it until it loads is in scope;
the observations are the deliverable, not the code.

**When the spike and the vault disagree, the vault is wrong.** Correct the note, state the
correction explicitly, and continue. Do not adjust observations to match notes.

The three probes target the two questions that can sink the project:

- **Probe 1 — module-supplied subtypes.** The *mechanism* is confirmed
  (`vault/foundry-systems/modules-can-contribute-document-subtypes.md`, `confidence: confirmed`).
  The *ergonomics* when every unit in the game is module-provided are not.
- **Probe 2 — measurement.** The real risk.
  `vault/foundry-systems/custom-distance-measurement-has-no-clean-override-seam.md` records
  the `cost` callback as the only seam and the core issue
  ([#11428](https://github.com/foundryvtt/foundryvtt/issues/11428)) as open and unanswered.
  `vault/foundry-systems/gridless-is-a-first-class-grid-class.md` is `confidence: partial`
  and says base-to-base is **not found** in official docs. This probe closes that.
- **Probe 3 — Regions.** `vault/foundry-systems/v14-breaking-changes-that-matter.md` claims
  `MeasuredTemplate` Documents were **deleted** — the first-ever Document removal. Confirm or
  refute it.

## Interface Contracts

### Provides

- `vault/foundry-systems/spike-results-measurement.md`: the **SS-04 gate artifact**. Records
  verbatim `game.bfSpike.probeMeasurement()` output, whether the `cost` callback can express
  base-to-base, and what units a gridless scene reports. SS-04 reads this file before writing
  any code and **stops if it is absent**.
- `vault/foundry-systems/spike-results-regions.md`: records verbatim
  `game.bfSpike.probeRegions()` output, whether `MeasuredTemplate` is gone in v14, and whether
  Regions can preview without persisting. Informs the (currently out-of-scope) Area Service.
- `vault/foundry-systems/spike-results-module-subtypes.md`: records probe 1 — subtype
  persistence across reload, token behaviour, namespaced coexistence, and **`init` order
  (system before module?)**. SS-05 consumes the `init`-order finding: if module `init` precedes
  system `init`, ruleset registration moves to `setup`.
- Corrections to any existing `vault/foundry-systems/` note that real Foundry contradicts.

### Requires

- Nothing from another sub-spec. `depends_on: []`.
- **Operator preconditions** (human, not code):
  - A licensed Foundry **v14** instance. Target: `foundry.savagefables.com` (Docker);
    14.363 confirmed running.
  - Filesystem access to that instance's `{userData}/Data/` directory.
  - A browser with a console (F12).
  - The `spike/` directory as committed.

### Shared State

- **`vault/foundry-systems/`** — shared with SS-04 (measurement note), SS-05 (`init`-order
  finding), and SS-06 (Lancer precedent note, read-only here). This sub-spec both **adds**
  three notes and **corrects** existing ones in place.
- **`spike/`** — throwaway. `spike/README.md` instructs deleting the folder once results are
  recorded. **Do not delete it in this sub-spec.** The notes are the artifact; deletion is a
  separate cleanup and removing the probe source would make the recorded output unreproducible
  while SS-04 still depends on it.
- No source code, no build, no package manifests are touched here.

## Implementation Steps

> These are **operator instructions**, not TDD steps. There is no test command in this
> sub-spec. Every step ends in an observation written down, not an assertion passing.

### Step 1: Deploy the spike packages

- **Action:** Copy the three spike packages into the Foundry instance's user data.
- **Source → destination:**
  - `spike/bf-test/` → `{userData}/Data/systems/bf-test/`
  - `spike/bf-ruleset-test/` → `{userData}/Data/modules/bf-ruleset-test/`
  - `spike/bf-ruleset-test-2/` → `{userData}/Data/modules/bf-ruleset-test-2/`
- **Expected:** All three appear in Foundry's Setup screen. If a manifest is rejected, fix the
  manifest and redeploy — iterating the spike is in scope.

### Step 2: Create the world and open the console

- **Action:** Create a world using the **BF Spike Test** system. Enable **both**
  `bf-ruleset-test` and `bf-ruleset-test-2`. Launch the world. Open the browser console (F12)
  and filter on `BF-SPIKE |` — everything the spike logs carries that prefix.
- **Observe:** Whether the world loads at all, and every console **error**, not just the spike
  lines.
- **Expected:** Possibly failure. The spike is unverified. Iterate until it loads.
- **Record:** Any load error and its fix — a spike that needed a fix is evidence about the API.

### Step 3: Run probe 1 — module-supplied subtypes

- **Action:** Work through `spike/README.md` observations **1.1–1.8** in order.
- **Observe, at minimum:**
  - `1.1` Does **Create Actor** offer `squad` and `squad2`?
  - `1.2` Are the type **labels** right, or raw ids like `bf-ruleset-test.squad`?
  - `1.3` **The crux.** Create a `squad`, then **reload the world**. Did it persist?
  - `1.4` Drop it on canvas — does the **token** work? The prototype token?
  - `1.5` **Disable** `bf-ruleset-test`. What happens to existing squads?
  - `1.6` **`init` order** — system before module?
  - `1.7` Does `actor.system.modelProvider` return the module?
  - `1.8` Do `bf-ruleset-test.squad` and `bf-ruleset-test-2.squad` **coexist**?
- **Record:** Console output **verbatim** into
  `vault/foundry-systems/spike-results-module-subtypes.md`. Copy the text; do not paraphrase it.

### Step 4: Run probe 2 — measurement (THE GATE)

- **Action:** Select **two tokens** on a **gridless** scene, then run
  `game.bfSpike.probeMeasurement()` in the console.
- **Observe, at minimum:**
  - `2.1` Does `canvas.grid.measurePath` return **centre-to-centre**?
  - `2.2` **Can the `cost` callback reach edge-to-edge?** This is the gate question.
  - `2.3` Does token **size/base** factor in at all?
  - `2.4` Is `canvas.grid.diagonals` **read-only** on a live grid?
  - `2.5` On a **gridless** scene, what are the **units** — pixels or inches?
- **Record:** Output **verbatim** into `vault/foundry-systems/spike-results-measurement.md`,
  stating explicitly whether `cost` can express base-to-base and what units gridless reports.
- **GATE:** If `cost` **cannot** express base-to-base → **STOP. Escalate to a human before any
  further sub-spec runs.** Record the finding, then stop. Core owning measurement outright is a
  re-scope decision, not a worker decision.

### Step 5: Run probe 3 — Regions

- **Action:** Run `game.bfSpike.probeRegions()` in the console.
- **Observe, at minimum:**
  - `3.1` Is `MeasuredTemplate` really **gone** in v14?
  - `3.2` Can a **Region** be created programmatically with a circle/cone shape?
  - `3.3` Can we query **which tokens are inside** a Region?
  - `3.4` Can a Region be **transient** — preview, then discard?
- **Record:** Output **verbatim** into `vault/foundry-systems/spike-results-regions.md`.

### Step 6: Write the three result notes

- **Files:**
  - `vault/foundry-systems/spike-results-measurement.md`
  - `vault/foundry-systems/spike-results-regions.md`
  - `vault/foundry-systems/spike-results-module-subtypes.md`
- **Action:** create
- **Pattern:** Match the existing vault note house style — see
  `vault/foundry-systems/gridless-is-a-first-class-grid-class.md` and
  `vault/foundry-systems/system-json-grid-is-a-default-not-a-lock.md`. One idea per note,
  standalone, `[[wikilink]]`ed.
- **Required frontmatter** — every note, exactly:

  ```
  tags: [foundry-vtt, system-development]
  source: spike observation, Foundry v14.363, {YYYY-MM-DD}
  confidence: confirmed
  ```

- **Required content:** Verbatim console output in a fenced block, **cited as observed** — not
  inference. Where something was inferred rather than seen, say so and do **not** mark it
  `confirmed`.
- **Required section:** each note ends with `## Corrections to existing notes` listing every
  note this observation contradicts, with the correction stated explicitly — or the single line
  `None — no existing note was contradicted.` The section is never omitted.

### Step 7: Correct contradicted notes in place

- **Action:** modify
- **Files:** any note under `vault/foundry-systems/` that real Foundry contradicts.
- **Changes:** Correct the claim, and state the correction explicitly in the note — do not
  silently overwrite. Adjust `confidence:` frontmatter to match what is now known.
- **Likely candidates** (verify, do not assume):
  - `gridless-is-a-first-class-grid-class.md` — `confidence: partial`; its base-to-base
    "not found" is exactly what probe 2 resolves.
  - `custom-distance-measurement-has-no-clean-override-seam.md` — probe 2 tests the `cost`
    seam claim directly.
  - `v14-breaking-changes-that-matter.md` — probe 3 tests the `MeasuredTemplate` deletion claim.
  - `objectfield-as-a-freeform-system-data-escape-hatch.md` — flagged
    **unverified inference** in the index.
- **Rule:** **Real Foundry is right and the notes are wrong.** Never edit an observation to
  match a note.

### Step 8: Update the vault index

- **File:** `vault/foundry-systems/index.md`
- **Action:** modify
- **Changes:** Add the three new notes under the **Grid and measurement** and **Data models**
  headings as `[[wikilink]]` entries with a one-line summary each, matching the existing index
  style.

### Step 9: Commit the artifact

<!-- Docs-only sub-spec: every file is .md and none matches /\.(ts|js|tsx|jsx|py|rb|go|rs|cs|sql|sh)$/, so the commit step is explicit per the auto-inject rule. -->

- **Stage:** `git add vault/foundry-systems/spike-results-measurement.md vault/foundry-systems/spike-results-regions.md vault/foundry-systems/spike-results-module-subtypes.md vault/foundry-systems/index.md`
- **Also stage** any note corrected in Step 7: `git add vault/foundry-systems/`
- **Commit:** `git commit -m "factory(SS-01): record measurement spike results and correct contradicted vault notes [factory-managed]"`
- **Note:** The repo is **not yet under version control** — SS-02 runs `git init`. If
  `git rev-parse --is-inside-work-tree` fails, run `git init` first, then stage and commit. The
  notes must reach HEAD: factory workers for SS-04 and SS-10 spawn a worktree from HEAD, and an
  uncommitted note is an absent note.

## Acceptance Criteria

Preserved verbatim from the master spec.

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

## Completeness Checklist

This sub-spec creates no code interfaces. The "schema" it creates is the **frontmatter of each
result note** — every field is required on all three notes.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `tags` | `string[]` | required | Vault convention; must include `foundry-vtt`, `system-development` |
| `source` | string | required | Must name the spike observation + Foundry build (e.g. `spike observation, Foundry v14.363, 2026-07-16`) |
| `confidence` | `confirmed` \| `partial` \| `unverified` | required | Must be `confirmed` — these are observations. SS-04/SS-05/SS-10 gate on this field |

Required body sections, every note:

| Section | Required | Used By |
|---------|----------|---------|
| Verbatim console output in a fenced block | required | The `cites observed console output` criterion |
| `## Corrections to existing notes` | required | The corrections criterion; may read `None — no existing note was contradicted.` |

Observations that must appear, by note:

| Note | Observations |
|------|--------------|
| `spike-results-module-subtypes.md` | `1.1`–`1.8` (README probe 1) — incl. reload persistence, token behaviour, `init` order, namespaced coexistence |
| `spike-results-measurement.md` | `2.1`–`2.5` (README probe 2) — incl. the `cost`/base-to-base gate answer and gridless units |
| `spike-results-regions.md` | `3.1`–`3.4` (README probe 3) — incl. `MeasuredTemplate` presence and Region transience |

Boundaries:

- Result notes: **exactly 3** — no more, no fewer. The master spec declares three paths.
- Foundry version under test: **v14** (14.363 confirmed on the target server) — a result from
  any other major version does not satisfy the gate.
- `confidence` on all 3 notes: **`confirmed`** — no other value is acceptable.
- Vault `.md` files tracked in git: currently **262**, must stay **> 200** (SS-02 asserts this).
- Files of code created: **0**.

## Verification Commands

- **Build:** none — no build exists at this phase. SS-02 creates it.
- **Tests:** none. This sub-spec is `dispatch: manual` and observational; **do not invent a
  test command for it.**
- **Acceptance:**
  - `[HUMAN REVIEW]` ×4 — verified by the operator at the console, in a live licensed Foundry
    v14 world. Not assertable by a worker.
  - `[STRUCTURAL]` ×2 — see **Checks** below.
  - **Gate check, human:** open `vault/foundry-systems/spike-results-measurement.md` and read
    the `cost`/base-to-base answer. If it is negative, **STOP** and re-scope with a human before
    SS-02 runs.

## Checks

Auto-generated from `[MECHANICAL]` and `[STRUCTURAL]` criteria only. `[BEHAVIORAL]` and
`[HUMAN REVIEW]` criteria are excluded — they are not shell-checkable. Each command exits 0 on
pass, or exits 1 printing a one-line summary on fail. Run from the repo root.

| Criterion | Type | Command |
|---|---|---|
| Each result note carries frontmatter `confidence: confirmed` | STRUCTURAL | `for f in vault/foundry-systems/spike-results-measurement.md vault/foundry-systems/spike-results-regions.md vault/foundry-systems/spike-results-module-subtypes.md; do [ -f "$f" ] \|\| { echo "FAIL: missing $f"; exit 1; }; awk '/^---$/{n++; next} n==1' "$f" \| grep -qx 'confidence: confirmed' \|\| { echo "FAIL: $f lacks frontmatter 'confidence: confirmed'"; exit 1; }; done` |
| Each result note cites observed console output — not inference | STRUCTURAL | `for f in vault/foundry-systems/spike-results-measurement.md vault/foundry-systems/spike-results-regions.md vault/foundry-systems/spike-results-module-subtypes.md; do grep -q '```' "$f" \|\| { echo "FAIL: $f has no fenced console-output block"; exit 1; }; grep -q 'BF-SPIKE' "$f" \|\| { echo "FAIL: $f cites no BF-SPIKE console output"; exit 1; }; done` |
| Any existing note that real Foundry contradicts is corrected, with the correction stated explicitly | STRUCTURAL | `for f in vault/foundry-systems/spike-results-measurement.md vault/foundry-systems/spike-results-regions.md vault/foundry-systems/spike-results-module-subtypes.md; do grep -q '^## Corrections to existing notes' "$f" \|\| { echo "FAIL: $f has no '## Corrections to existing notes' section"; exit 1; }; done` |

<!-- The third check is a proxy, not a proof. Whether a contradicted note was actually corrected
     cannot be decided by a shell command — it needs the observations. The check enforces that the
     operator answered the question explicitly (including "None"), which is the strongest
     mechanical form available. The criterion itself is verified by human review of the diff. -->

## Patterns to Follow

**No existing pattern — greenfield.** There is no codebase: BattleFrame contains only `vault/`,
`spike/`, `docs/`, and `.gitignore`. This sub-spec writes no code at all. The patterns below are
**research notes and the spike source**, not source files to imitate.

- `spike/README.md`: **the operator's script.** Names every observation `1.1`–`3.4`, the deploy
  paths, the `BF-SPIKE |` console filter, and the standard for recording results. Follow it
  literally — except its "then delete this folder" instruction, which is out of scope here.
- `vault/foundry-systems/gridless-is-a-first-class-grid-class.md`: **the house note style** —
  frontmatter with `source` + `confidence`, one idea, explicit `Not found / unverified` section.
  Match this shape. It is also `confidence: partial` and a prime correction candidate: it records
  base-to-base as **not found** in official docs, which is what probe 2 resolves.
- `vault/foundry-systems/system-json-grid-is-a-default-not-a-lock.md`: **how to cite** —
  `confidence: confirmed` earned by quoting the source verbatim and cross-confirming against a
  real shipping system. Do the equivalent with console output.
- `vault/foundry-systems/index.md`: **the index shape** — grouped headings, `[[wikilink]]` plus a
  one-line summary. Step 8 appends in this style.
- `vault/foundry-systems/custom-distance-measurement-has-no-clean-override-seam.md`: the claim
  probe 2 tests. Read before Step 4.
- `vault/foundry-systems/v14-breaking-changes-that-matter.md`: the `MeasuredTemplate` deletion
  claim probe 3 tests. Read before Step 5.
- `vault/foundry-systems/modules-can-contribute-document-subtypes.md`: `confidence: confirmed`.
  Probe 1 tests ergonomics, **not** the mechanism — the mechanism is settled.

## Files

Every path in this sub-spec is new. Paths prefixed `will-create:` do not yet exist on disk; the
spec-reality-gate skips existence checks for them.

| File | Action | Purpose |
|------|--------|---------|
| `will-create: vault/foundry-systems/spike-results-measurement.md` | Create | **The SS-04 gate artifact.** Verbatim probe 2 output: whether `cost` can express base-to-base, and what units a gridless scene reports. SS-04 stops if this file is absent. |
| `will-create: vault/foundry-systems/spike-results-regions.md` | Create | Verbatim probe 3 output: whether `MeasuredTemplate` is gone in v14, whether Regions preview without persisting. |
| `will-create: vault/foundry-systems/spike-results-module-subtypes.md` | Create | Verbatim probe 1 output: subtype reload persistence, token behaviour, `init` order (consumed by SS-05), namespaced coexistence. |
| `vault/foundry-systems/index.md` | Modify | Link the three new notes under the existing headings. |
| `vault/foundry-systems/*.md` (contradicted notes only) | Modify | Correct any note real Foundry contradicts, stating the correction explicitly. Exact set is unknown until the probes run. |
| `spike/**` | Modify (as needed) | Iterating the spike until it loads is in scope. It is throwaway code — do **not** promote, import, or scaffold from it. Do not delete it in this sub-spec. |
