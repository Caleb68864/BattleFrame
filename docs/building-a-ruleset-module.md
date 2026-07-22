---
date: 2026-07-17
audience: ruleset-module authors
status: living
---

# Building a ruleset module on BattleFrame

BattleFrame is a **ruleset-neutral** Foundry VTT game *system*. It ships no rules. A playable
game is a separate Foundry **module** that registers a ruleset with the system and drives its
own turn loop using the primitives core provides. GREATHELM
(`packages/battleframe-greathelm`) is the reference implementation; read it alongside this
guide.

The whole architecture rests on one invariant: **core knows nothing about your ruleset.** It
owns geometry, dice, documents and a registry; it owns no turn model, no stat line, no
victory condition. Those are yours. If hosting your ruleset needs a change to
`packages/battleframe/src`, that is a design finding to write up — not a normal step (see
[Neutrality](#the-neutrality-contract)).

---

## What core gives you

Everything lives under `game.battleframe`, built at the system's module top level so it is
reachable before *any* module's `init` runs, regardless of Foundry's load order.

| Service | Surface | Does |
|---|---|---|
| `api` | `registerRuleset`, `activateRuleset`, `getActiveRuleset`, `getRuleset`, `listRulesets` | Register and query rulesets |
| `measure` | `between(a, b)` | Base-to-base distance on a gridless scene, in the scene's units |
| `areas` | `circle`, `rectangle`, `contains`, `tokensInside`, `toRegionShapes` | Areas of effect and exact base-aware containment |
| `dice` | `roll(formula, data?, options?)` | Rolls, renders a chat card, and carries the `Roll` so Dice So Nice animates |
| `facing` | `bearingOf(observer, target)`, `facingOf`, `absoluteBearing` | Numeric bearing (degrees, clockwise, 0 = dead ahead) of a target relative to an observer's heading. Geometry only — the ruleset buckets it into arcs (Full Thrust's `combat/arcs.ts`) |

Plus, as Foundry `CONFIG`/document machinery rather than a `game.battleframe` method:

- **Base model** — a token's real-world base, read from `flags.battleframe.base`
  (`{ shape: "circle" | "oval", widthMm, heightMm }`). Measurement and areas both use it.
- **Generic Actor type** — a fallback `Actor` subtype core owns, plus a `ready`-time check
  that offers to convert Actors orphaned by a disabled ruleset module rather than letting
  them look like data loss.
- **A neutered `Combat` document** — no initiative model; it exposes
  `combat.flags.battleframe.order`, a plain per-ruleset scratchpad for turn order.

---

## Anatomy of a ruleset module

A ruleset is an ordinary Foundry module (`module.json`) that depends on the `battleframe`
system. Its entry point does four things at `init`, in this order (GREATHELM's `main.ts`):

```ts
Hooks.once("init", () => {
  registerMyActorDataModel();   // CONFIG.Actor.dataModels["<moduleId>.<subtype>"]
  registerMySheets();           // your Actor sheet(s)
  registerMySettings();         // game.settings.register(MODULE_ID, ...)
  registerMyUI();               // scene controls, macros, etc. -- how a user starts a turn
  registerMyRuleset();          // game.battleframe.api.registerRuleset(...)  <- last, and loud
});
```

Register the ruleset **last**, and after the independent steps, so a missing or broken system
produces a loud error without also swallowing the registrations that would have worked.

### Resolve the API without depending on load order

```ts
function resolveBattleframeApi() {
  const g = globalThis as any;
  // globalThis.battleframe exists before any init; game.battleframe is the bound form.
  return g.battleframe?.api ?? g.game?.battleframe?.api;
}
```

### Register, and fail loud on failure

```ts
const api = resolveBattleframeApi();
if (!api) {
  // Notify the GM, then throw. A ruleset that silently vanishes leaves a world
  // that looks fine and does nothing -- the worst possible failure.
  failRegistration("the battleframe system API was not found. Is the system active?");
}

const result = api.registerRuleset({
  id: MODULE_ID,                                   // your module id
  title: "My Game",
  version: "0.1.0",
  primary: true,                                   // the active ruleset for the world
  battleframeCompatibility: { minimum: "0.1.0", verified: "0.1.0" },
});

if (!result.ok) {
  failRegistration(result.errors.join("; "));       // a rejected registration is loud too
}
```

`battleframeCompatibility.minimum` is compared against the **running** system version; ask for
the lowest version whose API you actually use. `verified` is the version you tested against.

---

## Your Actor subtype

Foundry namespaces a module-provided Actor subtype as `"<moduleId>.<subtype>"`. Register a
`TypeDataModel` under that key:

```ts
CONFIG.Actor.dataModels[`${MODULE_ID}.unit`] = MyUnitDataModel;
```

Keep the schema to what your rules actually evidence — GREATHELM's knight is two capped
`NumberField`s and nothing else, because the QSR gives knights no stat line. Do not invent
fields the source does not have.

### Set the base so measurement works

Measurement and areas read a token's base from its **document** flags (a canvas `Token`
placeable has no flags of its own):

```ts
await tokenDocument.setFlag("battleframe", "base", {
  shape: "circle",      // or "oval"
  widthMm: 32,
  heightMm: 32,
});
```

Base sizes are in **millimetres**; scene distances are in **inches/feet/etc.** (the scene's
grid units). Do not conflate them — that confusion has produced 12× bugs. If a token has no
base flag, core derives one from its grid footprint and throws rather than guess when it
cannot. Oval bases are currently measured as their **major-axis circumscribing circle** (see
`docs/plans/` facing note): exact oval extent needs the base's board orientation, which core
does not model yet.

---

## Using the primitives

**Distance** — base-to-base, gridless, in the scene's units:

```ts
const { distance, units, mode } = game.battleframe.measure.between(tokenA, tokenB);
// mode === "base-to-base"; distance === 0 means the bases touch.
```

`between(a, b) === between(b, a)` exactly. "Touching" is measure-zero in a pixel VTT, so if
your rule is *base contact*, compare against a small per-scene pixel tolerance rather than
`=== 0` (GREATHELM's `clash.ts` does this — it is a ruleset judgement, not core's).

**Areas** — build a shape, then ask what it catches. Positions are in scene **pixels**; sizes
are in scene **distance units**:

```ts
const blast = game.battleframe.areas.circle(targetToken.center, 3); // 3" radius
const caught = game.battleframe.areas.tokensInside(blast, candidateTokens); // base-overlap
```

`contains`/`tokensInside` take a `mode`: `"base-overlap"` (default — the model's base touches
the area) or `"centre"` (the model's centre is inside). **Core does not pick which is
correct** — the researched games disagree, so it is your rule to choose. `toRegionShapes`
gives you Region shape data if you want to *draw* the marker; containment never goes through
it (a Region circle is a 63-gon; the arithmetic is exact). Non-positive dimensions throw
`InvalidAreaError`.

**Dice** — a thin passthrough, deliberately, so Dice So Nice animates for free:

```ts
const roll = await game.battleframe.dice.roll("1d6", {}, {
  rulesetId: MODULE_ID,
  flavor: "clash test",
});
// roll.total is your result; a chat card was posted with the Roll attached.
```

---

## You own the turn loop

Core provides **no scheduler, and this is deliberate.** Every researched game structures turns
differently — dice-pool (GREATHELM), inherited alternating order (OPR), phase-based with no
per-unit activation (Alpha Strike), turn length discovered mid-turn by a die roll
(Song of Blades). A single "activation engine" broke against five games five ways, so core
ships none. **Hand-roll your loop.** Persist turn order to `combat.flags.battleframe.order`
via the document's `setFlag` when you need it shared.

Make the loop *reachable by a user* — a scene control, a macro, a sheet button. Pure functions
and unit tests are not a game; something a GM can click has to call them, or the code is dead
however green its tests (this has bitten the project repeatedly).

If your resolution has to **suspend and prompt another player** (reactions, "the target
chooses" before the attacker rolls), model it as a suspendable session, not a pure function —
GREATHELM's `round/session.ts` is the worked example. Do not try to generalise that into core.

---

## The neutrality contract

Core carries no ruleset vocabulary — not in code, not even in comments. An automated test
(`tests/integration/neutrality.test.ts`) fails the build if `packages/battleframe/src` so much
as says `knight`, `momentum`, or your game's proper nouns, and if it imports any ruleset
package. This is the load-bearing proof the platform stays neutral, so:

- **Building your ruleset must require zero changes to `packages/battleframe/src`.** If it
  seems to, that is a genuine finding — write it up in `docs/plans/` as a design question, do
  not quietly patch core. (Alpha Strike, a phase-based game, is the deliberate stress test of
  this claim.)
- A capability that looks generic from *your* ruleset alone is probably your ruleset's shape.
  Core generalises a primitive only when a **second** ruleset independently needs the same
  thing.

---

## What core does *not* provide (yet, or ever)

Deliberately absent, so you neither wait for them nor assume them:

- **Turn-order schedulers, a resolution/reaction stack** — the opt-in *toolkit*, gated until
  three structurally-different rulesets ship. Until then, hand-roll. See
  `docs/backlog/battleframe-toolkit-extraction.md`.
- **Cover, facing *arcs*, objectives, campaign, conditions** — toolkit or ruleset territory.
  Note facing **geometry** IS now built (`game.battleframe.facing`, a numeric bearing — see the
  service table above and the facing design note); what stays ruleset territory is what the
  bearing *means* (arc counts, hit tables, rear-attack bonuses). Line of sight is
  `game.battleframe.los`.
- **Square / hex measurement, cones / lines** — measurement is gridless base-to-base only;
  areas are circles and rectangles only. Grid and template geometry are deferred until a
  ruleset (BattleTech-family) needs them.

If you need one of these, that need is *evidence* — raise it, and it can be designed from your
real requirements rather than guessed.

---

## Ship rules, not rulebooks

Wargame rules and army data are copyrighted. Ship **zero** rules text, stat blocks, tables,
army lists, or artwork. Bring-your-own-data: import the user's own files, or model the
mechanics without reproducing the text. GREATHELM ships the *engine* for the rules, and reads
its numbers from research notes that are the project's own writing. A `[MECHANICAL]` check in
core asserts no rulebook has ever entered git history — keep it that way.

---

## The reference implementation

`packages/battleframe-greathelm` is a complete, live-verified ruleset: an Actor subtype, a
sheet, a dice-pool initiative, a suspendable player-driven round, base-contact clashes, a
courage phase, victory, and a "New Battle" reset. Everything in this guide is something it
does. When in doubt, read how GREATHELM does it — and remember it is *one* example, so copy
its shape, not its rules.
