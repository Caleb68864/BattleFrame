---
type: phase-spec
master_spec: "docs/specs/2026-07-16-battleframe-core-mvp.md"
sub_spec_number: 8
title: "Generic Actor type and fallback conversion"
date: 2026-07-16
depends_on: ["SS-05"]
---

# Sub-Spec 8: Generic Actor Type and Fallback Conversion

Refined from [2026-07-16-battleframe-core-mvp.md](../2026-07-16-battleframe-core-mvp.md).

## Scope

The system's own minimal Actor type (`generic`), its ApplicationV2 sheet, the orphan
detector, and the per-document migration flag plumbing.

**Why `generic` exists — two reasons, both load-bearing:**

1. Battleframe with **no ruleset installed** is still a usable product — a table and a
   ruler. It needs at least one Actor type of its own to put a token on that table.
2. It is the **landing pad** when a ruleset module is disabled. Per
   `vault/foundry-systems/module-subtypes-vanish-when-the-module-is-disabled.md`
   (`confidence: confirmed`): when a module providing a subtype is deactivated, documents of
   its subtypes become **invalid and disappear from the UI**. The data is not destroyed —
   reactivating restores it — but *to a user this looks exactly like data loss.* That note
   also records the official recommendation: modules should "provide conversion functionality
   to convert documents to system-provided sub-types before users disable your module."
   `generic` is the target of that conversion.

**The orphan case is the interesting half of this sub-spec.** Its requirements, in order of
importance:

- **Warn loudly.** Name the module and the count. Silence here is the worst outcome — the
  GM concludes their army is gone.
- **Offer conversion.** Do not perform it.
- **Preserve the original payload** in `flags.battleframe.orphanedFrom` so conversion is
  **reversible**. Nothing is destroyed, ever.
- **Never auto-convert. Never silently drop.** The GM decides. This is the master spec's
  Edge Cases table verbatim: *"Warn loudly, name the module, offer conversion, preserve the
  payload. Never auto-convert."*

**Migration flag plumbing — scope is deliberately narrow.** Stamp and read
`flags.battleframe.schemaVersion` on every Actor at create time. That is all. **No migration
runner** — it is backlogged to `docs/backlog/battleframe-migration-runner.md`. The plumbing
lands now because *stamping documents from day one is the part that is expensive to
retrofit*; the runner is not. Version is **per-document, never a world setting**, because
Battleframe documents arrive from ruleset compendia at arbitrary versions and a single
world-level number cannot describe that
(`vault/foundry-systems/version-tracking-for-migrations-has-no-standard.md`,
`confidence: confirmed`).

**Greenfield.** All six files are new. There is no existing Battleframe code to match.

<!-- Spec gap, non-blocking: master SS-08 requires GenericActorData but does not enumerate
     its schema fields. This phase spec commits to a deliberately minimal schema
     (description, notes) per the master's "Simple over flexible" preference and the
     "a table and a ruler" framing of the zero-ruleset state. Not a change to the master —
     an addition, because the Completeness Checklist is unimplementable without it. If a
     reviewer wants more fields, that is a master-spec decision, not a worker's. -->

