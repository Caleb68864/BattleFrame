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

- `packages/battleframe/` — the ruleset-neutral core system. Exposes its
  services under `game.battleframe`: `api` (ruleset registry), `measure`
  (base-to-base distance), `areas` (areas of effect and base-aware
  containment), and `dice` (rolls rendered to chat with Dice So Nice support).
- `packages/battleframe-greathelm/` — **GREATHELM**, the reference ruleset
  module. A working, self-contained example of a game built on the core:
  actor data model, sheets, settings, UI, turn loop, and victory check.
  Mechanics only — it ships no GREATHELM rules text or stat blocks and
  requires the official rulebook, obtained separately.
- `vault/` — research and design notes (tracked on purpose; they are the
  project's own writing). Source rulebooks are **not** tracked.
- `docs/` — design decisions, specs, and authoring guides.

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
