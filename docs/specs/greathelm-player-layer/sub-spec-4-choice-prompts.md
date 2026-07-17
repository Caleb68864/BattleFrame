---
type: phase-spec
master_spec: "docs/specs/2026-07-17-greathelm-player-layer.md"
sub_spec_number: 4
title: "The other two player choices, and the toggles"
date: 2026-07-17
depends_on: ["SS-01", "SS-02"]
---

# Sub-Spec 4: The other two player choices, and the toggles

Refined from [2026-07-17-greathelm-player-layer.md](../2026-07-17-greathelm-player-layer.md).

## Scope

Two QSR-confirmed **player** choices that the MVP defaulted away, restored as prompts, each
behind a world setting:

1. **First-or-second.** QSR p1: the player with the most 6s *chooses* whether to go first or
   second. `resolveFirstPlayer` in `src/ui/round-control.ts` currently takes
   `choice: "first" | "second" = "first"` and its own comment admits the default is an
   **ENGINE DEFAULT** standing in for a human: *"Defaulting is not the same as knowing."*
2. **Which touching enemy to hit.** `findDefenderInBaseContact` in `src/ui/round-control.ts`
   returns the *nearest* enemy inside the contact tolerance and its comment likewise admits:
   *"Which of several touching enemies to hit is the attacker's choice; the nearest … stands
   in for a target picker."*

**`forced-first` is a RULE, not a choice.** When only one player has 6s, that player is
*forced* to go first — the QSR gives them nothing to decide
(`vault/greathelm/initiative-order-determination.md`;
`resolveFirstPlayer` already honours `outcome.result === "forced-first"` unconditionally).
**Do not prompt in that case.** Prompting for a forced outcome invents a choice the rulebook
does not grant, which is the mirror image of defaulting one it does. Likewise: with **exactly
one** enemy in base contact there is no target choice — no prompt.

**The dialog API is unverified.** `grep -rni "DialogV2" vault/` returns **nothing** — no note
at any confidence. This sub-spec therefore feature-detects **exactly as
`resolveConversionPrompt` does** in `packages/battleframe/src/rulesets/orphan-check.ts`: probe
`foundry.applications.api.DialogV2`, fall back to the v1 global `Dialog`, return `null` if
neither resolves, and wrap every call in `try`/`catch`. When nothing resolves, **fall back to
the documented default and log — never block the round.** A round that hangs waiting on a
dialog that does not exist is strictly worse than a round that plays with a stated default.

**Two world settings, both `default: true`.** Asking is the point: a defaulted choice is a
deleted choice, and shipping the toggles off by default would ship the auto-battler again with
extra steps. Each setting's **hint must state its own default behaviour** ("`first`"; "the
first enemy in contact") so a GM who turns it off is making a choice rather than receiving a
surprise.

**Provenance discipline.** Setting *keys* belong in `constants.ts` — they are module
configuration, and `SETTING_MIN_DICE_POOL_FLOOR_ENABLED` is the existing precedent for a
settings key living there. Their **defaults are not rules either**: `"first"` and
"first enemy in contact" have no QSR source. Comment them explicitly as **engine behaviour**,
not rulebook values. Do **not** file `"first"` beside `SPRINT_MOVE_INCHES` as though the
rulebook said it — `constants.ts`'s stated contract is "all GREATHELM numbers live here,
sourced from GREATHELM-QSR.pdf v0.4", and `MAX_INITIATIVE_TIE_REROLLS` /
`BASE_CONTACT_TOLERANCE_PX` are this repo's two standing precedents for keeping a non-rule
constant out of that file.

## Interface Contracts

### Provides

- `promptFirstOrSecond(outcome, options?)`: returns `Promise<"first" | "second">`. Returns
  `"first"` **without prompting** when `outcome.result === "forced-first"`, when the setting is
  off, or when no dialog API resolves (logging in the last case). Feeds
  `RunRoundFromControlOptions.chooseOrder`, the seam that already exists.
- `promptTargetChoice(attacker, candidates, options?)`: returns `Promise<Knight>`. Returns
  `candidates[0]` **without prompting** when `candidates.length <= 1`, when the setting is off,
  or when no dialog API resolves.
- `resolveDialogApi()`: the feature-detection probe, exported so the absent-API path is
  directly testable.
