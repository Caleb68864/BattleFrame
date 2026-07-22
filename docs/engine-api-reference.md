# BattleFrame engine — API reference & capabilities catalog

**Read this before building a module.** It is the single list of what the engine already
provides, so a ruleset module consumes those capabilities instead of rebuilding them. The
recurring, expensive failure mode is a module reimplementing something the engine ships (the
Full Thrust module shipped its own turn-order machine before we noticed the engine's
`rounds` service already did it — see `docs/plans/2026-07-22-full-thrust-engine-extraction-findings.md`).

- **Narrative + patterns:** `docs/building-a-ruleset-module.md` (how to wire a module).
- **This file:** the exhaustive capability catalog + a "don't duplicate" smell test.
- **Generated reference:** `npm run docs` → `docs/api/` (TypeDoc, from the TSDoc comments).

## The one namespace: `game.battleframe`

Everything the engine exposes lives on `game.battleframe`, built at the system's module top
level so it is reachable before *any* module's `init`, whatever order Foundry loaded packages
in. Resolve it defensively (it is also on `globalThis.battleframe` before binding):

```ts
const bf = (globalThis as any).battleframe ?? (globalThis as any).game?.battleframe;
```

| Service | Reach | Owns |
|---|---|---|
| `api` | `game.battleframe.api` | Ruleset registration + lookup |
| `measure` | `game.battleframe.measure` | Base-to-base / centre-to-centre distance (gridless) |
| `facing` | `game.battleframe.facing` | Numeric bearing of a target relative to a heading |
| `dice` | `game.battleframe.dice` | Rolls → chat card + Dice So Nice, pooled faces |
| `areas` | `game.battleframe.areas` | Circles/rectangles + exact base-aware containment |
| `rounds` | `game.battleframe.rounds` | Two-tier activation order (priority + main), serializable |
| `los` | `game.battleframe.los` | Line of sight via Foundry's wall sweep |
| `hover` | `game.battleframe.hover` | Register the stat fields the hover panel shows |
| `status` | `game.battleframe.status` | Register a condition onto `CONFIG.statusEffects` (idempotent) |

Plus Foundry `CONFIG`/document machinery the engine sets up (not on `game.battleframe`): the
base model (token `flags.battleframe.base`), a generic `Actor` fallback type, a neutered
`Combat` document, and the hover panel itself.

---

## `api` — ruleset registration

```ts
interface BattleframeApi {
  registerRuleset(def: RulesetDefinition): { ok: true } | { ok: false; errors: string[] };
  activateRuleset(id: string): { ok: true } | { ok: false; errors: string[] };
  getActiveRuleset(): RulesetDefinition | null;
  getRuleset(id: string): RulesetDefinition | null;
  listRulesets(): RulesetDefinition[];
}
interface RulesetDefinition {
  id: string; title: string; version: string;
  battleframeCompatibility: { minimum: string; verified: string };
  primary: boolean;
}
```

Register **last** in your `init`, and **fail loud** on `!ok`. A second `primary` ruleset is
rejected if a different primary is already active. Hooks fired: `battleframe.rulesetRegistered`,
`battleframe.rulesetActivated`, `battleframe.ready`.

## `measure` — distance (gridless, base-aware)

```ts
measure.between(a, b, mode?: "base-to-base" | "centre-to-centre"): { distance, units, mode }
```

`between(a,b) === between(b,a)`. `base-to-base` (default) subtracts both base radii (0 when
touching); `centre-to-centre` ignores base size. **Gridless only** — throws on square/hex.
Reads each token's base from `flags.battleframe.base` (`{shape, widthMm, heightMm}`, mm).
**Don't** write your own distance math; **don't** compare `=== 0` for "touching" (use a small
pixel tolerance).

## `facing` — bearing geometry (arcs are yours)

```ts
facing.bearingOf(observer, target): number   // [0,360), clockwise, 0 = dead ahead
facing.facingOf(token): number               // resolved heading (rotation / flags.battleframe.facing)
facing.absoluteBearing(from, to): number      // clockwise from north/up
```

Core owns the **geometry** (the numeric bearing); the ruleset owns the **meaning** — how many
arcs, their names, which one a bearing falls in (Full Thrust's `combat/arcs.ts` buckets it into
6×60°). **Don't** put arc counts or fore/aft vocabulary anywhere near core.

## `dice` — rolls that render + animate

```ts
dice.roll(formula, data?, { rulesetId?, flavor? }): Promise<Roll>          // + chat card
dice.rollPool(count, dieSize, { rulesetId?, flavor? }): Promise<number[]>  // ONE roll/card, returns faces
```

Use `rollPool` whenever you read individual faces (hits, saves, kills) off a pool — it is one
`Roll` and one chat card (not `count` of them), so Dice So Nice animates once. **Don't** build
`new Roll` per die; **don't** post per-die chat messages.

## `areas` — templates + containment

```ts
areas.circle(centre, radius): CircleArea          // radius in distance units
areas.rectangle(x, y, width, height): RectangleArea
areas.contains(area, token, mode?: "base-overlap" | "centre"): boolean
areas.tokensInside(area, tokens, mode?): MeasurableToken[]
areas.toRegionShapes(area, scene): RegionShapeData[]   // for DRAWING only
```

Exact disc/rect arithmetic on the base model (not Foundry Regions, which are 63-gons). The
`mode` (does the base overlap, or is the centre inside) is **your** rule — core does not pick.