<!-- Criterion note, not a change: "[STRUCTURAL] Every Actor created or imported is stamped
     with flags.battleframe.schemaVersion (the stamping package's own version)". Note this
     stamps the *core system* version for Actors core creates. A ruleset module creating its
     own subtype documents stamps its own version under its own flag scope. Core cannot
     stamp on a ruleset's behalf without knowing the ruleset — which would break neutrality.
     Preserved verbatim; flagged so a worker does not over-reach into ruleset territory. -->

## Interface Contracts

### Provides

- `GenericActorData` class extending `foundry.abstract.TypeDataModel`, registered at `init`
  as `CONFIG.Actor.dataModels.generic`.
- `BattleframeActor` document class (`documents/actor.ts`) — hosts the create-time
  `schemaVersion` stamp. Registered via `CONFIG.Actor.documentClass`.
- `GenericActorSheet` — ApplicationV2 sheet, registered through
  `foundry.applications.apps.DocumentSheetConfig` for type `generic`.
- `getSchemaVersion(doc): string | null` — returns `null` for a document with **no** flag.
  Never assume current.
- `setSchemaVersion(doc, v): Promise<void>` — writes `flags.battleframe.schemaVersion`.
- `findOrphanedActors(): OrphanReport[]` — pure, testable; returns orphans grouped by the
  disabled package that owned them.
- `convertOrphanToGeneric(actor): Promise<Actor>` — converts one Actor to `generic`, writing
  `flags.battleframe.orphanedFrom`. Called only from the GM's explicit confirmation.
- `packages/battleframe/templates/generic-actor-sheet.hbs`.
- Consumed by: SS-10 (module registration coexists with `generic`), SS-12 (init wiring,
  orphan-warning integration test).

### Requires

- **From SS-05:** the ruleset registry (`packages/battleframe/src/rulesets/registry.ts`,
  `types.ts`) and the hooks module (`packages/battleframe/src/hooks/index.ts`).
  `orphan-check.ts` lives in `src/rulesets/` alongside the registry and shares its notion of
  a ruleset package id.
- **From SS-02 (transitively, via SS-05):** the monorepo scaffold; `system.json` already
  declares `documentTypes.Actor.generic` — **that declaration is SS-02's, not this
  sub-spec's.** This sub-spec supplies the *runtime class*. Both halves are required: the
  subtype **name** in the manifest, the **class** at `init`
  (`vault/foundry-systems/document-subtypes-must-be-declared-statically-in-the-manifest.md`).
- **From SS-12:** `game.battleframe` construction and `init`-order wiring. SS-08 exports
  registration functions; SS-12 calls them.
- **From Foundry v14 runtime:** `foundry.abstract.TypeDataModel`, `foundry.data.fields.*`,
  `CONFIG.Actor.dataModels`, `foundry.applications.sheets.ActorSheetV2`,
  `foundry.applications.api.HandlebarsApplicationMixin`,
  `foundry.applications.apps.DocumentSheetConfig`, `foundry.documents.collections.Actors`.
  Under Vitest these are absent — `orphan-check.test.ts` mocks them.

### Shared State

- `CONFIG.Actor.dataModels` — a **plain mutable object**; SS-08 writes `.generic`, SS-10
  writes `["battleframe-greathelm.knight"]`. Per
  `vault/foundry-systems/registering-a-typedatamodel-at-init.md` (`confidence: confirmed`),
  a module writes into it "without the system's permission or cooperation". Use assignment on
  distinct keys; never replace the object wholesale.
- `flags.battleframe.*` on Actor documents — the `schemaVersion` and `orphanedFrom` keys are
  owned here. `flags.battleframe.base` on Tokens belongs to SS-03; `flags.battleframe.order`
  on Combat belongs to SS-06. Distinct documents, no collision.
- `packages/battleframe/templates/` — SS-07 and SS-09 also add `.hbs` files. No overlap.
- `packages/battleframe/lang/en.json` — append `BATTLEFRAME.Orphan.*` and
  `TYPES.Actor.generic` keys.

## Implementation Steps

### Step 1: Write failing test — schema version flag plumbing

- **File:** `packages/battleframe/tests/orphan-check.test.ts`
- **Test name:** `getSchemaVersion returns null for an unversioned document`
- **Asserts:** `getSchemaVersion({flags: {}})` returns `null` — **not** the current version,
  **not** `"0.0.0"`. An unversioned document is unversioned; assuming current is how a
  migration silently skips a compendium import. Also: `getSchemaVersion` reads a present flag
  correctly; `setSchemaVersion(doc, v)` calls `doc.setFlag("battleframe", "schemaVersion", v)`.
- **Run:** `npm test -- orphan-check`
- **Expected:** FAIL — module not found.

### Step 2: Implement the flag plumbing

- **File:** `packages/battleframe/src/documents/actor.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Follow the **CSB per-document approach**
  recorded in `vault/foundry-systems/version-tracking-for-migrations-has-no-standard.md`
  (`confidence: confirmed`): `actor.getFlag(game.system.id, 'version')` /
  `await document.setFlag(game.system.id, 'version', v)`. Battleframe's flag key is
  `schemaVersion`, scope `battleframe`. That note ranks the per-document approach "the most
  robust and the most relevant to Battleframe". Do **not** copy dnd5e's world-setting
  approach or pf2e's `worldSchemaVersion` setting — both are explicitly rejected here.
- **Changes:** export `getSchemaVersion(doc)` and `setSchemaVersion(doc, v)`. Define
  `BattleframeActor extends Actor` overriding the pre-create path so **every Actor created or
  imported** is stamped with the stamping package's own version. Export a registration
  function that assigns `CONFIG.Actor.documentClass`; SS-12 calls it.

### Step 3: Verify test passes

- **Run:** `npm test -- orphan-check`
- **Expected:** PASS — Step 1's test.

### Step 4: Write failing test — orphan detection, all three cases

- **File:** `packages/battleframe/tests/orphan-check.test.ts`
- **Test names:**
  - `findOrphanedActors returns empty when every actor's type has a live provider`
  - `findOrphanedActors finds a single orphan and names its package`
  - `findOrphanedActors groups orphans from two different disabled modules separately`
- **Asserts:** each report carries `packageId`, `packageTitle`, `count`, and the orphaned
  `actorIds`. The two-module case returns **two** reports, not one merged one — the master
  spec requires the warning to *name the module*, which a merged report cannot do. Zero
  orphans returns `[]` and fires no warning at all.
- **Run:** `npm test -- orphan-check`
- **Expected:** FAIL — `findOrphanedActors` is not exported.

### Step 5: Implement orphan detection

- **File:** `packages/battleframe/src/rulesets/orphan-check.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Ground detection in
  `vault/foundry-systems/hastypedata-and-modelprovider-subtype-utilities.md`
  (`confidence: confirmed`): `doc.system.modelProvider` "returns the System or Module
  instance that provides this document's subtype, or `null` if none applies" and is
  described there as *"the mechanism by which a ruleset-neutral system can ask 'which ruleset
  owns this actor?' without maintaining its own registry."* That is exactly this problem.
  A `null` provider on a document whose `type` carries a package-id prefix
  (`vault/foundry-systems/document-subtypes-are-namespaced-by-package-id.md`,
  `confidence: confirmed` — module subtypes are **always** `module-id.subtype`) is an orphan;
  the prefix names the module even though the module is gone.
  **Caveat, respect it:** the disabled-module note is confirmed on the *behaviour* (documents
  become invalid and disappear) but does **not** state whether an invalid document is still
  reachable via `game.actors` or only via `game.actors.invalidDocumentIds`. **Not found in
  the vault.** Implement against both reachable sets and let the live world settle it; if
  Foundry contradicts a note, the master spec's rule applies — stop, correct the note,
  continue.
- **Changes:** export `findOrphanedActors(): OrphanReport[]`. Pure over an injectable actor
  collection so it is unit-testable without booting Foundry. Group by `packageId`.

### Step 6: Verify tests pass

- **Run:** `npm test -- orphan-check`
- **Expected:** PASS.

### Step 7: Write failing test — conversion preserves the payload and is reversible

- **File:** `packages/battleframe/tests/orphan-check.test.ts`
- **Test names:**
  - `convertOrphanToGeneric writes the original packageId, type, and system payload to flags.battleframe.orphanedFrom`
  - `convertOrphanToGeneric never runs without explicit confirmation`
  - `the ready-time orphan check never mutates an actor`
- **Asserts:** after conversion, `flags.battleframe.orphanedFrom` deep-equals
  `{packageId, type, system}` where `system` is the **complete original payload**, byte-for-byte
  — enough to reverse the conversion. Asserts the ready-time detection path performs **zero**
  writes: no `update`, no `setFlag`, no `delete` on any actor. Asserts the warning is emitted
  with the module name and count and that conversion is a separate, GM-initiated call.
- **Run:** `npm test -- orphan-check`
- **Expected:** FAIL — `convertOrphanToGeneric` is not exported.

### Step 8: Implement conversion and the loud warning

- **File:** `packages/battleframe/src/rulesets/orphan-check.ts`
- **Action:** modify
- **Changes:** export `convertOrphanToGeneric(actor)` — capture `{packageId, type, system}`
  **before** any write, set `flags.battleframe.orphanedFrom`, then change `type` to `generic`.
  Export a `ready`-hook handler that runs `findOrphanedActors()`, and for each report warns
  the GM **loudly** — naming `packageTitle`/`packageId` and `count` — and offers conversion
  behind an explicit confirmation. **No auto-convert. No silent drop.** The handler is
  GM-only. If detection finds nothing, it is silent.

### Step 9: Verify tests pass

- **Run:** `npm test -- orphan-check`
- **Expected:** PASS — all orphan tests.

### Step 10: Implement `GenericActorData`

- **File:** `packages/battleframe/src/data/generic-actor.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Follow
  `vault/foundry-systems/typedatamodel-defineschema-and-data-preparation.md`
  (`confidence: confirmed`) — `static defineSchema()` returning
  `foundry.data.fields.*` instances; extend `foundry.abstract.TypeDataModel`, **never bare
  `DataModel`** (that note and the master spec's Musts are both explicit). Register per
  `vault/foundry-systems/registering-a-typedatamodel-at-init.md` (`confidence: confirmed`) —
  a **system**-provided type takes **no package prefix** — use `CONFIG.Actor.dataModels.generic`,
  not `"battleframe.generic"`.
- **Changes:** implement the schema in the Completeness Checklist below. Keep it minimal —
  the zero-ruleset product state is "a table and a ruler", not a character sheet. **Do not add
  an `ObjectField` free-form payload:** `vault/foundry-systems/objectfield-as-a-freeform-system-data-escape-hatch.md`
  is `confidence: unverified` and self-flags that nested contents may bypass `htmlFields`
  sanitisation — a real security consideration. The orphan payload lives in **flags**, which
  need no schema, so no `ObjectField` is required here. Export a registration function; SS-12
  calls it at `init`.

### Step 11: Implement the sheet

- **File:** `packages/battleframe/src/applications/generic-actor-sheet.ts`
- **Action:** create
- **Pattern:** No existing pattern — greenfield. Follow
  `vault/foundry-systems/applicationv2-sheet-structure.md` (`confidence: confirmed`) exactly:
  the class stack is `foundry.applications.sheets.ActorSheetV2` →
  `foundry.applications.api.DocumentSheetV2` → `foundry.applications.api.ApplicationV2`,
  mixed with `foundry.applications.api.HandlebarsApplicationMixin`.
  `static DEFAULT_OPTIONS` **auto-merges** up the chain — no `mergeObject` call (that is a V1
  idiom and is wrong here). `static PARTS` — each part returns exactly one top-level element;
  parts are wrapped in `options.tag`, which is **`form` for DocumentSheetV2**.
  `_prepareContext(options)` is async and templates see **only** what it returns.
  Registration namespaces per `vault/foundry-systems/v13-v14-sheet-registration-namespaces.md`
  (`confidence: confirmed`) — **the globals moved in v14**; bare `Actors` and bare
  `DocumentSheetConfig` no longer exist:
  `foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet)`
  (ApplicationV1 is **not removed**, just relocated to `foundry.appv1.sheets.*`), then
  `foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, game.system.id, GenericActorSheet, {types: ["generic"], makeDefault: true})`.
  Signature: `(documentClass, packageId, sheetClass, {types, makeDefault})`. Pass
  `game.system.id`, not a hardcoded `"battleframe"` — the note confirms this "survives
  forks/renames".
- **Changes:** implement `GenericActorSheet`. The sheet must render an orphan-provenance
  notice when `flags.battleframe.orphanedFrom` is present — an actor converted from a
  disabled ruleset must **say so on its own sheet**, or the GM has no path back.

### Step 12: Implement the sheet template

- **File:** `packages/battleframe/templates/generic-actor-sheet.hbs`
- **Action:** create
- **Changes:** minimal: name, description, notes, and the orphan-provenance block
  (`orphanedFrom.packageId` and `orphanedFrom.type`) when present. Read only from
  `_prepareContext`'s returned context. Mind the gotcha the confirmed ApplicationV2 note
  calls out: `{{system.x}}` reads the **context**, `name="system.x"` writes the **document
  path** — they merely tend to coincide.

### Step 13: Add localisation keys

- **File:** `packages/battleframe/lang/en.json`
- **Action:** modify
- **Changes:** add `TYPES.Actor.generic` and `BATTLEFRAME.Orphan.*` keys — the warning text
  must name the module and count via interpolation, not a generic string. Append only.

### Step 14: Verify build and full test suite

- **Run:** `npm run build && npm test -- orphan-check`
- **Expected:** both exit 0.

### Step 15: Commit

- **Stage:** `git add packages/battleframe/src/data/generic-actor.ts packages/battleframe/src/documents/actor.ts packages/battleframe/src/applications/generic-actor-sheet.ts packages/battleframe/templates/generic-actor-sheet.hbs packages/battleframe/src/rulesets/orphan-check.ts packages/battleframe/tests/orphan-check.test.ts packages/battleframe/lang/en.json`
- **Message:** `feat: generic Actor type, orphan detection and conversion, schema version plumbing`

## Acceptance Criteria

Preserved verbatim from master spec SS-08.

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
- `[STRUCTURAL]` **Migration flag plumbing exists.** Every Actor created or imported is
  stamped with `flags.battleframe.schemaVersion` (the stamping package's own version) at
  create time.
- `[STRUCTURAL]` `getSchemaVersion(doc)` / `setSchemaVersion(doc, v)` are exported and
  unit-tested, including a document with **no** flag (treat as unversioned — never assume
  current).
- `[MECHANICAL]` `grep -rn "schemaVersion" packages/battleframe/src/settings/` returns
  nothing — version is **per-document**, never a world setting. Documents arrive from
  ruleset compendia at arbitrary versions and a world-level number cannot describe that.
- `[STRUCTURAL]` Orphan conversion writes the original payload to
  `flags.battleframe.orphanedFrom = {packageId, type, system}` so nothing is destroyed and
  the conversion is reversible.

## Completeness Checklist

**Every field below must be implemented. No silent omissions.** This is the enumeration the
master spec's SS-08 depends on — a missing field here is a data-loss bug, not a cosmetic gap.

### `GenericActorData` — `defineSchema()` return, `CONFIG.Actor.dataModels.generic`

Deliberately minimal. The zero-ruleset product state is a table and a ruler.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `description` | `foundry.data.fields.HTMLField({required: false, blank: true})` | optional | `generic-actor-sheet.hbs`. **Must be mirrored in `system.json`'s `htmlFields` for `generic`** so the server sanitizes it — per the confirmed TypeDataModel note. SS-02 owns `system.json`; if the key is absent, add it |
| `notes` | `foundry.data.fields.StringField({required: false, blank: true})` | optional | `generic-actor-sheet.hbs` — GM free text |

- **Base class:** `foundry.abstract.TypeDataModel`. **Never bare `DataModel`** — master spec
  Musts, and the confirmed registration note is explicit.
- **Registration key:** `generic` — **no package prefix.** System-provided subtypes are not
  prefixed; only module subtypes are (`document-subtypes-are-namespaced-by-package-id`).
- **No `ObjectField` free-form payload.** See Step 10 — the supporting note is `unverified`
  and the orphan payload lives in flags, which need no schema.

### `flags.battleframe.orphanedFrom` — written by `convertOrphanToGeneric`

Every field required. This object **is** the reversibility guarantee.

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `packageId` | `string` — the disabled module's id, e.g. `"battleframe-greathelm"` | required | The warning text; the sheet's provenance notice; reversal |
| `type` | `string` — the **full prefixed** original subtype, e.g. `"battleframe-greathelm.knight"`. Not the bare `"knight"` | required | Reversal — restoring the wrong type name silently recreates the orphan |
| `system` | `object` — the **complete, unmodified** original `system` payload | required | Reversal. **Capture before any write.** Truncating or normalising this destroys data the master spec guarantees is preserved |

- Flag scope: `battleframe`. Full path: `actor.flags.battleframe.orphanedFrom`.
- Written **only** by `convertOrphanToGeneric`, **only** after explicit GM confirmation.

### `flags.battleframe.schemaVersion` — stamped by `BattleframeActor` at create

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `flags.battleframe.schemaVersion` | `string` (semver, the stamping package's own version) | required at create time | `getSchemaVersion` / `setSchemaVersion`; the backlogged migration runner |

- `getSchemaVersion(doc)` returns `string | null`. **`null` when the flag is absent.**
  An unversioned document is unversioned — never coerce to the current version, never to
  `"0.0.0"`.
- `setSchemaVersion(doc, v)` writes the flag.
- **Never a world setting.** `grep -rn "schemaVersion" packages/battleframe/src/settings/`
  must return nothing.

### `OrphanReport` — returned by `findOrphanedActors()`

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `packageId` | `string` | required | Warning text — the master spec requires naming the module |
| `packageTitle` | `string` (falls back to `packageId` when the manifest is unreachable) | required | Human-readable warning text |
| `count` | `number` | required | Warning text — the master spec requires naming the count |
| `actorIds` | `string[]` | required | Conversion targets |

- **One report per disabled package.** Two disabled modules → **two** reports. Never merged.

### Limits and boundaries

- Orphan reports for zero orphans: **`[]`**, and **zero** warnings emitted. Silence is
  correct only when there is nothing to say.
- Actor mutations performed by the `ready`-time detection path: **exactly 0**.
- Auto-conversions: **exactly 0**. Silent drops: **exactly 0**.
- `schemaVersion` world settings: **exactly 0**.
- Test cases required by the master spec: **3** — no orphans, one orphan, orphans from two
  different disabled modules.

## Verification Commands

- **Build:** `npm run build`
- **Tests:** `npm test -- orphan-check`
- **Acceptance:**
  - `[STRUCTURAL]` `TypeDataModel` base + `CONFIG.Actor.dataModels.generic` — greps in Checks.
  - `[STRUCTURAL]` ApplicationV2 sheet namespaces — greps in Checks.
  - `[MECHANICAL]` `npm test -- orphan-check` — three required cases.
  - `[STRUCTURAL]` flag plumbing, `getSchemaVersion`/`setSchemaVersion`, `orphanedFrom`
    shape — greps in Checks plus the unit tests.
  - `[MECHANICAL]` no `schemaVersion` in `src/settings/` — grep in Checks.
  - `[BEHAVIORAL]` orphan warning at `ready`, conversion offer, no auto-convert — unit tests
    (Steps 4–9) plus SS-12's integration criterion: *"Disabling `battleframe-greathelm`
    leaves the world loadable, with the orphan warning from SS-08 firing rather than a
    crash."* Final proof is the master spec's Verification step 10 in a live Foundry v14.

## Checks

Generated from `[MECHANICAL]` and `[STRUCTURAL]` criteria only. `[BEHAVIORAL]` criteria are
excluded by design. Each command exits 0 on pass, 1 with a one-line summary on fail.

| Criterion | Type | Command |
|---|---|---|
| `GenericActorData` extends `foundry.abstract.TypeDataModel`, not bare `DataModel` | STRUCTURAL | `f=packages/battleframe/src/data/generic-actor.ts; if ! grep -qE "extends[[:space:]]+foundry\.abstract\.TypeDataModel" "$f" 2>/dev/null; then echo "FAIL: $f does not extend foundry.abstract.TypeDataModel"; exit 1; fi; if grep -qE "extends[[:space:]]+(foundry\.abstract\.)?DataModel\b" "$f" 2>/dev/null; then echo "FAIL: $f extends bare DataModel — must be TypeDataModel"; exit 1; fi; exit 0` |
| Registered at `init` via `CONFIG.Actor.dataModels.generic` | STRUCTURAL | `if ! grep -rqE "CONFIG\.Actor\.dataModels(\.generic\b\|\[[\"']generic[\"']\])" packages/battleframe/src/ 2>/dev/null; then echo "FAIL: CONFIG.Actor.dataModels.generic registration not found in packages/battleframe/src/"; exit 1; fi; exit 0` |
| System subtype is unprefixed (`generic`, not `battleframe.generic`) | STRUCTURAL | `if grep -rqE "[\"']battleframe\.generic[\"']" packages/battleframe/src/ 2>/dev/null; then echo "FAIL: system-provided subtype must be unprefixed 'generic', not 'battleframe.generic'"; exit 1; fi; exit 0` |
| Sheet uses `ActorSheetV2` + `HandlebarsApplicationMixin` | STRUCTURAL | `f=packages/battleframe/src/applications/generic-actor-sheet.ts; if ! grep -q "foundry.applications.sheets.ActorSheetV2" "$f" 2>/dev/null; then echo "FAIL: $f does not use foundry.applications.sheets.ActorSheetV2"; exit 1; fi; if ! grep -q "HandlebarsApplicationMixin" "$f" 2>/dev/null; then echo "FAIL: $f does not use HandlebarsApplicationMixin"; exit 1; fi; exit 0` |
| Sheet registered through `foundry.applications.apps.DocumentSheetConfig` | STRUCTURAL | `if ! grep -rq "foundry.applications.apps.DocumentSheetConfig" packages/battleframe/src/ 2>/dev/null; then echo "FAIL: sheet not registered via foundry.applications.apps.DocumentSheetConfig"; exit 1; fi; exit 0` |
| v14 namespaces only — no bare `Actors`/`DocumentSheetConfig` globals | STRUCTURAL | `if grep -rnE "(^\|[^.[:alnum:]_])(Actors\.(un)?registerSheet\|DocumentSheetConfig\.(un)?registerSheet)" packages/battleframe/src/ >/dev/null 2>&1; then echo "FAIL: bare Actors/DocumentSheetConfig global used — v14 moved these to foundry.documents.collections.* / foundry.applications.apps.*"; exit 1; fi; exit 0` |
| ApplicationV2 only — no ApplicationV1 sheet classes extended | STRUCTURAL | `if grep -rnE "extends[[:space:]]+(foundry\.appv1\.sheets\.)?ActorSheet\b" packages/battleframe/src/ >/dev/null 2>&1; then echo "FAIL: an ApplicationV1 ActorSheet is extended — ApplicationV2 only"; exit 1; fi; exit 0` |
| Migration flag plumbing exists — `schemaVersion` stamped at create | STRUCTURAL | `if ! grep -rq "schemaVersion" packages/battleframe/src/documents/actor.ts 2>/dev/null; then echo "FAIL: packages/battleframe/src/documents/actor.ts does not stamp flags.battleframe.schemaVersion"; exit 1; fi; exit 0` |
| `getSchemaVersion` / `setSchemaVersion` are exported | STRUCTURAL | `f=packages/battleframe/src/documents/actor.ts; for fn in getSchemaVersion setSchemaVersion; do grep -qE "export[[:space:]]+(async[[:space:]]+)?function[[:space:]]+$fn\b" "$f" 2>/dev/null \|\| { echo "FAIL: $fn is not exported from $f"; exit 1; }; done; exit 0` |
| `grep -rn "schemaVersion" packages/battleframe/src/settings/` returns nothing | MECHANICAL | `if [ ! -d packages/battleframe/src/settings ]; then exit 0; fi; if grep -rn "schemaVersion" packages/battleframe/src/settings/ >/dev/null 2>&1; then echo "FAIL: schemaVersion found in src/settings/ — version is per-document, never a world setting"; exit 1; fi; exit 0` |
| Orphan conversion writes `flags.battleframe.orphanedFrom = {packageId, type, system}` | STRUCTURAL | `f=packages/battleframe/src/rulesets/orphan-check.ts; grep -q "orphanedFrom" "$f" 2>/dev/null \|\| { echo "FAIL: $f does not write flags.battleframe.orphanedFrom"; exit 1; }; for k in packageId type system; do grep -q "$k" "$f" 2>/dev/null \|\| { echo "FAIL: orphanedFrom payload is missing the '$k' field in $f — conversion would not be reversible"; exit 1; }; done; exit 0` |
| `npm test -- orphan-check` passes | MECHANICAL | `npm test -- orphan-check > /dev/null 2>&1 \|\| { echo "FAIL: npm test -- orphan-check did not pass"; exit 1; }; exit 0` |
| Core stays ruleset-ignorant | STRUCTURAL | `if grep -rni "greathelm" packages/battleframe/src/ >/dev/null 2>&1; then echo "FAIL: core references greathelm — orphan handling must be generic over any disabled package"; exit 1; fi; exit 0` |
| `npm run build` exits 0 | MECHANICAL | `npm run build > /dev/null 2>&1 \|\| { echo "FAIL: npm run build did not exit 0"; exit 1; }; exit 0` |

## Patterns to Follow

**No existing codebase — greenfield.** All six files are new. The references below are
**research notes tracked in git**, not code. Read them before writing. The master spec ranks
*"Confirmed research over recollection"* third in its trade-off hierarchy for a specific
reason: **Foundry's API changed heavily v10→v14 and remembered idioms are usually stale.**
Every namespace in this sub-spec is one of the ~40 globals v14 relocated.

- `vault/foundry-systems/applicationv2-sheet-structure.md` (`confidence: confirmed`):
  the class stack, `DEFAULT_OPTIONS` auto-merge (no `mergeObject` — that is V1), `PARTS`
  wrapped in `form` for DocumentSheetV2, async `_prepareContext`, and the
  context-vs-document-path gotcha. dnd5e is named there as the v14 reference implementation.
- `vault/foundry-systems/v13-v14-sheet-registration-namespaces.md` (`confidence: confirmed`):
  **the globals moved.** `foundry.documents.collections.Actors` / `.Items`;
  `foundry.applications.apps.DocumentSheetConfig`; `foundry.appv1.sheets.*` for V1 sheets
  (ApplicationV1 is **relocated, not removed** — you unregister core's V1 sheet from there).
  Signature `(documentClass, packageId, sheetClass, {types, makeDefault})`; pass
  `game.system.id` as `packageId`.
- `vault/foundry-systems/typedatamodel-defineschema-and-data-preparation.md`
  (`confidence: confirmed`): `defineSchema()` shape, `foundry.data.fields.*`, `TypeDataModel`
  over bare `DataModel`, and the `htmlFields`/`filePathFields` manifest-mirroring rule.
- `vault/foundry-systems/registering-a-typedatamodel-at-init.md` (`confidence: confirmed`):
  `CONFIG.Actor.dataModels` is a plain mutable object written at `init`; system types are
  unprefixed.
- `vault/foundry-systems/module-subtypes-vanish-when-the-module-is-disabled.md`
  (`confidence: confirmed`): **the orphan case.** Documents become invalid and disappear;
  data is not destroyed; the docs recommend shipping a converter. Note its honest framing —
  *"Uninstalling a ruleset looks like data loss to a user, even though it isn't."* That
  sentence is why the warning must be loud.
- `vault/foundry-systems/hastypedata-and-modelprovider-subtype-utilities.md`
  (`confidence: confirmed`): `doc.system.modelProvider` → the providing System/Module or
  `null`. The detection mechanism.
- `vault/foundry-systems/document-subtypes-are-namespaced-by-package-id.md`
  (`confidence: confirmed`): module subtypes are always `module-id.subtype` — the prefix
  names the disabled module even after it is gone.
- `vault/foundry-systems/version-tracking-for-migrations-has-no-standard.md`
  (`confidence: confirmed`): **there is no core convention.** Copy **CSB's per-document
  flags**, not dnd5e's world setting and not pf2e's `worldSchemaVersion`. The note's own
  verdict: per-document "is the most robust and the most relevant to Battleframe" because
  "Battleframe's documents arrive from ruleset module compendia at arbitrary versions — a
  world flag cannot express that." Its pf2e snippet is flagged **partial** for v14 currency —
  do not copy that code.
- `vault/foundry-systems/objectfield-as-a-freeform-system-data-escape-hatch.md`
  (`confidence: unverified`): **do not rely on this.** It self-flags that `ObjectField`'s
  round-trip and sanitisation behaviour are unconfirmed. Not needed here — the orphan payload
  lives in flags.
- `vault/foundry-systems/v14-breaking-changes-that-matter.md` (`confidence: confirmed`):
  why every bare global in an old tutorial is wrong now.

## Files

Every path in this sub-spec is new. `will-create:` marks paths the spec-reality-gate must
not existence-check.

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe/src/data/generic-actor.ts` | Create | `GenericActorData extends foundry.abstract.TypeDataModel`; `defineSchema()`; registered as `CONFIG.Actor.dataModels.generic` |
| `will-create: packages/battleframe/src/documents/actor.ts` | Create | `BattleframeActor`; create-time `flags.battleframe.schemaVersion` stamp; `getSchemaVersion` / `setSchemaVersion` |
| `will-create: packages/battleframe/src/applications/generic-actor-sheet.ts` | Create | ApplicationV2 sheet — `ActorSheetV2` + `HandlebarsApplicationMixin`, registered via `foundry.applications.apps.DocumentSheetConfig` |
| `will-create: packages/battleframe/templates/generic-actor-sheet.hbs` | Create | Sheet template: description, notes, and the `orphanedFrom` provenance notice |
| `will-create: packages/battleframe/src/rulesets/orphan-check.ts` | Create | `findOrphanedActors()`, `convertOrphanToGeneric()`, and the GM-only `ready` warning. No auto-convert |
| `will-create: packages/battleframe/tests/orphan-check.test.ts` | Create | Test file — flag plumbing, three orphan cases, payload preservation, zero-mutation detection |
| `packages/battleframe/lang/en.json` | Modify | Append `TYPES.Actor.generic` and `BATTLEFRAME.Orphan.*` keys. Created by SS-02; also touched by SS-07 and SS-09 |
| `packages/battleframe/system.json` | Modify | Mirror `description` in `htmlFields` for the `generic` subtype, if SS-02 did not. Owned by SS-02 |
