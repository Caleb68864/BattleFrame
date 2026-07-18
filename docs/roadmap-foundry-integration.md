# Roadmap — Integrate with Foundry, stop reimplementing it

**Date:** 2026-07-18. **Method:** five scanning passes (combat/turns, data/documents,
UI/apps, geometry, effects/dice) across the vault's Foundry-API research, the engine,
and the three ruleset modules.

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
- Namespace settings/flags via `game.system.id` rather than the hardcoded `SYSTEM_ID`.
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
