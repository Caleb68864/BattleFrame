# Battleframe Spike — THROWAWAY CODE

> [!danger] This is not Battleframe.
> This is disposable experimental code whose only job is to answer questions we cannot
> answer from documentation. **None of it should survive into the real system.** It exists
> to be run once, observed, and deleted. Do not import from it, do not "promote" it, do not
> treat its structure as a scaffold — the architecture is still being designed and this
> code deliberately does not reflect it.

## Why this exists

The research in `vault/foundry-systems/` answered the big architectural question from
official docs: **yes, a module can contribute Actor data models to a system.** That's
confirmed, not inferred.

But two things are *not* settled, and they're the ones that can actually sink the project:

1. **Ergonomics of module-supplied types.** The docs confirm the mechanism exists. They do
   not confirm it's pleasant when *every unit in the game* is module-provided. "One module
   adds a quest page type" and "the system has no content of its own" are different in kind.
2. **Edge-to-edge measurement.** Foundry measures center-to-center. Miniature rules measure
   base-to-base. GREATHELM Sprint = 5". OPR coherency = 1"/9". Alpha Strike move = 6".
   Every one of those is base-to-base. Core issue
   [#11428](https://github.com/foundryvtt/foundryvtt/issues/11428) is open and unanswered.
   **This is the real risk.** There is no precedent system to copy.

## Honesty about this code

It was written from research notes against **Foundry v14**, without a running Foundry to
test against. It is **unverified**. It may not even load first try. That's fine and expected
— iterate it until it runs, because the *observations* are the deliverable, not the code.

If something here contradicts real Foundry behaviour, **real Foundry is right and the notes
are wrong** — and that's a finding worth writing down in `vault/foundry-systems/`.

## Deploy

Foundry lives at `foundry.savagefables.com` (Docker). Copy into the container's user data:

```
{userData}/Data/systems/bf-test/
{userData}/Data/modules/bf-ruleset-test/
{userData}/Data/modules/bf-ruleset-test-2/
```

Then: create a world using the **BF Spike Test** system, enable **both** modules, open the
world, and open the browser console (F12).

## What to observe

Everything logs with a `BF-SPIKE |` prefix. Filter the console on that.

### Probe 1 — Module-supplied subtypes (expected: PASS)

| # | Observation | Why it matters |
|---|---|---|
| 1.1 | Does **Create Actor** offer `squad` and `squad2`? | Whether module types reach core UI at all |
| 1.2 | Are the **type labels** right, or raw ids like `bf-ruleset-test.squad`? | Cosmetic but pervasive — every dialog |
| 1.3 | Create a `squad`, **reload the world**. Did it persist? | **The crux** — tests server-side manifest validation |
| 1.4 | Drop it on canvas — does the **token** work? Prototype token? | Rulesets need real tokens, not just sheets |
| 1.5 | **Disable** `bf-ruleset-test`. What happens to existing squads? | The disappearance case; do we need a converter? |
| 1.6 | `init` **order**: system before module? | Decides whether rulesets can call a system API at init |
| 1.7 | `actor.system.modelProvider` — returns the module? | Whether we can identify a document's owning ruleset |
| 1.8 | Do `bf-ruleset-test.squad` and `bf-ruleset-test-2.squad` **coexist**? | Namespacing claim — collisions should be impossible |

### Probe 2 — Measurement (expected: PROBLEM — this is the important one)

Run `game.bfSpike.probeMeasurement()` in the console with **two tokens selected**.

| # | Observation | Why it matters |
|---|---|---|
| 2.1 | Does `canvas.grid.measurePath` return **center-to-center**? | Confirms the mismatch |
| 2.2 | Can the `cost` callback reach **edge-to-edge**? | The only documented seam — does it suffice? |
| 2.3 | Does token **size/base** factor in at all? | Miniature bases are the whole point |
| 2.4 | Is `canvas.grid.diagonals` **read-only** on a live grid? | Notes say yes; confirm |
| 2.5 | On a **gridless** scene, what are the units? Pixels or inches? | GREATHELM is paper-sized and gridless |

### Probe 3 — Scene Regions replacing MeasuredTemplate (v14)

Run `game.bfSpike.probeRegions()`.

| # | Observation | Why it matters |
|---|---|---|
| 3.1 | Is `MeasuredTemplate` really gone in v14? | Notes say deleted — first-ever Document removal |
| 3.2 | Can a **Region** be created programmatically with a circle/cone shape? | Every blast marker depends on this |
| 3.3 | Can we query **which tokens are inside** a Region? | AoE targeting |
| 3.4 | Can a Region be **transient** (preview, then discard)? | Templates were ephemeral; Regions may not be |

## Recording results

Write findings into `vault/foundry-systems/` as new atomized notes, marked `confirmed`
(you observed it) — with the same rigour as the rest of the vault. **A spike whose results
aren't written down was a waste of time.** Correct any existing note this contradicts.

Then delete this folder.
