---
tags: [wargame-research, candidate-ruleset]
source: inference
confidence: partial
---

# Solo and AI-driven activation as an engine requirement

An architectural finding that fell out of the survey rather than being looked for: a meaningful share of free/indie skirmish games are **solo-first**, and solo games make a categorically different demand on a VTT engine.

## The observation

[[rangers-of-shadow-deep]] and the Five Parsecs/Five Leagues family ([[five-parsecs-from-home]]) are designed primarily for **solo or co-op** play. This isn't incidental — it's a large and growing segment of the indie skirmish market, and it correlates with the free/cheap end where this project wants to live.

## Why it changes the architecture

In a PvP game, the engine is a **referee**: it tracks state and adjudicates rules while two humans make all the decisions. In a solo game, the engine is also the **opponent** — it must *make decisions*.

Crucially, in these games those decisions are **not** "write a good AI." They are specified in the rules as deterministic algorithms. From [[rangers-of-shadow-deep]]:

> Ranged creatures hold and shoot the nearest target; melee creatures move toward the nearest/lowest-health target; with no LOS, move to a scenario-specified point or move randomly.

That is a spec, not a heuristic. It can be implemented exactly and correctly, and unlike most VTT automation it *removes* work from the player rather than merely tracking it.

## The engine implication

An activation scheduler that assumes **"each activation belongs to a player who will be prompted for input"** cannot host these games. The abstraction needs to allow an activation whose decisions are resolved by rules-defined logic with no prompt at all — and, for the Event-phase pattern, activations that belong to *no one* (draw a card, resolve a table).

This is a different axis from the one in [[activation-model-comparison]]. That note asks *what order do things act in*; this one asks *who decides what an acting thing does*. Both need to be pluggable.

> [!tip] This may be the strongest product argument
> Solo play is where a VTT adds the most value per unit of effort, because the engine is doing work a human otherwise does *badly and slowly* (running enemy AI by hand, drawing event cards, consulting tables). A PvP module mostly saves you a tape measure. Worth weighing when picking an early target.

## Confidence

**Partial / inference.** The Rangers AI quote is sourced (see [[rangers-of-shadow-deep]]); the generalisation about the solo segment and the architectural conclusions are my analysis, not a cited claim.

## Related

- [[rangers-of-shadow-deep]]
- [[five-parsecs-from-home]]
- [[activation-model-comparison]]
