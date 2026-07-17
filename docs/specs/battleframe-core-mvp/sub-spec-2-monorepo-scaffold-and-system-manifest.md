---
type: phase-spec
master_spec: "docs/specs/2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 2
title: "Monorepo scaffold and system manifest"
date: 2026-07-16
depends_on: ["SS-01"]
dispatch: factory
---

# Sub-Spec 2: Monorepo Scaffold and System Manifest

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

Stand up the repo: TypeScript, Vite, Vitest, npm workspaces, and a **loadable but empty**
Foundry v14 system. **No game logic.** The system must load in Foundry and log a readiness
line — nothing more.

This sub-spec owns **existence**, not content. Specifically:

- **`packages/battleframe/src/battleframe.ts` is a bare skeleton here.** It registers an
  `init` hook and a `ready` hook and logs. It does **not** construct `game.battleframe`, does
  **not** import a service (none exist), and does **not** anticipate one. **SS-12 rewrites this
  file in full** to wire every core service and build the `game.battleframe` namespace object.
  Both sub-specs legitimately declare the file: SS-02 owns its existence, SS-12 owns its
  content. Do not build SS-12's work early.
- **`git init` is in scope.** The repo is **not yet under version control** —
  `git rev-parse --is-inside-work-tree` currently fails. Make the first commit here.
- **`.gitignore` already exists on disk** and is correct as written. It ignores
  `vault/**/*.pdf` (and `.epub`, `.mobi`, `.cbz`, `.cbr`, `.zip`) while **tracking
  `vault/**/*.md`**. This is deliberate and was changed during red-team: the notes are our own
  writing and factory workers spawn a worktree from HEAD and must be able to read them; only
  the proprietary source documents stay local. **Do not "fix" this file to ignore `vault/`** —
  doing so breaks SS-04 and SS-10, which then fall back to web sources that are known to be
  **wrong** (Goonhammer says Run = 6"; the rulebook says Sprint = **5"**).

**Committed decisions — do not re-decide any of these:**

- **Language** TypeScript. **Build** Vite. **Tests** Vitest.
- **Monorepo**, npm workspaces `["packages/*"]`. `packages/battleframe/` (the system) and
  `packages/battleframe-greathelm/` (the module, created by SS-10 — **not** here).
- **Foundry v14** target. ApplicationV2 only. **No `template.json`** — it entered formal
  deprecation in v14 (`vault/foundry-systems/template-json-vs-datamodels.md`).
- **No `maximum` key** in `compatibility`.
- **Grid default** gridless: `{type: 0, distance: 1, units: "in"}`. GREATHELM is played on a
  sheet of paper. This is a **default for new Scenes, not a lock** — grid is per-Scene and a
  system cannot force it (`vault/foundry-systems/system-json-grid-is-a-default-not-a-lock.md`,
  `confidence: confirmed`).
- **Vite output** `packages/battleframe/dist/battleframe.js`; `system.json` declares
  `"esmodules": ["dist/battleframe.js"]` — manifest paths are relative to the package root.

**SS-01 is a gate.** It is `dispatch: manual` and requires a human with a licensed Foundry. Its
findings do not change any file in this sub-spec — nothing here measures anything — but this
sub-spec must not run before the gate has been answered, because a failed gate re-scopes SS-04
substantially. `depends_on: ["SS-01"]` encodes that ordering.

## Interface Contracts

### Provides

- **Root `package.json`** with `workspaces: ["packages/*"]` — without this, `npm install` at
  the repo root does not install both packages and the `npm install` criterion cannot pass.
- **`npm run build`** — the build command for every downstream sub-spec.
- **`npm test`** — the Vitest command for every downstream sub-spec. SS-03 onward rely on
  `npm test -- <name>` filtering to a file.
- **`tsconfig.json`** — the TypeScript config every package inherits.
- **`vitest.config.ts`** — the test config; establishes where tests live
  (`packages/*/tests/**`).
- **`packages/battleframe/system.json`** — the Foundry v14 system manifest. SS-05's registry
  reads the system version from it; SS-10's `module.json` declares
  `relationships.systems: [{id: "battleframe", type: "system"}]` against its `id`.