- `SETTING_PROMPT_FIRST_OR_SECOND`, `SETTING_PROMPT_TARGET_CHOICE`: setting keys exported from
  `constants.ts`.
- `registerChoicePromptSettings()`: called from `main.ts`'s `init` hook.

Both prompt functions take injectable seams (the dialog adapter and the settings reader) so
every path is testable headless with no Foundry globals.

### Requires

- **From SS-01:** the session's notion of which enemies are legal clash targets for a given
  die. The prompt **renders a candidate list the session supplied**; it does not compute base
  contact and does not import `isBaseContactDistance`. One source of truth for legality.
- **Existing, unchanged:** `resolveFirstPlayer` and its `InitiativeOutcome` shape from
  `src/ui/round-control.ts` (`result: "tie" | "forced-first" | ...`).

### Shared State

- `packages/battleframe-greathelm/src/constants.ts` — gains two setting-key constants.
- `packages/battleframe-greathelm/src/main.ts` — gains the settings registration call in the
  existing `init` hook, beside `registerGreathelmSettings()`.
- `packages/battleframe-greathelm/lang/en.json` — gains keys under
  `battleframe-greathelm.settings.*` and `battleframe-greathelm.prompts.*`.
- SS-05 wires both prompts into the round; this sub-spec does not modify `round-control.ts`.

## Implementation Steps

### Step 1: Write failing test — first-or-second prompts when the winner may choose

- **File:** `packages/battleframe-greathelm/tests/choice-prompts.test.ts`
- **Test name:** `promptFirstOrSecond asks the winner when the choice is real`
- **Asserts:** With a `choose`-result outcome, the setting on, and a stub dialog adapter, the
  adapter is called **once** and its answer (`"second"`) is returned.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- choice-prompts`
- **Expected:** FAILS — `Cannot find module '../src/ui/choice-prompts'`.

### Step 2: Write failing test — `forced-first` is a rule, so no prompt

- **File:** `packages/battleframe-greathelm/tests/choice-prompts.test.ts`
- **Test name:** `promptFirstOrSecond never prompts on forced-first — it is a rule`
- **Asserts:** With `outcome.result === "forced-first"` and the setting **on**, the dialog
  adapter is called **zero** times and the result is `"first"`. This is the criterion that
  separates restoring a choice from inventing one.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- choice-prompts`
- **Expected:** FAILS.

### Step 3: Write failing test — target prompt with 2+, none with 1

- **File:** `packages/battleframe-greathelm/tests/choice-prompts.test.ts`
- **Test names:** `promptTargetChoice asks when 2+ enemies are in base contact` and
  `promptTargetChoice does not ask when exactly one enemy is in contact`
- **Asserts:** With two session-supplied candidates the adapter is called once and the chosen
  candidate is returned; with one candidate the adapter is called zero times and that candidate
  is returned. The candidate list is **passed in** — the test provides no `measure` API, so an
  implementation that computed contact itself could not run.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- choice-prompts`
- **Expected:** FAILS.

### Step 4: Write failing test — setting off → documented default

- **File:** `packages/battleframe-greathelm/tests/choice-prompts.test.ts`
- **Test name:** `a disabled prompt applies the documented default without asking`
- **Asserts:** With each setting stubbed `false`, no dialog is opened; `promptFirstOrSecond`
  returns `"first"` and `promptTargetChoice` returns `candidates[0]`.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- choice-prompts`
- **Expected:** FAILS.

### Step 5: Write failing test — dialog API absent → default + log, never block

- **File:** `packages/battleframe-greathelm/tests/choice-prompts.test.ts`
- **Test name:** `no dialog API resolves — the default applies, it is logged, and nothing blocks`
- **Asserts:** With a scope carrying neither `foundry.applications.api.DialogV2` nor a global
  `Dialog`, `resolveDialogApi()` returns `null`; both prompts **resolve** (the promise settles —
  assert with a bounded expectation, not a hang), return the documented default, and log via
  `console.warn`. Neither throws.
- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- choice-prompts`
- **Expected:** FAILS.

### Step 6: Add the setting keys to `constants.ts`

- **File:** `packages/battleframe-greathelm/src/constants.ts`
- **Action:** modify
- **Pattern:** Follow `SETTING_MIN_DICE_POOL_FLOOR_ENABLED` — a bare key string constant.
- **Changes:** Add `SETTING_PROMPT_FIRST_OR_SECOND = "promptFirstOrSecond"` and
  `SETTING_PROMPT_TARGET_CHOICE = "promptTargetChoice"`. Above them, a comment stating that
  these are **module configuration keys, not GREATHELM rules**, and that the *behaviour* they
  fall back to (`"first"`; the first enemy in contact) is an **ENGINE DEFAULT with no QSR
  source** — it lives in `choice-prompts.ts` beside the code that applies it, per the
  `MAX_INITIATIVE_TIE_REROLLS` precedent, and must never be presented to a player as a rule.

### Step 7: Implement the dialog probe and both prompts

- **File:** `packages/battleframe-greathelm/src/ui/choice-prompts.ts`
- **Action:** create
- **Pattern:** Follow `resolveConversionPrompt` in
  `packages/battleframe/src/rulesets/orphan-check.ts` **exactly** — probe
  `globalScope.foundry?.applications?.api?.DialogV2`, then `globalScope.Dialog`, return `null`
  if neither is a function, and `try`/`catch` every call with a `console.warn` on failure.
- **Changes:** `resolveDialogApi()` returns an adapter or `null`. `promptFirstOrSecond`
  short-circuits on `forced-first` **before** consulting the setting or the dialog (it is a
  rule; the toggle is irrelevant to it), then on the setting, then on a `null` adapter.
  `promptTargetChoice` short-circuits on `candidates.length <= 1`, then the setting, then a
  `null` adapter. Every user-facing string is an i18n key. Both functions accept injected
  seams for the dialog adapter and the settings reader; the Foundry glue sits at the bottom of
  the file, as in `round-control.ts`.

### Step 8: Register the settings

- **File:** `packages/battleframe-greathelm/src/main.ts`
- **Action:** modify
- **Pattern:** Follow `registerGreathelmSettings()` — `settings.register(MODULE_ID, KEY, {name, hint, scope: "world", config: true, type: Boolean, default})`,
  called from the existing `Hooks.once("init", ...)`.
- **Changes:** Register both keys with `scope: "world"`, `config: true`, `type: Boolean`,
  **`default: true`**. Comment that `true` is deliberate: asking is the point, and the MVP's
  silent defaults are the bug being fixed.

### Step 9: Add the i18n keys

- **File:** `packages/battleframe-greathelm/lang/en.json`
- **Action:** modify
- **Changes:** Add `settings.promptFirstOrSecond.{name,hint}` and
  `settings.promptTargetChoice.{name,hint}`, plus every `prompts.*` key the dialogs render.
  **Each hint states its own default behaviour** — e.g. "When off, the initiative winner
  always goes **first**." and "When off, the **first enemy in base contact** is attacked."
  Three keys shipped missing on the knight sheet last time and rendered as raw keys while
  every test passed; the Step 10 check is what prevents a fourth.

### Step 10: Verify tests and the i18n gate

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm test -- choice-prompts`, then the
  i18n check under **Checks** (C5).
- **Expected:** tests PASS covering prompt shown, prompt disabled → default, `forced-first` →
  no prompt, single enemy → no prompt, dialog API absent → default + log. C5 exits 0.

### Step 11: Full build and suite

- **Run:** `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1; echo $?`
  then `cd "$(git rev-parse --show-toplevel)" && npm test`
- **Expected:** build exits 0 (typechecks first — redirect, never pipe to `tail`/`head`); the
  suite passes with **no regression** from the 218 currently-passing tests. Never run two
  vitest processes concurrently.

### Step 12: Commit

- **Stage:** `git add packages/battleframe-greathelm/src/ui/choice-prompts.ts packages/battleframe-greathelm/tests/choice-prompts.test.ts packages/battleframe-greathelm/src/constants.ts packages/battleframe-greathelm/src/main.ts packages/battleframe-greathelm/lang/en.json`
- **Message:** `feat: the other two player choices, and the toggles`

## Acceptance Criteria

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

**Decisions (SS-04):** Settings keys live in `constants.ts` (they are module configuration,
not GREATHELM rules) but their **defaults are not rules either** — comment them as engine
behaviour. Do not file `"first"` beside `SPRINT_MOVE_INCHES`.

## Checks

Mechanical and structural criteria only, as runnable commands from the repo root.

