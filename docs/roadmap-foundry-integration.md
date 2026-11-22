# Roadmap — Integrate with Foundry, stop reimplementing it

**Date:** 2026-07-18. **Method:** five scanning passes (combat/turns, data/documents,
UI/apps, geometry, effects/dice) across the vault's Foundry-API research, the engine,
and the three ruleset modules.

## Execution status (2026-07-18)

| Item | Status |
|---|---|
| **P0** round state on Combat doc | ✅ ALL THREE rulesets (Simple Skirmish, InCountry, GREATHELM) — round state on the Combat document, live-verified to survive a reload. GREATHELM also RESUMES an in-progress round (dice-pool session restored from the document) instead of re-rolling. |
| **P1** status effects | ✅ native `defeated`-on-threshold for ALL THREE rulesets — InCountry `suppressed`+`defeated`-on-wipe, Simple Skirmish `models==0`, GREATHELM at its damage limit/fled (all live-verified: the skull shows/clears on real actors + drops the unit from the P0 turn order). ✅ 2026-11-02, unverified live: InCountry declares a `modelsBar` resource (`{value,max}`, trackable) a token bar can bind to. ✅ 2026-11-16, unverified live: Simple Skirmish has a `startingModels` field (on the sheet, raised with `models` on create/update) and a derived trackable `modelsBar` (`{value: models, max: startingModels}`); existing units are migrated at `ready` by the GM. ⏸ InCountry `engaged/reaction/injury/stun`: unbuilt features whose rules are not in the repo; owner. |
| **P2** chat/dice | ✅ `dice.rollPool` — one Roll/one card per pool (live-verified). ✅ combat OUTCOMES → ChatMessage cards through the engine's `chat.postCard`. ✅ 2026-11-02, unverified live: InCountry's round-over card, which only toasted; Full Thrust cards carry a speaker; rolls post through `Roll#toMessage`, so the native per-die breakdown replaces the bespoke card. |
| **P3** non-gridless guard | ✅ done. |
| **P4** native swaps | ✅ generic-sheet form/submitOnChange/prose-mirror fixed. ✅ 2026-11-02, unverified live: `isNewerVersion`, pool-panel `actions` map, `DialogV2.confirm` for the reset, roll card retired for `toMessage`. ✖ `game.system.id` namespacing: dropped by the owner 2026-11-16 (won't do); reasons below. |

Items dated 2026-07-18 are committed, tested, and verified in the live world. Items dated 2026-11-02
are proved by unit tests only; no Foundry world was available to that session. Remaining ⏳ items are
documented follow-ups below.

Items dated 2026-11-16 are also proved by unit tests only; no Foundry world was available.

**P4 `game.system.id` namespacing, dropped by the owner 2026-11-16 (won't do).** The id is `"battleframe"` in
`system.json`, and nothing in the repo plans to change it, so `game.system.id` and `SYSTEM_ID` are the same string and
the swap changes no behaviour. It is also not contained: the `battleframe` flag scope is shared across
packages — Simple Skirmish, InCountry and Stargrunt II hardcode `FLAG_SCOPE = "battleframe"`, GREATHELM
calls `setFlag("battleframe", …)`, and the engine's combat reads the order those modules write. Every
module's `module.json` names the system id, and the i18n keys and template paths carry it too. Swapping
only the engine would split the namespace if the id ever did change. Worse, on a rename it would make the
system write to a new scope while the world's data sits under the old one, silently; the hardcoded
constant fails loudly instead, because Foundry rejects a flag scope that is not an active package (from knowledge of Foundry's source, not
a live check). The
recommendation is to drop the item.

**Found while doing P4, not on the original list:** GREATHELM's prompts and the core's orphan-conversion
prompt held `DialogV2.wait`/`confirm` as detached references. Foundry's statics read `this`, so the call
throws and each catch takes its default: the initiative winner is never asked, New Battle never resets,
the GM is never offered conversion. Mocks do not read `this`, so the suite could not see it. Fixed
2026-11-02. The claim about Foundry's statics is from knowledge of its source, not a live check.

## Bug hunt, 2026-11-21 (unit tests only; no Foundry world)

An audit of Simple Skirmish, InCountry and the engine. Fixed items cite their test; open items are
listed with the reason they were not fixed here.

**InCountry, fixed** (`packages/battleframe-incountry/tests/round-defects.test.ts`):
- ✅ An attack resolved, and its damage was saved, before the order checked the attacker could
  activate, so an already-activated or wiped unit on the active side could fire. It now asks
  `order.eligible` first.
- ✅ Units were keyed by actor id, so two unlinked tokens of one actor were a single unit. They are
  keyed by token id now. A round saved before this keyed by actor id will not restore; start a new one.
- ✅ A side with no models still rolled initiative, and Run Round kept opening rounds after one side
  held the field. Initiative is rolled by living sides only, and Run Round refuses once the
  module's own victory read is not "continue" (`controls.round.battleOver`).

**Simple Skirmish, fixed** (`packages/battleframe-simple-skirmish/tests/activation-defects.test.ts`):
- ✅ The same attack-before-check defect: an already-activated or destroyed unit could attack and
  its casualties were saved before the round refused it. It now checks `round.unactivated` first.
- ✅ The same actor-id keying: unlinked tokens of one actor were one unit. Keyed by token id now.
- ✅ The defeated status was only ever set. Restoring a unit's models on the sheet left the skull on.
  The unit data model's `_onUpdate` now re-syncs it when `models` changes, on the changing client only.

**Engine, fixed** (`packages/battleframe/tests/`):
- ✅ GM-less play through socketlib could not work for plain players. `system.json` had no
  `"socket": true`, which socketlib needs before it registers a system, and the ready toggle was
  always written straight to the GM-owned Combat/Scene. A player who does not own it now asks a
  connected GM to write it (`setReady`, keyed to socketlib's record of the caller). (`ready-advance.test.ts`)
- ✅ The orphan check never found an orphan. An actor whose module is disabled fails validation and
  is only in `invalidDocumentIds`, which holds ids; the check read them as documents. It now resolves
  each through `getInvalid`. (`orphan-check.test.ts`)
- ✅ Every document sheet in the monorepo (engine generic sheet and ten module sheets) had a fixed
  `id`, so two open sheets of one type shared an application and DOM id. Each now ends in Foundry's
  `{id}` placeholder. (`document-sheet-ids.test.ts`)
- ✅ The combat tracker override skipped the base class's `_prepareTrackerContext`, so `turns` (what
  core's tracker template renders) was never built. It now calls the base and reorders `turns` by the
  battleframe order. (`combat.test.ts`)
- ✅ The setup wizard dropped a refused primary selection's reasons, so "Make Primary" could fail with
  nothing on screen. It now warns with them. (`settings.test.ts`)

**Open, needs the owner:**
- **Switching the primary ruleset.** Once primary A is active in a session, activating primary B is
  refused (`registry.activateRuleset`), although the wizard says the choice can be changed later.
  Separately, nothing restores the active ruleset from the `activeRulesetId` setting at startup, so
  `game.battleframe.api.getActiveRuleset()` is `null` after every reload (no module reads it today).
  Restoring it would make the refusal permanent, so both need one decision: should a new primary
  replace the old one?
- **InCountry suppression never clears.** Nothing sets `system.suppressed` back to false, and the
  sheet checkbox and the token's status icon can disagree. When suppression ends is a rule.
- **InCountry `armorType` → `armorModifier`/`armorDice`.** Existing actors are not migrated and load
  with no armour. May be deliberate under `rules-content-audit.md`.
- **Simple Skirmish neutral/secret tokens.** A neutral token fights as friendly and a secret one as
  hostile (`sideFromDisposition`). Which units take part is a rules/table call.

**Open, not fixed here (no owner decision needed):**
- **Raw English** in InCountry's whole unit sheet template, the engine's orphan warning, ready-advance
  toasts and countdown setting, engine error messages shown as toasts, dice-roll flavors, and both
  modules' registration-failure toasts. The existing i18n tests only check that referenced keys exist.
  (Both modules' round cards and toasts: ✅ 2026-11-21, each package's `tests/localized-round.test.ts`.)
- **A delegated advance runs on the GM's canvas.** `advanceRoundCore` reads `canvas.tokens` on the GM
  who receives the socket call, which may be another scene; the players who readied see no toast.
- **InCountry creates its Combat inactive** (`Combat.create` without `active: true`), so the engine's
  ready flags (on `combats.active`) may sit on another combat. Unverified live.
- **Simple Skirmish's scene control** sets `activeTool` to a GM-only button tool.

## Executive summary

The concern — "are we recreating Foundry instead of building on it?" — is **valid but
specifically located.** Most of the stack is already correctly built *on* Foundry
(data models, sheets, line-of-sight, dice pipeline, registration, geometry additions
Foundry genuinely lacks). Three real integration gaps remain, and they cluster around
one theme: **game state that Foundry would persist, sync, and display for us, we
instead hold in private JavaScript and never surface.**

1. **Live round/turn STATE lives in module JS variables** (`let activeRound`), not on
   Foundry's `Combat` document — even though the engine already registered the correct
   seam (`BattleframeCombat` + a custom tracker), which the modules then bypass. A GM
   refresh wipes the round; players and co-GMs see nothing; the tracker renders empty.
2. **No battlefield state is visible on any token.** `CONFIG.statusEffects` is used
   nowhere; suppression/removal/engaged/injury are invisible `system` booleans. A
   removed knight is indistinguishable from a live one.
3. **Game results and dice pools don't use Foundry's ChatMessage/Roll rendering.**
   Outcomes go to GM-only toasts; a 5-die pool posts ~6 chat messages + 6 animations.

Everything else is already idiomatic, or a small mechanical native-swap. The vault's
own verdict frames P0 exactly: *"the turn-order model is replaceable; the storage is
not."*

---

## Prioritized roadmap

### P0 — Move round/turn state onto the `Combat` document  *(combat + data passes both ranked this #1)*
A GM refresh mid-battle **wipes the round** (order, who has activated); no second GM or
player sees it; and the registered `BattleframeCombat` + custom tracker render an
**empty list** because nothing ever creates `Combatant`s.

- At round start ensure a `Combat` exists and populate `Combatant`s from the canvas
  tokens (replacing `gatherUnitsFromCanvas`).
- Store the activation order on `combat.flags.battleframe.order` (the engine's
  `getOrder`/`orderedCombatants` already read it), the turn pointer on the Combat doc,
  and per-unit `activated`/spent state on **Combatant flags**.
- Keep the activation *algorithm* (`createActivationOrder`, `weightedBagSelector`) — it
  becomes the body of a `BattleframeCombat.setupTurns`/`nextTurn` override (the Lancet
  shape the vault prescribes), not a standalone in-memory service.
- Retire the module-scoped `let activeRound` / `let activeUnits` globals.
- **Payoff:** reload survival, multiplayer sync + GM handoff, the native tracker renders
  real content, the orphaned engine seam becomes the driver.
- **Effort:** M/module (wiring, not new architecture). Start with Simple Skirmish / InX
  (plain globals) as the reference; fold GREATHELM's richer session onto the same spine.

### P1 — Make battlefield state visible via Foundry status effects  *(effects pass #1)*
Today the canvas is blind to the game. Register the **boolean/threshold** markers as
`CONFIG.statusEffects` and toggle via `token.toggleStatusEffect` / read via
`actor.statuses`, so state shows an icon on the token, syncs to every client, and
persists on the document:

- **suppressed** (InX), **engaged / reaction / injury / stun** (InX — mostly greenfield,
  build native from the start, no migration cost), **removed/fled** (GREATHELM — also set
  the Combatant **`defeated`** flag + skull overlay so it drops from the P0 turn order;
  a downed knight currently sits on the board identical to a live one).
- **Keep numeric counters as `NumberField`s** — momentum (0–3), damage (0–3),
  models/casualties are quantities, the wrong shape for a boolean condition — but fire
  the native `defeated` status on the **threshold** (damage == max, models == 0). Cheap
  add: bind model count to a token **resource bar** so casualties show as a depleting bar.
- **Effort:** M. **Payoff:** battlefield state finally visible + synced + persisted.
- **Depends on P0** for the tracker/`defeated` drop-from-order integration.

### P2 — Use Foundry's ChatMessage / Roll rendering  *(UI pass #1 + effects pass #4/#5)*
Three related "stop hand-rolling what Roll/ChatMessage give you" fixes:

- **Outcomes → chat cards.** Hits, casualties, suppression, victory currently go to
  `ui.notifications` — transient and **GM-only**. Post them as persistent `ChatMessage`
  cards with a `ChatMessage.getSpeaker` speaker (cards attribute to nobody today). Keep
  toasts only for GM-only *errors*. Shared helper in the engine's `dice/chat.ts`.
- **One Roll per pool.** InX rolls each pool die as a separate `1d10` Roll, so a 5-die
  attack posts ~6 chat messages and fires ~6 Dice-So-Nice animations. Roll `Nd10` once,
  read faces off `roll.dice[0].results`. One roll = one message, one animation.
- **Native breakdown.** Use `roll.toMessage()` / `roll.render()` for the standard
  expandable per-die tooltip instead of the bespoke flat card.
- **Effort:** M. **Payoff:** players see the game; chat stops spamming; native dice UI.

### P3 — Fail loud on non-gridless scenes  *(geometry pass #1)*
`measure`/`areas` assume gridless everywhere and never check `grid.type`; on a
square/hex scene they return plausible-but-wrong Euclidean numbers that silently
disagree with Foundry's ruler.

- Add a `grid.type === CONST.GRID_TYPES.GRIDLESS` assertion (a `NonGridlessSceneError`
  in the existing house style) to `measure.between` and `areas.contains`.
- **Effort:** S. Honors the deliberate gridless-only scope (square/hex backlogged with
  BattleTech). Delegating centre-to-centre to `canvas.grid.measurePath` is a defensible
  deferred follow-up; the guard is the actual correctness fix.

### P4 — Small native-swaps & latent-bug cleanups
- `rulesets/validate.ts`: replace hand-rolled `compareVersions` with
  `foundry.utils.isNewerVersion`.
- ~~Namespace settings/flags via `game.system.id` rather than the hardcoded `SYSTEM_ID`.~~ Dropped by the owner 2026-11-16.
- **generic-actor-sheet** has the *same* nested-form / missing-`submitOnChange` bug we
  just fixed on the ruleset sheets (its edits won't persist) + a V1-style editor `<div>`;
  set `submitOnChange: true` and use a `<prose-mirror>` element.
- `pool-panel._onRender` hand-wires `addEventListener`; convert die/knight clicks to the
  ApplicationV2 declarative `actions` map + `data-action` (the wizard + InX sheet already
  do this).
- `choice-prompts`: the reset confirm can use `DialogV2.confirm` (minor).
- `dice/chat.ts`: register the card template in the manifest `templates` instead of
  recompiling a Handlebars string per call (folds into P2).

---

## Correctly integrated — leave alone (reassurance)
Data models (`TypeDataModel` + `foundry.data.fields`, no `template.json`) · sheets &
namespaced registration · ruleset registry/API convention (dnd5e pattern) ·
line-of-sight (`ClockwiseSweepPolygon`) · base-model token dimensions · exact-arithmetic
AoE containment · base-to-base measurement · the `Roll`→`evaluate`→`ChatMessage`
pipeline & `rolls:[roll]` DSN attach · token mesh-tint for *ephemeral* highlights ·
`DialogV2` · `ui.notifications` (for errors) · scene controls · per-document
migration-version flags.

## Deliberate divergences to preserve (with rationale)
- **No numeric initiative / custom order** — Lancet precedent; the ordering *model* is
  replaceable (`turn-order-model-is-replaceable-but-storage-is-not`).
- **Bespoke pool-panel + custom tracker** — sanctioned by
  `combat-tracker-is-replaceable-via-config-ui-combat` (holds no rules state; a die-spend
  UI with no Foundry equivalent).
- **Base-to-base measurement & exact-arithmetic areas** — Foundry has no edge-to-edge
  measurement, and `Region#testPoint` is wrong for disc-shaped bases (validated by
  `spike-results-regions` on v14.363: a Region circle is a 63-vertex under-area polygon
  biased to exclude).
- **Token mesh-tint for highlights** — correct for *ephemeral, client-local* highlighting
  (`token-tinting-…`); persistent state must NOT use tint — that's what status icons are
  for (P1).
- **Numeric counters** (momentum/damage/models) stay `NumberField`s — quantities, not
  boolean conditions; only the *threshold event* goes native (P1).
- **Module-declared subtypes + registration API** — Foundry-supported, and now
  empirically confirmed live (module actors create, persist, tokenize).

---

## Suggested sequencing
P0 → P1 (depends on P0's Combatants/tracker) → P2 (independent; can interleave) →
P3 (independent, S) → P4 (hygiene, anytime). P0+P1 together are the substantive
"integrate with Foundry" arc — they move the game's live state onto documents and onto
the canvas. P2 makes it legible to players. P3/P4 are correctness and hygiene.