- **`packages/battleframe/src/constants.ts`** — exports at minimum the system id
  (`"battleframe"`) and a log prefix. Every later core file imports the id from here rather
  than hardcoding it.
- **`packages/battleframe/src/battleframe.ts`** — the system entry point **exists** and is the
  `esmodules` target. **Skeleton only; SS-12 rewrites it.**
- **`packages/battleframe/lang/en.json`** — the i18n bundle every later UI string lands in.
- **A git repository with a first commit**, including the 262 tracked `vault/**/*.md` notes.

### Requires

- **From SS-01:** the gate answer only. No file from SS-01 is imported, read, or parsed by any
  file in this sub-spec. SS-01's notes must be **committed** — they reach HEAD via SS-01 Step 9
  or, if that step ran before `git init`, via this sub-spec's first commit.
- **From the environment:** Node.js with npm (workspaces require npm 7+), and `git`.
- **On disk already:** `.gitignore` (correct as written — do not rewrite), `vault/` (262 `.md`
  notes), `spike/`, `docs/`.

### Shared State

- **`packages/battleframe/src/battleframe.ts`** — shared with **SS-12**, which rewrites it in
  full. Keep it minimal so there is nothing to unpick.
- **`packages/battleframe/src/constants.ts`** — read by every later core sub-spec. Additive
  only from here on.
- **`packages/battleframe/lang/en.json`** — appended to by SS-08 and SS-09.
- **`packages/battleframe/system.json`** — SS-08 may add to `documentTypes.Actor`; SS-10's
  `module.json` targets its `id`.
- **Root `package.json`** — SS-10 relies on the `packages/*` workspace glob to pick up
  `packages/battleframe-greathelm/` with no root change.
- **`.gitignore`** — already present. Note it ignores `dist/`, so the Vite output is built, not
  tracked. This is correct: `scripts/deploy-local.mjs` (SS-12) copies the built package into
  Foundry, and every worktree builds from source.
- **`vault/`** — read-only here. This sub-spec **asserts** the notes are tracked; it does not
  write them.

## Implementation Steps

### Step 1: Initialise version control

- **Action:** create
- **Run:** `git init`
- **Verify:** `git rev-parse --is-inside-work-tree` prints `true`.
- **Do not** create or modify `.gitignore` — it exists and is correct. Confirm with
  `git check-ignore -v vault/greathelm/GREATHELM-QSR.pdf` (ignored) and
  `git check-ignore -v vault/foundry-systems/index.md` (**not** ignored — exits 1, which is the
  pass).

### Step 2: Write failing test

- **File:** `packages/battleframe/tests/scaffold.test.ts`
- **Test name:** `scaffold > exposes the battleframe system id`
- **Asserts:** `import { SYSTEM_ID } from "../src/constants"` and
  `expect(SYSTEM_ID).toBe("battleframe")`. A trivial passing test is acceptable for this
  sub-spec's `npm test` criterion; this one at least proves the toolchain resolves TypeScript
  across the workspace, which a bare `expect(true).toBe(true)` would not.
- **Run:** `npm test`
- **Expected:** **FAIL** — `Cannot find module '../src/constants'` (the file does not exist
  yet). If it fails for any other reason, the Vitest wiring is wrong, not the test.

### Step 3: Create the root workspace manifest

- **File:** `package.json`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Standard npm workspaces layout.
- **Changes:**
  - `"name": "battleframe"`, `"private": true`, `"type": "module"`.
  - **`"workspaces": ["packages/*"]`** — required; the `npm install` criterion depends on it.
  - `"scripts"`: `"build"` runs the Vite build for every workspace; `"test"` runs `vitest run`.
    `npm test -- <name>` must filter to a test file — Vitest's default positional filename
    filter gives this for free.
  - `devDependencies`: `typescript`, `vite`, `vitest`, and the Foundry v14 type definitions if
    a package for them resolves. **If no v14 types package is available, declare `game` and
    `Hooks` as ambient globals in `tsconfig.json`/a local `.d.ts` rather than pulling in stale
    v10-era types** — the master spec's Preferences are explicit that remembered/stale Foundry
    idioms are usually wrong.

### Step 4: Create the TypeScript and Vitest configs