| # | Criterion | Command | Passes when |
|---|---|---|---|
| C1 | Choice-prompt tests pass (all five cases) | `cd "$(git rev-parse --show-toplevel)" && npm test -- choice-prompts` | exit 0 |
| C2 | Two settings registered under `MODULE_ID` | `[ "$(grep -c "settings.register(MODULE_ID, SETTING_PROMPT_" packages/battleframe-greathelm/src/main.ts)" = "2" ]` | exit 0 |
| C3 | Both default to `true` | `[ "$(grep -A8 "SETTING_PROMPT_FIRST_OR_SECOND\|SETTING_PROMPT_TARGET_CHOICE" packages/battleframe-greathelm/src/main.ts \| grep -c "default: true")" = "2" ]` | exit 0 |
| C4 | Dialog API feature-detected, both candidates probed | `[ -n "$(grep -n "applications?.api?.DialogV2" packages/battleframe-greathelm/src/ui/choice-prompts.ts)" ] && [ -n "$(grep -n "Dialog?." packages/battleframe-greathelm/src/ui/choice-prompts.ts)" ]` | exit 0 |
| C5 | Every referenced i18n key exists in `lang/en.json` | `for k in $(grep -ohE "battleframe-greathelm\.[A-Za-z0-9._]+" packages/battleframe-greathelm/src/ui/choice-prompts.ts packages/battleframe-greathelm/src/main.ts \| sort -u); do node -e 'const k=process.argv[1].split(".").slice(1);let v=require("./packages/battleframe-greathelm/lang/en.json")["battleframe-greathelm"];for(const p of k){v=v?.[p];}if(v===undefined){console.error("MISSING "+process.argv[1]);process.exit(1);}' "$k" \|\| exit 1; done` | exit 0 |
| C6 | No duplicated contact predicate | `[ -z "$(grep -rnE "isBaseContactDistance\|measure\.between\|=== 0" packages/battleframe-greathelm/src/ui/choice-prompts.ts)" ]` | exit 0 |
| C7 | The default is not filed as a rule | `[ -z "$(grep -n "\"first\"" packages/battleframe-greathelm/src/constants.ts)" ]` | exit 0 |
| C8 | Build typechecks | `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1` | exit 0 |

`[ -z "$(...)" ]` is mandatory for every negative check. `grep -c X` **exits 1 when it matches
nothing** — it fails exactly when the criterion is satisfied. That inversion existed in nine
criteria on this project and deferred a sub-spec. C2/C3 compare a count to an expected value
via `[ "$(...)" = "N" ]` rather than relying on grep's exit code, for the same reason.

## Completeness Checklist

World settings — every field required by `settings.register`:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `name` | i18n key `battleframe-greathelm.settings.promptFirstOrSecond.name` | required | Foundry settings UI |
| `hint` | i18n key `...promptFirstOrSecond.hint` — **must state the default: "first"** | required | Foundry settings UI; AC "stated in the settings hint" |
| `scope` | `"world"` | required | shared state; GM-owned |
| `config` | `true` | required | visible in the settings menu |
| `type` | `Boolean` | required | Foundry |
| `default` | `true` | required | AC "both `default: true`" |
| `name` | i18n key `battleframe-greathelm.settings.promptTargetChoice.name` | required | Foundry settings UI |
| `hint` | i18n key `...promptTargetChoice.hint` — **must state the default: first enemy in contact** | required | Foundry settings UI |
| `scope` | `"world"` | required | shared state |
| `config` | `true` | required | settings menu |
| `type` | `Boolean` | required | Foundry |
| `default` | `true` | required | AC |

`constants.ts` additions:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `SETTING_PROMPT_FIRST_OR_SECOND` | `string` = `"promptFirstOrSecond"` | required | `main.ts`, `choice-prompts.ts` |
| `SETTING_PROMPT_TARGET_CHOICE` | `string` = `"promptTargetChoice"` | required | `main.ts`, `choice-prompts.ts` |

`DialogAdapter` — the feature-detected surface:

| Field | Type | Required | Used By |
|-------|------|----------|---------|
| `choose` | `(options: {title: string; content: string; buttons: {label: string; value: string}[]}) => Promise<string \| null>` | required | both prompts |

Limits and boundaries:

