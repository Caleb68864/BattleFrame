---
tags: [wargame-research, one-page-rules]
source: inference
confidence: unverified
---

# One Engine Can Host Six of the Eight OPR Rulesets — Which Makes OPR a Good Abstraction Test

Direct answer to *"how much do the variants share, and can an engine host several related rulesets?"*

The eight rulesets ([[family-eight-current-rulesets-in-two-version-families]]) are **not eight engines**. They stratify into layers over one core:

| Tier | Rulesets | Work needed | Verdict |
|---|---|---|---|
| **0 — the core** | Grimdark Future | Build this | Start here |
| **1 — reskins** | Age of Fantasy | Points table + 3-rule delta | **Nearly free** |
| **2 — module swap** | Firefight, AoF: Skirmish | Pluggable damage + morale scope | **Cheap, high value** |
| **3 — geometry layer** | AoF: Regiments | Facing, formations, rows | Expensive — defer |
| **4 — new turn+action model** | Star Quest, AoF: Quest | Hero/stress/AI layer | Moderate — defer |
| **5 — different engine** | GF: Warfleets | Separate resolution engine | **Descope** |

## The shared core (confirmed across tiers 0-3)

- Quality test: *"Roll one six-sided die, and if you score the model's quality value or higher"*
- The clamp: *"rolls of 6 always succeed, and rolls of 1 always fail"*
- Two-roll combat: hit → block; melee *"works like shooting"* ([[mechanics-two-roll-combat-hit-then-block]])
- The **same special-rules glossary**: AP(X), Blast(X), Caster(X), Deadly(X), Fast, Fear(X), Fearless, Impact(X), Tough(X), etc.
- Same terrain trio, same Shaken state, same Fatigue, same 4-round D3+2-objective mission
- Same alternating unit activation and the same four actions

**Tiers 0-2 (four rulesets) are one engine with swappable damage and morale.** That is a genuinely strong result.

## Why OPR is a good first ruleset for BattleFrame

1. **Tiny surface.** Two stats ([[mechanics-quality-and-defense-are-the-only-two-stats]]), one action from four, two dice rolls, one win condition.
2. **Machine-readable data already exists** ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]) — rules arrive pre-parsed as `{name, rating}`, no PDF scraping.
3. **Free rules** — contributors and users can legally *read* them without buying anything.
4. **It's a real multi-ruleset family**, so it exercises the neutrality thesis for real rather than in theory.
5. **VTT-friendly by construction**: free pre-measuring is rules-legal ([[mechanics-measurement-is-free-and-there-are-no-facing-rules]]).

## What OPR will demand of the abstraction — the useful pressure

- **Turn order as a provider**, not a stored number ([[assessment-opr-activation-vs-per-round-initiative-roll-models]]).
- **Damage resolution as a strategy** — GF removes a model per wound; Firefight rolls a wound-effects table ([[family-firefight-differs-in-damage-not-activation]]).
- **Morale scope as a parameter** — per-unit (GF) vs per-army (Firefight).
- **Rule registry scoped per ruleset** — `Tough` means **different things** in GF and Firefight. Name collisions across rulesets are real and silent.
- **Reactive actions decoupled from activation** ([[mechanics-melee-strike-back-is-optional-and-free]]).
- **Rules as data, not code** — the v2→v3 diff shows numbers and glossary churn while architecture stays stable ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]).

## The honest caveat

**OPR is an easy test.** Tiers 0-2 share so much that hosting them proves less than it appears — AoF especially is the *same document*. Passing this test is necessary, not sufficient. **Regiments (tier 3) is the real stress test**, because it breaks the spatial assumptions everything else shares ([[family-regiments-adds-facing-and-formations]]). Design the spatial layer aware of it; don't build it first.

**And note the whole thing is gated on licensing**, not architecture — see [[licence-opr-rules-have-no-open-licence]] and [[design-ship-a-rules-engine-with-no-bundled-opr-content]].

**Confidence: unverified** — architectural judgement. The **shared-core facts** it rests on are confirmed (tiers 0-2 from official v3.5.1 PDFs) or partial (tiers 3-5 from the community wiki).