- **Files:** `tsconfig.json`, `vitest.config.ts`
- **Action:** create
- **Changes:**
  - `tsconfig.json`: `strict: true`, ESM module resolution, `target`/`lib` modern enough for
    Foundry v14's browser runtime, `types` covering Vitest globals if globals are enabled.
  - `vitest.config.ts`: `environment: "node"`, `include` covering `packages/*/tests/**/*.test.ts`.
    **No Foundry runtime is available in tests** — every later sub-spec unit-tests pure
    functions and stubs the Foundry objects it needs.

### Step 5: Verify test passes

- **Run:** `npm install && npm test`
- **Expected:** Still **FAIL** on the missing `constants` module — configs alone do not create
  it. `npm install` must exit 0 and install both workspace roots.

### Step 6: Implement the system constants

- **File:** `packages/battleframe/src/constants.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield.
- **Changes:** Export `SYSTEM_ID = "battleframe"` and a log prefix (e.g. `LOG_PREFIX = "Battleframe |"`).
  Keep it to identifiers the whole system shares. **No game-specific constant may ever appear
  here** — SS-12 greps `packages/battleframe/src/` for `greathelm|knight|sprint|encircle|clash`
  and expects nothing.

### Step 7: Verify test passes

- **Run:** `npm test`
- **Expected:** **PASS** — `scaffold > exposes the battleframe system id`.

### Step 8: Create the package manifest for the system

- **File:** `packages/battleframe/package.json`
- **Action:** create
- **Changes:** `"name": "battleframe"`, `"private": true`, `"type": "module"`, and a `build`
  script running Vite. This file is required for the `packages/*` workspace glob to resolve the
  package; the master spec's file list omits it because it is scaffolding implied by the
  committed workspaces decision.

<!-- packages/battleframe/package.json is not in the master spec's Files list, but npm
     workspaces cannot resolve a workspace without one, and the [MECHANICAL] `npm install`
     criterion therefore cannot pass without it. Flagging rather than silently expanding scope. -->

### Step 9: Configure the Vite build

- **File:** `packages/battleframe/vite.config.ts`
- **Action:** create
- **Changes:** Library build. Entry `src/battleframe.ts`. **Output must be an ES module at
  `packages/battleframe/dist/battleframe.js`** — this exact path is a committed default and
  `system.json` references it. Set `build.lib.formats: ["es"]` and pin the output filename;
  do not let Vite hash it. Do **not** bundle a Foundry runtime — `game`, `Hooks`, `CONFIG`, and
  `foundry.*` are globals provided by Foundry at runtime.

### Step 10: Write the system manifest

- **File:** `packages/battleframe/system.json`
- **Action:** create
- **Pattern:** `vault/foundry-systems/system-json-grid-is-a-default-not-a-lock.md`
  (`confidence: confirmed`) for the `grid` shape;
  `vault/foundry-systems/system-only-manifest-fields.md` for which fields are system-only.
- **Changes:** See the **Completeness Checklist** for the full required field list. Non-negotiable:
  - `"id": "battleframe"`
  - `"compatibility": {"minimum": "14", "verified": "14"}` — **no `maximum` key**.
  - `"grid": {"type": 0, "distance": 1, "units": "in"}`
  - `"esmodules": ["dist/battleframe.js"]` — **not** `scripts`. Relative to the package root.
  - `"documentTypes": {"Actor": {"generic": {}}}` — **no game-specific types.** SS-10's
    `knight` is declared in the module's own `module.json`, not here, and is namespaced
    `battleframe-greathelm.knight`
    (`vault/foundry-systems/document-subtypes-are-namespaced-by-package-id.md`).
  - **No `template.json` key, and no `template.json` file.** Deprecated in v14.
  - `"languages": [{"lang": "en", "name": "English", "path": "lang/en.json"}]`

### Step 11: Implement the entry-point skeleton

- **File:** `packages/battleframe/src/battleframe.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield.
- **Changes:** **Skeleton only.** Register `Hooks.once("init", ...)` and
  `Hooks.once("ready", ...)`; each logs one line using `LOG_PREFIX` and `SYSTEM_ID` from
  `constants.ts`. The `ready` line is the readiness line the `[BEHAVIORAL]` criterion checks
  for. **Nothing else.** No `game.battleframe` object, no service imports, no hook definitions
  beyond these two. SS-12 rewrites this file in full.

### Step 12: Create the language bundle

- **File:** `packages/battleframe/lang/en.json`
- **Action:** create
- **Changes:** Valid JSON, namespaced under `BATTLEFRAME.*`. A single key is fine — SS-08 and
  SS-09 append. It must exist because `system.json` declares `languages`, and Foundry logs a
  load error for a missing bundle.

### Step 13: Create README and LICENSE

- **Files:** `README.md`, `LICENSE`
- **Action:** create
- **Changes:**
  - `README.md`: what Battleframe is (a **ruleset-neutral Foundry v14 game system** — a table
    and a ruler, with games shipping as separate ruleset modules), the monorepo layout, and
    `npm install && npm run build && npm test`. State plainly that **no commercial rules text,
    stat block, unit data, or artwork ships in any package**, and that rulebooks must be
    obtained by the user.
  - `LICENSE`: **licence choice is a human-only decision** — the master spec routes anything
    touching shipping, publishing, licensing, or trademark to a human. Create the file; if no
    licence has been chosen, write a single explicit placeholder line saying so and
    **escalate**. Do not pick one.
  - **Do not** put `"Foundry Virtual Tabletop"` in any package title —
    `vault/foundry-systems/foundry-branding-rules-constrain-naming.md`.

### Step 14: Verify the full build and test cycle

- **Run:** `npm install && npm run build && npm test`
- **Expected:** All exit 0. `packages/battleframe/dist/battleframe.js` exists and is an ES
  module.

### Step 15: Run every mechanical check

- **Run:** each command in the **Checks** table below, from the repo root.
- **Expected:** every one exits 0.
- **Critical:** `git ls-files vault/ | grep -c '\.md$'` must return **> 200** (currently 262).
  If it returns 0, `.gitignore` has been broken or the files are unstaged — **fix it before
  committing**. SS-04 and SS-10 have no rulebook and no precedent to read without these notes.

### Step 16: Commit

- **Stage:** `git add package.json tsconfig.json vitest.config.ts .gitignore README.md LICENSE packages/battleframe/ vault/ docs/ spike/`
- **Message:** `feat: monorepo scaffold and Foundry v14 system manifest`
- **Verify after committing:** re-run the two `git ls-files` checks — they read the index, and
  before the first commit an unstaged tree gives a misleading result.

## Acceptance Criteria

Preserved verbatim from the master spec.

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

<!-- The `node -e "require('./package.json')"` criterion uses CommonJS `require`. The root
     package.json declares `"type": "module"`, but `node -e` scripts are not resolved against
     the nearest package.json `type` field and default to CJS, so `require` is available and
     the criterion passes as written. Preserved verbatim; noted because it reads like a
     contradiction and a worker may be tempted to "fix" it. -->

## Completeness Checklist

**`packages/battleframe/system.json`** — every field. No silent omissions.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `id` | string | required | Must be exactly `"battleframe"`. SS-10's `relationships.systems` targets it; SS-05's registry reads it |
| `title` | string | required | Foundry Setup UI. Must **not** contain `"Foundry Virtual Tabletop"` |
| `description` | string | required | Foundry Setup UI |
| `version` | string | required | SS-05 compares `battleframeCompatibility.minimum` against this |
| `compatibility.minimum` | string | required | `"14"` |
| `compatibility.verified` | string | required | `"14"` |
| `compatibility.maximum` | — | **must be absent** | Criterion forbids it; a `maximum` locks users out of the next release |
| `esmodules` | `string[]` | required | Exactly `["dist/battleframe.js"]`. Relative to the package root |
| `scripts` | — | **must be absent** | Criterion requires `esmodules`, not `scripts` |
| `grid.type` | number | required | `0` (gridless) — `CONST.GRID_TYPES.GRIDLESS` |
| `grid.distance` | number | required | `1` |
| `grid.units` | string | required | `"in"` |
| `grid.diagonals` | number | optional | Gridless never consults `diagonals` (`gridless-is-a-first-class-grid-class.md`). Omit |
| `documentTypes.Actor.generic` | object | required | SS-08 registers `CONFIG.Actor.dataModels.generic` against this name |
| `documentTypes` (game-specific types) | — | **must be absent** | `knight` belongs in SS-10's `module.json`, namespaced `battleframe-greathelm.knight` |
| `languages[]` | array | required | `[{lang: "en", name: "English", path: "lang/en.json"}]` |
| `authors[]` | array | required | Standard manifest field |
| `url` / `manifest` / `download` | string | optional | Distribution is out of scope — human-only decision. Omit or leave placeholder |
| `template.json` (key or file) | — | **must be absent** | Deprecated in v14. A `grep -c` criterion enforces this |

**Root `package.json`** — required fields.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `name` | string | required | `"battleframe"` |
| `private` | boolean | required | `true` — never publish to npm |
| `type` | string | required | `"module"` |
| `workspaces` | `string[]` | required | Exactly `["packages/*"]`. A `node -e` criterion asserts truthiness |
| `scripts.build` | string | required | Every downstream sub-spec runs `npm run build` |
| `scripts.test` | string | required | Every downstream sub-spec runs `npm test` and `npm test -- <name>` |
| `devDependencies` | object | required | `typescript`, `vite`, `vitest` at minimum |

**`packages/battleframe/src/constants.ts`** — exports.

| Export | Type | Required | Used By |
|--------|------|----------|---------|
| `SYSTEM_ID` | `"battleframe"` | required | Every later core file; the scaffold test |
| `LOG_PREFIX` | string | required | `battleframe.ts` readiness line; SS-03's debug log |

Boundaries and exact values:

- `compatibility.minimum` / `verified`: **`"14"`** — Foundry v14; 14.363 confirmed running.
- `compatibility.maximum`: **absent**. Not empty, not null — the key does not exist.
- `grid`: exactly **`{type: 0, distance: 1, units: "in"}`**.
- Vite output path: exactly **`packages/battleframe/dist/battleframe.js`** — committed default.
- `esmodules`: exactly **`["dist/battleframe.js"]`** — package-root-relative, one entry.
- npm workspaces glob: exactly **`["packages/*"]`**.
- Tracked `vault/**/*.md` files: **> 200** (currently **262**).
- Tracked `.pdf` / `.epub` / `.mobi` / `.cbz` / `.cbr` files: **exactly 0**.
- Occurrences of `template.json` in `system.json`: **exactly 0**.
- Packages created here: **1** (`packages/battleframe/`). `packages/battleframe-greathelm/`
  is SS-10's.
- Game logic in this sub-spec: **none**.

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test`
- **Acceptance:**
  - Full cycle: `npm install && npm run build && npm test` — all exit 0.
  - `[MECHANICAL]` and `[STRUCTURAL]` — see **Checks** below; every command exits 0.
  - `[BEHAVIORAL]` (world creation + readiness line) — **not worker-assertable.** It needs a
    licensed Foundry v14. Operator steps: `npm run build`, copy `packages/battleframe/` to
    `{userData}/Data/systems/battleframe/`, restart Foundry, create a world on **Battleframe**,
    open the console (F12), confirm the `ready` line. `dist/` is gitignored — **build before
    copying** or the manifest's `esmodules` target will be missing.

