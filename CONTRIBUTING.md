# Contributing to BattleFrame

Thanks for hacking on BattleFrame. This file covers how the project is shaped, how
to get set up, and the few rules that keep the codebase honest. It complements two
documents you should keep open:

- **[`CLAUDE.md`](CLAUDE.md)** — the build-on-Foundry philosophy and the full
  reimplementation smell test. The source of truth; this file summarizes it.
- **[`docs/building-a-ruleset-module.md`](docs/building-a-ruleset-module.md)** — the
  step-by-step guide to authoring a ruleset module. If you're writing a ruleset, that
  guide is your walkthrough; the section here just orients you toward it.

The [engine API catalog](docs/engine-api-reference.md) lists every `game.battleframe`
service — read it before building any turn, geometry, or dice logic.

## Project shape

BattleFrame is a **Foundry VTT v14 game system** (a ruleset-neutral engine) plus a
handful of **ruleset modules** that register against it. It's an
[npm-workspaces](https://docs.npmjs.com/cli/using-npm/workspaces) monorepo; every
package lives under `packages/`.

```
packages/
  battleframe/                  # the engine — ruleset-neutral core system
  battleframe-greathelm/        # GREATHELM — reference ruleset module
  battleframe-full-thrust/      # Full Thrust ruleset module
  battleframe-incountry/        # InCountry ruleset module
  battleframe-simple-skirmish/  # Simple Skirmish ruleset module
docs/                           # decision log, authoring guides, roadmaps
scripts/hooks/                  # the pre-commit hook (see Workflow)
```

The engine (`packages/battleframe`) owns the things every wargame needs — base-to-base
geometry on gridless boards, dice with chat rendering, the Foundry document machinery,
line of sight, activation ordering, and a ruleset registry — and **nothing else**. It
has no turn model, no stat line, no victory condition. Everything the engine offers a
module lives under the `game.battleframe` namespace.

A **ruleset module** is a separate Foundry module that depends on the `battleframe`
system, registers itself through the public `game.battleframe` API, and drives its own
game using the primitives the engine provides. GREATHELM is the reference module and the
smallest complete example.

The guiding invariant: **core knows nothing about your ruleset.**

## Getting set up

Requires Node.js and npm. Run every command from the repo root — npm workspaces fan
them out to the packages.

```
git clone <repo-url> && cd BattleFrame
npm install        # install workspace dependencies
```

The real scripts (all defined in the root [`package.json`](package.json)):

```
npm test           # run the vitest suite
npm run typecheck   # type-check every package, no emit
npm run build       # typecheck, then build each package's Foundry module
npm run docs        # generate the TypeDoc API reference into docs/api/
```

`npm run build` runs the typecheck first, then builds each package. To try a package in
Foundry, copy the built package directory into your Foundry data folder — the core into
`Data/systems/`, a ruleset into `Data/modules/` — and enable it in a world.

**Install the pre-commit hook** (see [Workflow](#workflow) for what it does):

```
ln -sf ../../scripts/hooks/pre-commit .git/hooks/pre-commit
```

## The core rule: build ON Foundry, don't reimplement it

BattleFrame is built **on top of** Foundry. Before writing any capability, check whether
Foundry (or the engine) already provides it, and use that. The project's costliest,
most recurring mistake is holding game state in a private JavaScript variable and drawing
our own version of something Foundry already ships. **STOP and check the native** if you
are about to:

- **Track turn/round order or "whose turn"** → the engine's `game.battleframe.rounds`
  activation order, with state persisted on the **`Combat` document** and Combatant
  flags — never a module-scoped `let`.
- **Store state that must survive reload or sync to other clients** → put it on a
  **Document** (`Actor`/`Combat`/`Combatant`/`Scene`) via `setFlag`. If a GM refresh
  would lose it, it's in the wrong place.
- **Track a battlefield condition** (suppressed, defeated, engaged…) → register a
  **`CONFIG.statusEffects`** entry (`game.battleframe.status`) and toggle it, so it
  shows on the token, syncs, and persists. Not an invisible `system` boolean. (Numeric
  counters like damage or model count stay `NumberField`s — only the boolean/threshold
  condition goes native.)
- **Roll or format dice** → one **`Roll`** per dice pool via `game.battleframe.dice`,
  surfaced as a persistent **`ChatMessage`** card — not per-die Rolls or GM-only toasts.
- **Measure, test line-of-sight, or draw an area** → `game.battleframe.measure`,
  `game.battleframe.areas`, `game.battleframe.los`, and Foundry geometry. Only the
  base-to-base edge measurement and exact-arithmetic containment are ours.
- **Build a sheet or dialog** → ApplicationV2 + `HandlebarsApplicationMixin`, with
  `form: { submitOnChange: true }`; use `DialogV2` for prompts. Never wrap sheet content
  in your own `<form>` — the ApplicationV2 root already is one.

The full version of this list, with the reasoning and the Foundry API names, is in
**[`CLAUDE.md`](CLAUDE.md)**. Read it before designing anything.

## Engine neutrality

`packages/battleframe/src` is ruleset-neutral and **must stay so**. No ruleset names or
vocabulary appear in engine code — not in identifiers, not even in comments — and the
engine imports no ruleset package. An automated test
(`packages/battleframe/tests/integration/neutrality.test.ts`) fails the build if it does.
This is the load-bearing proof that the platform stays neutral.

What this means in practice:

- **Building a ruleset must require zero changes to `packages/battleframe/src`.** If it
  seems to need one, that's a genuine design finding — raise it as a design question (an
  issue or a note in `docs/decisions.md`), not a quiet patch to core.
- A capability that looks generic from *your* ruleset alone is probably your ruleset's
  shape. The engine generalizes a primitive only when a **second** ruleset independently
  needs the same thing.

Ruleset specifics — stat lines, turn structure, victory conditions, arc vocabulary —
live in the `battleframe-<ruleset>` module, which reaches the engine only through the
public `game.battleframe` API.

## Workflow

**Test-driven development.** Write the failing test first, watch it fail, then write the
minimal code to make it pass. Run the suite with `npm test`.

**Live-verify Foundry-facing work.** Several real bugs — sheet saves, icon paths, form
nesting — were invisible to the unit suite and only caught in a live world. If your
change touches a sheet, a hook, an icon path, or anything the user sees in Foundry, load
it in a real world and confirm it before calling it done.

**A `docs/decisions.md` entry per commit.** Every commit that touches code needs a
matching entry in [`docs/decisions.md`](docs/decisions.md) — a short note on the kind of
non-obvious fix a future reader would otherwise re-derive or re-break. The pre-commit
hook at `scripts/hooks/pre-commit` enforces this:

- If you stage code but no `docs/decisions.md` change, the hook **appends a scaffold**
  with five `<FILL-IN>` fields (Symptom, Fix, Surfaces, Watch, Commit), stages it, and
  aborts the commit. Fill those in, re-stage `docs/decisions.md`, and commit again.
- If a staged `docs/decisions.md` still contains `<FILL-IN>` placeholders in its added
  lines, the hook blocks the commit until you replace them.
- The entry format is a dated heading followed by the five fields:

  ```
  ## 2026-07-22 — Short title of the fix
  - Symptom: what went wrong / what was observed
  - Fix: what you changed and why
  - Surfaces: the files or areas it touches
  - Watch: the failure mode to guard against next time
  - Commit: this commit
  ```

- Bypass is `git commit --no-verify` — use it sparingly and only when there's genuinely
  nothing to record.

Keep commit messages specific about the *why*, in the spirit of the decision-log entry.

## Adding a new ruleset module

The full walkthrough is **[`docs/building-a-ruleset-module.md`](docs/building-a-ruleset-module.md)**
— read it alongside GREATHELM (`packages/battleframe-greathelm`), the reference module.
The shape, in brief:

1. A new package under `packages/battleframe-<ruleset>/` with its own `module.json`
   (a Foundry module manifest that depends on the `battleframe` system) and `package.json`.
2. An **Actor data model** — a `TypeDataModel` registered under
   `CONFIG.Actor.dataModels["<moduleId>.<subtype>"]`. Keep the schema to what your rules
   actually evidence; don't invent fields the source doesn't have.
3. A **sheet** (ApplicationV2) and any settings, scene controls, or macros — the loop has
   to be reachable by a user who clicks something, or the code is dead however green its
   tests.
4. **Registering the ruleset last**, in `init`, through
   `game.battleframe.api.registerRuleset(...)`, and failing loud if the engine API isn't
   found or the registration is rejected.

You own your turn loop — the engine deliberately ships no scheduler beyond the activation
order. Consume the `game.battleframe` primitives (measure, areas, dice, rounds, facing,
los, hover, status) rather than rebuilding them; the
[API reference](docs/engine-api-reference.md) is the catalog, with a "don't duplicate
this" smell test for each service.

## Should a ruleset live here or in its own repo?

Right now every ruleset lives **in this monorepo** as a core module, and that's the
recommended default. Three things make it the right call:

- The engine API evolves **in lockstep with its consumers** — when a primitive needs to
  change, the rulesets that use it change in the same commit, and nothing drifts.
- **One test suite** enforces neutrality across all of them at once.
- Shipping example modules alongside a core is a normal, expected Foundry pattern.

Split a ruleset into its own repo only when a **concrete trigger** appears:

- **(a) Release cadence** — it needs to version and release independently of the engine.
- **(b) Ownership** — a different person or org takes over maintaining it.
- **(c) License** — its license diverges from the engine's MIT.
- **(d) Volume** — its issue and PR traffic starts drowning the engine's.

Until one of those hits, keep it in-repo. The architecture makes a later split cheap:
each module is self-contained under `packages/` and reaches the engine only through the
public `game.battleframe` API, so lifting one out is mechanical. Because deferring the
decision costs so little, defer it.

Practically: the **engine plus GREATHELM** — the reference module — are the natural
"core" that would publish together. Keep the other rulesets in-repo until a trigger
above actually hits.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE), the same as the project.
</content>
</invoke>