## `rounds` — activation order (use this for turns!)

```ts
rounds.createActivationOrder({ units, firstSideId, selectMain?, initial? }): ActivationOrder
rounds.restoreActivationOrder({ units, selectMain?, state }): ActivationOrder
rounds.weightedBagSelector(rng): MainSelector

interface ActivationUnit { id; sideId; isResolved?(): boolean; hasPriority?(): boolean }
interface ActivationOrder {
  phase(): "priority" | "main" | "complete";
  activeSideId(): string | undefined;
  eligible(sideId): string[];
  isActivated(id): boolean;
  activate(id): void;               // throws IllegalActivationError out of turn
  isComplete(): boolean;
  serialize(): ActivationOrderState; // persist on a Document; restore with selectMain re-passed
}
```

A two-tier order: an optional **priority** tier (units whose `hasPriority()` acts first,
alternating), then a **main** tier where `selectMain(sides, counts)` picks the next side —
**default is strict alternation** led by `firstSideId`. Pass `weightedBagSelector` for a
bag-draw order. `isResolved` drops dead units so the order completes without them.

> **This is the turn engine.** Before writing any "whose turn is it / alternate sides / who has
> activated" logic, use this. Full Thrust's fire phase is `createActivationOrder` with the
> default alternation + its own initiative roll-off on top. (What stays yours: *how* sides are
> decided and any dice roll-off — not the ordering machine.)

`serialize()` state goes on a **Document** flag (Combat or Scene), never a module variable.

## `los` — line of sight

```ts
los.isClear(origin, destination, type?: "sight"|"move"|"sound"|"light"): boolean
los.between(a, b, { type?, sample?: "centre"|"corners" }): { clear: boolean }
```

Delegates to Foundry's `ClockwiseSweepPolygon`. **Fails open** (clear) with no canvas (tests).
`sample: "corners"` answers "can I see *any* part of that token". **Don't** reimplement
ray-vs-wall geometry.

## `hover` — token hover stat panel

```ts
hover.register(actorType, { fields: HoverStatField[]; defaultVisibility?: "everyone"|"owners"|"gm" })
interface HoverStatField { key: string; label: string; max?: number }   // key = path into actor.system
```

The engine owns the panel + HTML-escaping + the `hoverToken` hook; you only declare which
`system` fields to show (per namespaced Actor type). `max` is a static number — for a
computed "N/M" readout, compute a string in `prepareDerivedData` and show that (Full Thrust's
`hullTrack`). **Don't** build your own hover UI.

## `status` — register battlefield conditions

```ts
status.register({ id, name, img, ...foundryFields }): void   // idempotent push to CONFIG.statusEffects
status.registered(): string[]
```

Registers a condition so it shows as a native token icon (syncs + persists). The engine owns
only the dedup-and-push; the ruleset owns *which* conditions and *when* to toggle them
(`actor.toggleStatusEffect(id, {active})`; destruction uses `CONFIG.specialStatusEffects.DEFEATED`).
Namespace ids by module id, `name` is an i18n key, `img` a core Foundry SVG. **Don't** hand-roll
the `CONFIG.statusEffects` push.

---

## Foundry `CONFIG`/document machinery the engine sets up

- **Base model** — set a token's real base once: `tokenDoc.setFlag("battleframe", "base",
  {shape:"circle"|"oval", widthMm, heightMm})`. Measurement + areas read it. mm ≠ scene units.
- **Generic `Actor` type** + a `ready`-time orphan check (offers to convert Actors left by a
  disabled ruleset).
- **A neutered `Combat` document** (`BattleframeCombat`, no initiative model) exposing
  `combat.flags.battleframe.order` (a `string[]` render order the tracker shows) — write it if
  you seat combatants.
- **Status effects** are plain Foundry: push to `CONFIG.statusEffects` at `init`, toggle with
  `actor.toggleStatusEffect(id, {active})`, use `CONFIG.specialStatusEffects.DEFEATED` for
  destruction. (Two rulesets duplicate the register boilerplate — an engine helper is a
  standing finding, see the extraction-findings note.)

---

## Reimplementation smell test — STOP if you are about to…

| You're writing… | Use instead |
|---|---|
| "whose turn / alternate sides / who activated" | `rounds.createActivationOrder` |
| distance / range between tokens | `measure.between` |
| which arc / rear attack (the *angle*) | `facing.bearingOf` (bucket the number yourself) |
| `new Roll` per die, per-die chat spam | `dice.rollPool` |
| "is it inside the blast" | `areas.contains` / `tokensInside` |
| ray-vs-wall, cover | `los.isClear` / `los.between` |
| a custom token stat tooltip | `hover.register` |
| turn/round state in a module `let` | a **Document** flag (Combat/Scene/Actor `setFlag`) |
| a battlefield condition as an invisible `system` boolean | `CONFIG.statusEffects` + `toggleStatusEffect` |

If you genuinely need something the engine lacks, that is a **design finding** — write it up in
`docs/plans/` (do not patch core), and it gets designed once a **second** ruleset needs it too.

## What core does NOT provide (don't wait for it)

Turn *schedulers* beyond the activation order, a resolution/reaction stack, cover, objectives,
campaign, square/hex measurement, cones/lines, facing *arcs* (only the bearing), and any
game-rule vocabulary. These are ruleset or (gated) toolkit territory.