## Checks

Auto-generated from `[MECHANICAL]` and `[STRUCTURAL]` criteria only. `[BEHAVIORAL]` criteria
are excluded. Each command exits 0 on pass, or exits 1 printing a one-line summary on fail. Run
from the repo root.

| Criterion | Type | Command |
|---|---|---|
| `npm install && npm run build` exits 0 | MECHANICAL | `npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1 \|\| { echo "FAIL: npm install && npm run build did not exit 0"; exit 1; }` |
| `npm test` exits 0 | MECHANICAL | `npm test >/dev/null 2>&1 \|\| { echo "FAIL: npm test did not exit 0"; exit 1; }` |
| `system.json` has `id`, `compatibility {minimum,verified}` with no `maximum`, and the gridless `grid` block | STRUCTURAL | `node -e 'const s=require("./packages/battleframe/system.json");const e=[];if(s.id!=="battleframe")e.push("id!==battleframe");if(s.compatibility?.minimum!=="14")e.push("compatibility.minimum!==14");if(s.compatibility?.verified!=="14")e.push("compatibility.verified!==14");if("maximum" in (s.compatibility\|\|{}))e.push("compatibility.maximum present");if(s.grid?.type!==0\|\|s.grid?.distance!==1\|\|s.grid?.units!=="in")e.push("grid!={type:0,distance:1,units:in}");if(e.length){console.log("FAIL: system.json: "+e.join("; "));process.exit(1)}'` |
| `system.json` declares `documentTypes.Actor.generic` and no game-specific types | STRUCTURAL | `node -e 'const s=require("./packages/battleframe/system.json");const a=s.documentTypes?.Actor\|\|{};const k=Object.keys(a);if(!("generic" in a)){console.log("FAIL: system.json documentTypes.Actor.generic missing");process.exit(1)}const bad=k.filter(x=>x!=="generic");if(bad.length){console.log("FAIL: system.json declares game-specific Actor types: "+bad.join(","));process.exit(1)}'` |
| `grep -c "template.json" packages/battleframe/system.json` returns 0 | MECHANICAL | `n=$(grep -c "template.json" packages/battleframe/system.json); [ "$n" = "0" ] \|\| { echo "FAIL: system.json references template.json ($n occurrences) — deprecated in v14"; exit 1; }` |
| Build emits an ES module referenced via `esmodules: ["dist/battleframe.js"]`, not `scripts` | STRUCTURAL | `node -e 'const s=require("./packages/battleframe/system.json");const e=[];if(JSON.stringify(s.esmodules)!==JSON.stringify(["dist/battleframe.js"]))e.push("esmodules!=[dist/battleframe.js]");if(s.scripts)e.push("scripts key present");if(e.length){console.log("FAIL: "+e.join("; "));process.exit(1)}' && [ -f packages/battleframe/dist/battleframe.js ] \|\| { echo "FAIL: packages/battleframe/dist/battleframe.js not built — run npm run build"; exit 1; } && grep -qE '^\s*(export|import)\b' packages/battleframe/dist/battleframe.js \|\| { echo "FAIL: dist/battleframe.js has no ESM import/export — not an ES module"; exit 1; }` |
| Root `package.json` declares npm workspaces `["packages/*"]` | STRUCTURAL | `node -e 'const p=require("./package.json");if(JSON.stringify(p.workspaces)!==JSON.stringify(["packages/*"])){console.log("FAIL: root package.json workspaces is "+JSON.stringify(p.workspaces)+", expected [\"packages/*\"]");process.exit(1)}'` |
| `node -e "...p.workspaces?0:1"` exits 0 | MECHANICAL | `node -e "const p=require('./package.json'); process.exit(p.workspaces?0:1)" \|\| { echo "FAIL: root package.json declares no workspaces"; exit 1; }` |
| No copyrighted source document is tracked | MECHANICAL | `out=$(git ls-files \| grep -iE '\.(pdf\|epub\|mobi\|cbz\|cbr)$'); [ -z "$out" ] \|\| { echo "FAIL: copyrighted source documents are tracked: $(echo "$out" \| tr '\n' ' ')"; exit 1; }` |
| The research notes ARE tracked (`git ls-files vault/ \| grep -c '\.md$'` > 200) | MECHANICAL | `n=$(git ls-files vault/ \| grep -c '\.md$'); [ "$n" -gt 200 ] \|\| { echo "FAIL: only $n vault .md notes tracked, expected >200 — SS-04/SS-10 need them"; exit 1; }` |

