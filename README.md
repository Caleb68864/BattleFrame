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

**The policy.** The code implements *mechanics*; the *data* is yours to bring.
Playing a given game means owning its rulebook and entering the numbers
yourself. Reference rulebooks used during development are kept strictly local
and are never committed, released, or redistributed (they are kept local and
git-ignored).

**Where the code stands against that policy, stated honestly.** Every package
meets it today. Five ruleset modules ship no rules numbers at all; the sixth,
`simple-skirmish`, ships numbers it is **licensed** to ship, with attribution.
See [`docs/rules-content-audit.md`](docs/rules-content-audit.md) for the
per-module detail.

| Package | Ships rules numbers? | Source |
| --- | --- | --- |
| `battleframe` (core) | No | — |
| `battleframe-stargrunt-ii` | No — user supplies every value | — |
| `battleframe-dirtside-ii` | No — user supplies every value | — |
| `battleframe-full-thrust` | No — user supplies every value | — |
| `battleframe-greathelm` | No — user supplies every value | — |
| `battleframe-incountry` | No — user supplies every value | — |
| `battleframe-simple-skirmish` | Yes — **licensed** CC BY-NC 4.0, attributed | *Simple Fantasy Skirmish*, Peter Vodden |

This section used to say the project ships "zero copyrighted rules content… no
points values". That was false for four of these modules; `full-thrust` alone
carried 147 rules constants including a to-hit table, the threshold table, the
per-die damage table and a quoted points value. It is recorded here rather than
quietly corrected because the claim was published, and because `stargrunt-ii`
and `dirtside-ii` — the same publisher as `full-thrust` — show the repository
already knew the right shape.

All four were resolved on 2026-09-21. Three were stripped. The fourth,
`simple-skirmish`, was never a strip — its source is CC BY-NC 4.0 and already
properly attributed; what was wrong there was the repository licence, see
[License](#license) below.

## Layout

An [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) monorepo:

- `packages/battleframe/` — the ruleset-neutral core system. Everything it
  offers a module lives under `game.battleframe`; see
  [Engine capabilities](#engine-capabilities) below.
- The **ruleset modules** — each a separate Foundry module that registers
  itself with the core and drives its own game. Every one of them requires the
  official rulebook, obtained separately by the user. None ships rules *prose*,
  stat blocks, army lists or artwork, and only `simple-skirmish` ships rules
  *numbers* — under the licence that permits it. See the table above and
  [`docs/rules-content-audit.md`](docs/rules-content-audit.md).
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
- `docs/` — the decision log, the two authoring guides
  ([building a ruleset module](docs/building-a-ruleset-module.md),
  [engine API reference](docs/engine-api-reference.md)), and the roadmaps.

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

[MIT](LICENSE) — **except** `packages/battleframe-simple-skirmish/`.

That package implements *Simple Fantasy Skirmish* by Peter Vodden, published
under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0). It may not
be sold, and attribution must travel with it; MIT grants the right to sell, so
MIT cannot cover it. Its terms are in
[`NOTICE.md`](packages/battleframe-simple-skirmish/NOTICE.md), and the `LICENSE`
file carries the same carve-out.

This was a real contradiction, not a formality: the repository offered every
package under a licence permitting sale while that module's own notice said it
must never be sold.

## Support

☕ Like what I'm building? Help fuel my next project (or my next coffee)!
Support me on [Buy Me a Coffee](https://buymeacoffee.com/plainsprepper) 💻🧵🔥
