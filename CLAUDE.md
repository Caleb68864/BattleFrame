# BattleFrame — project instructions

## Build ON Foundry. Do not reimplement it.

BattleFrame is a Foundry VTT **v14** game system + ruleset modules. It is built
**on top of** Foundry. Before writing any capability, check whether Foundry
already provides it and **use Foundry's version**. Only add engine/module code
for what Foundry genuinely lacks (and say so in a comment).

The recurring failure mode this project has hit is holding game state in private
JavaScript and drawing our own version of something Foundry ships. The audit and
plan for undoing it live in **`docs/roadmap-foundry-integration.md`** — consult it
before designing anything below.

### Reimplementation smell test — STOP and check the Foundry native if you are about to:

- **Track turn/round order or "whose turn" in a module variable** → use the
  **`Combat` document** (`CONFIG.Combat.documentClass`, already
  `BattleframeCombat`). The ordering *algorithm* may be custom; the *storage* may
  not — round/turn/activation state lives on the Combat doc + **Combatant flags**,
  never a module-scoped `let`. (`turn-order-model-is-replaceable-but-storage-is-not`)
- **Store state that must survive reload or sync to other clients** → put it on a
  **Document** (`Actor`/`Combat`/`Combatant`/`Scene`) via `setFlag`, not a JS
  variable. If a GM refresh would lose it, it is in the wrong place.
- **Track a battlefield condition** (suppressed, defeated, engaged, injured…) →
  register a **`CONFIG.statusEffects`** entry and toggle it
  (`token.toggleStatusEffect`, `actor.statuses`, `Combatant.defeated`) so it shows
  on the token, syncs, and persists. Do NOT bury it in an invisible `system`
  boolean. (Numeric *counters* like momentum/damage/models stay `NumberField`s —
  only the boolean/threshold condition goes native.)
- **Roll or format dice** → use one **`Roll`** per dice pool (`Roll("Nd10")`,
  read faces off `roll.dice[0].results`), and surface results as persistent
  **`ChatMessage`** cards (`roll.toMessage()` / `ChatMessage.create` with a
  `getSpeaker`), not per-die Rolls or GM-only `ui.notifications` toasts.
- **Measure, test line-of-sight, or draw an area** → use `canvas.grid`,
  `ClockwiseSweepPolygon.testCollision` (via `game.battleframe.los`), and Foundry
  geometry. Only the **base-to-base** (edge) measurement and exact-arithmetic disc
  containment are ours — Foundry genuinely lacks those (see the geometry notes).
- **Build a sheet or dialog** → ApplicationV2 + `HandlebarsApplicationMixin`;
  set `form: { submitOnChange: true }`; never wrap sheet content in your own
  `<form>` (the ApplicationV2 root already is one); use `DialogV2` for prompts.

### Engine neutrality
`packages/battleframe/src` is ruleset-neutral and MUST stay so — no ruleset names
or vocabulary in engine code (a test enforces this). Ruleset specifics live in the
`battleframe-<ruleset>` modules, which register against the system's public API
(`game.battleframe`).

### Working discipline
- **TDD** (superpowers): failing test first, watch it fail, minimal code to pass.
- Every commit needs a **`docs/decisions.md`** entry (a pre-commit hook enforces it).
- **Live-verify Foundry-facing work** — several real bugs (sheet saves, icon paths,
  form nesting) were invisible to the unit suite and only caught in a live world.

<!-- logic-dev-graph:start -->
## Code graph — query first

This project has a whole-project code graph at the **project root**
(`<repo root>/graphify-out/graph.db` — SQLite). Before searching the codebase,
query the graph instead of grepping: `query_graph` (MCP tool) or the CLI front
door `python -m logic_dev_kit.graph_cli query "<symbol>" --text-fallback` (also
`neighbors`, `path`, `impact`, `stats`). Fall back to `Grep`/`Glob` only on a
graph miss.
<!-- logic-dev-graph:end -->