## Patterns to Follow

**No existing pattern — greenfield.** BattleFrame contains only `vault/`, `spike/`, `docs/`,
and `.gitignore`. There is no source file to imitate and **no "Patterns to Follow" citation of
existing code is possible**. The references below are **research notes** and **throwaway spike
code**, not code to copy.

- `vault/foundry-systems/system-json-grid-is-a-default-not-a-lock.md` (`confidence: confirmed`):
  the **exact `grid` shape** and the four optional keys, cross-confirmed against Custom System
  Builder's shipping `system.json`. Also the reason the gridless default is **advisory** — grid
  is a per-Scene `SchemaField` and a system cannot force it. Do not write code that assumes
  every scene is gridless.
- `vault/foundry-systems/template-json-vs-datamodels.md`: **`template.json` entered formal
  deprecation in v14. Don't write one.** The `grep -c` criterion enforces this.
- `vault/foundry-systems/system-only-manifest-fields.md`: only 7 fields are truly system-only;
  `documentTypes` is **shared** between systems and modules — which is exactly why SS-10's
  `knight` goes in `module.json` and not here.
- `vault/foundry-systems/foundry-v14-is-current-as-of-july-2026.md`: v14 is the target. The
  master spec confirms **14.363** running on the target server.
- `vault/foundry-systems/foundry-branding-rules-constrain-naming.md`: you may **not** put
  `"Foundry Virtual Tabletop"` in a package title. Applies to `system.json` `title` and
  `README.md`.
