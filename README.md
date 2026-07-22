# BattleFrame

A **ruleset-neutral** [Foundry VTT](https://foundryvtt.com/) game system for
miniature and skirmish wargames. BattleFrame's core owns the things every
tabletop wargame needs — base-to-base geometry on gridless boards, dice with
chat rendering, the Foundry document machinery, and a ruleset registry — and
nothing else. It has no turn model, no stat line, and no victory condition.
Those belong to a **ruleset module**, a separate Foundry module that registers
itself with the system and drives its own turn loop using the primitives core
provides.

The guiding invariant is simple: **core knows nothing about your ruleset.**

## What ships in this repo — and what does not

This project ships **zero copyrighted rules content**. No rules text, no stat
blocks, no army lists, no points values, no artwork. The code implements
*mechanics*; the *data* is yours to bring. Playing a given game means owning its
rulebook and entering the numbers yourself. Reference rulebooks used during
development are kept strictly local and are never committed, released, or
redistributed (see the `vault/` note below and `.gitignore`).

## Layout

An [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) monorepo:

- `packages/battleframe/` — the ruleset-neutral core system. Everything it
  offers a module lives under `game.battleframe`; see
  [Engine capabilities](#engine-capabilities) below.
- The **ruleset modules** — each a separate Foundry module that registers
  itself with the core and drives its own game. All are mechanics only: they
  ship no rules text, stat blocks, army lists, points values, or artwork, and
  require the official rulebook (obtained separately by the user).
  - `packages/battleframe-greathelm/` — **GREATHELM**, the reference ruleset
    module and the smallest complete example: actor data model, sheets,
    settings, UI, dice-pool round loop, and victory check.
  - `packages/battleframe-full-thrust/` — **Full Thrust**, the starship-combat
    game by Jon Tuffley / Ground Zero Games, and the largest ruleset here. It
    covers ships (hull rows with FT2 threshold checks, armour, screens, damage
    control), the weapon suite (beam batteries, pulse torpedoes, submunition
    packs, needle beams, salvo and independent missiles, spinal-mount Nova
    Cannon / Wave Gun), fighters, bring-your-own fleet import, and both
    cinematic clockface and vector movement. The core mechanics are built and
    unit-tested; some weapon phases and the single guided end-to-end turn UI
    are still in progress, and live-in-Foundry verification is pending — see
    its `COVERAGE.md` for the honest per-rule ledger.
  - `packages/battleframe-incountry/` — **InCountry**, the INX 2.0 modern
    tactical skirmish game by Echo Dark Studios. In progress.
  - `packages/battleframe-simple-skirmish/` — **Simple Skirmish**, the Basic
    Game of Simple Fantasy Skirmish by Peter Vodden (CC BY-NC 4.0).
- `vault/` — research and design notes (tracked on purpose; they are the
  project's own writing). Source rulebooks are **not** tracked.
- `docs/` — design decisions, specs, and authoring guides.

## Engine capabilities

The core exposes one namespace, `game.battleframe`, reachable before any
module's `init`. A ruleset consumes these services instead of rebuilding them;
[`docs/engine-api-reference.md`](docs/engine-api-reference.md) is the full
catalog with signatures.

- `api` — ruleset registration and lookup (register, activate, list).
- `measure` — base-to-base or centre-to-centre distance on gridless boards,
  reading each token's real base geometry.
- `facing` — the numeric bearing of a target relative to a heading (the core
  owns the angle; the ruleset buckets it into whatever arcs it wants).
- `dice` — dice pools rolled as a single `Roll` and rendered to a persistent
  chat card, with Dice So Nice animation.
- `areas` — circles and rectangles with exact, base-aware containment tests,
  plus region shapes for drawing.
- `rounds` — a serializable two-tier activation order (priority then main,
  strict alternation by default) that rulesets use for turn/activation
  sequencing instead of holding turn state in a variable.
- `los` — line of sight via Foundry's wall sweep (`ClockwiseSweepPolygon`).
- `hover` — register which `system` fields a token's hover stat panel shows;
  the engine owns the panel itself.
- `status` — register a battlefield condition onto `CONFIG.statusEffects` so it
  shows as a native, syncing token icon.

## Development

Requires Node.js and npm. Run all commands from the repo root; npm workspaces
fan them out to the packages.

```
npm install        # install workspace dependencies
npm run build      # typecheck, then build every package
npm test           # run the vitest suite
npm run typecheck  # type-check without emitting
```

`npm run build` runs the typecheck first and then builds each package's
Foundry module. To try a package in Foundry, copy the built package directory
into your Foundry `Data/systems/` (core) or `Data/modules/` (a ruleset)
directory and enable it in a world.

## Authoring a ruleset module

GREATHELM is the reference implementation; read it alongside
[`docs/building-a-ruleset-module.md`](docs/building-a-ruleset-module.md), which
walks through what core provides, the anatomy of a ruleset module, and the
neutrality contract every ruleset must honor.

## License

[MIT](LICENSE).