- **`forced-first` prompts: exactly 0** — enforced by the short-circuit in
  `promptFirstOrSecond`, asserted by the Step 2 test. The toggle does not apply; a rule is not
  a choice.
- **Target prompts when `candidates.length <= 1`: exactly 0** — enforced in
  `promptTargetChoice`, asserted by Step 3.
- **Setting defaults: `true`, both** — enforced in `main.ts`, checked by C3.
- **Blocking calls when no dialog resolves: 0** — both prompts settle with the default and log.
- **Documented defaults:** first-or-second → `"first"`; target → `candidates[0]` (first enemy
  in contact). Both stated in the hints; both engine behaviour with **no QSR source**.
- **Sides in a GREATHELM round: 2** (`REQUIRED_SIDE_COUNT` in `round-control.ts`) — the
  first-or-second prompt has exactly two options.

## Verification Commands

- **Build:** `cd "$(git rev-parse --show-toplevel)" && npm run build > build.log 2>&1; echo $?`
  (redirect — do **not** pipe to `tail`/`head`; vite EPIPEs and reports a false non-zero)
- **Tests:** `cd "$(git rev-parse --show-toplevel)" && npm test -- choice-prompts`
- **Full suite (no regression):** `cd "$(git rev-parse --show-toplevel)" && npm test` — ≥218 passing
- **Acceptance:**
  - Settings shape and defaults: checks C2, C3
  - Feature detection matches the precedent: check C4, plus read the probe beside
    `resolveConversionPrompt` and confirm the `null` return exists
  - i18n keys exist: check C5 (the antidote to the three keys that shipped missing)
  - `[HUMAN REVIEW]` In a live v14 world, **hard-reload** (Foundry caches system JS for 4
    hours), confirm both prompts appear during a round and that each toggle silences its own
    and only its own. **Record `DialogV2`'s real shape in `vault/foundry-systems/`** — it is
    currently unrecorded at any confidence.

## Patterns to Follow

- `packages/battleframe/src/rulesets/orphan-check.ts` — `resolveConversionPrompt` is the
  named precedent in the master spec and must be matched structurally: probe
  `foundry.applications.api.DialogV2`, fall back to global `Dialog`, return `null` when
  neither resolves, `try`/`catch` around every call, caller degrades. `offerOrphanConversion`
  shows the degrade: `if (orphans.length === 0 || !prompt) return 0;` — the absent-API case is
  an ordinary branch, not an error.
- `packages/battleframe-greathelm/src/ui/round-control.ts` — `resolveFirstPlayer` already
  encodes `forced-first` as unconditional and documents `"first"` as an ENGINE DEFAULT behind
  the `chooseOrder` seam; `RunRoundFromControlOptions.chooseOrder` is the seam this sub-spec
  fills. `findDefenderInBaseContact` documents the target-picker gap this sub-spec closes.
  Its file-top provenance comment is the model for how to mark an engine default.
- `packages/battleframe-greathelm/src/main.ts` — `registerGreathelmSettings()` is the exact
  registration shape to copy, including the comment explaining *why* the default is what it is.
- `packages/battleframe-greathelm/src/constants.ts` — `SETTING_MIN_DICE_POOL_FLOOR_ENABLED` is
  the precedent for a settings key living there; the file header states the contract these new
  constants must not violate.
- `packages/battleframe-greathelm/src/combat/clash.ts` — `BASE_CONTACT_TOLERANCE_PX`'s comment
  is the precedent for keeping a non-rule constant *out* of `constants.ts`, beside the code
  that needs it.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `will-create: packages/battleframe-greathelm/src/ui/choice-prompts.ts` | Create | Feature-detected first-or-second and target-choice prompts; `forced-first` short-circuit; degrade to documented defaults |
| `will-create: packages/battleframe-greathelm/tests/choice-prompts.test.ts` | Create | Headless tests: prompt shown, prompt disabled → default, `forced-first` → no prompt, single enemy → no prompt, dialog API absent → default + log |
| `packages/battleframe-greathelm/src/constants.ts` | Modify | Add the two setting keys, commented as module configuration — not rules |
| `packages/battleframe-greathelm/src/main.ts` | Modify | Register both world settings, `default: true`, in the existing `init` hook |
| `packages/battleframe-greathelm/lang/en.json` | Modify | Settings name/hint keys (hints state their defaults) and every prompt string |