- `vault/foundry-systems/settings-and-api-namespace-conventions.md`: **there is no official API
  mechanism for Foundry systems** — `game.system.api` is pure convention. Relevant context for
  why `game.battleframe` is ours to define, but **the namespace object is SS-12's work, not
  this sub-spec's.**
- `vault/foundry-systems/document-subtypes-must-be-declared-statically-in-the-manifest.md`:
  subtype **names** ship in the manifest and are server-enforced; the **class** registers at
  `init`. Here only `generic`'s name is declared — SS-08 registers its class.
- `spike/bf-test/system.json`: a v14 system manifest that was **written blind and never
  verified** (`spike/README.md`: "It may not even load first try"). Useful as a **shape
  reference only**. Do not copy it wholesale, do not treat it as a scaffold, and do not import
  from `spike/` — the README is explicit that none of it should survive into the real system.
- `.gitignore` (on disk, already correct): the tracked-notes / ignored-sources split, with the
  reasoning in a header comment. **Read it before touching it. Do not "fix" it.**

## Files

Every path in this sub-spec is new. Paths prefixed `will-create:` do not yet exist on disk; the
spec-reality-gate skips existence checks for them.

| File | Action | Purpose |
|------|--------|---------|
| `will-create: package.json` | Create | Root workspace manifest. `workspaces: ["packages/*"]`, `build` and `test` scripts, devDependencies. |
| `will-create: tsconfig.json` | Create | TypeScript config every package inherits. Strict, ESM. |
| `will-create: vitest.config.ts` | Create | Vitest config. Includes `packages/*/tests/**/*.test.ts`. |
| `will-create: packages/battleframe/system.json` | Create | Foundry v14 system manifest. `id: battleframe`, compatibility 14/14 with no `maximum`, gridless grid default, `esmodules: ["dist/battleframe.js"]`, `documentTypes.Actor.generic`. |
| `will-create: packages/battleframe/vite.config.ts` | Create | Vite library build → `packages/battleframe/dist/battleframe.js`, ESM, unhashed filename. |
| `will-create: packages/battleframe/src/battleframe.ts` | Create | System entry point. **Skeleton only** — `init` + `ready` hooks that log. **SS-12 rewrites in full.** |
| `will-create: packages/battleframe/src/constants.ts` | Create | `SYSTEM_ID`, `LOG_PREFIX`. Read by every later core sub-spec. No game-specific constants, ever. |
| `will-create: packages/battleframe/lang/en.json` | Create | i18n bundle declared by `system.json` `languages`. Appended to by SS-08/SS-09. |
| `will-create: README.md` | Create | What Battleframe is, monorepo layout, build/test commands, the no-rules-content statement. |
| `will-create: LICENSE` | Create | **Human-only decision.** Create the file; if no licence is chosen, write an explicit placeholder and escalate. Do not pick one. |
| `will-create: packages/battleframe/package.json` | Create | Required for the `packages/*` workspace glob to resolve the package. Not in the master spec's list; `npm install` cannot pass without it. |
| `will-create: packages/battleframe/tests/scaffold.test.ts` | Create | The trivial passing test the `npm test` criterion allows. Asserts `SYSTEM_ID === "battleframe"`, proving the toolchain resolves TS across the workspace. |
| `.gitignore` | **Do not modify** | Already on disk and correct. Ignores `vault/**/*.pdf` etc; **tracks `vault/**/*.md`**. Changing it breaks SS-04 and SS-10. |
