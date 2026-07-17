---
tags: [wargame-research, candidate-ruleset]
source: inference
confidence: partial
---

# Comparison: activation models by distance from the default

Ranking candidates by **mechanical distance from "roll initiative each round, then alternate activations."** Diversity is the point — a weird model is valuable as a stress test even if the game is unshippable.

## Distance 0 — the baseline

| Game | Model |
|---|---|
| [[necromunda-community-edition]] | Priority roll, alternate activating one Ready fighter, 2 actions each. **This *is* the default.** |
| [[zona-alfa]] | "Alternating activation," D10 — *but see caveat below* |

## Distance 1 — default plus a wrinkle

| Game | Wrinkle |
|---|---|
| [[forbidden-psalm]] | Alternating single-model, but **must move before acting or the activation ends**; monsters activate as a batch after all player models |
| [[space-weirdos]] | Alternating, plus a **Command Point pool** buying out-of-sequence acts (overwatch) — an orthogonal resource layer over the scheduler |

## Distance 2 — leader-driven activation (a recurring pattern)

| Game | Model |
|---|---|
| [[necromunda-community-edition]] | **Group Activation** — a leader nominates several fighters, activates them in any order |
| [[frostgrave]] | **Proximity drag** — the wizard's phase pulls in 0–3 soldiers within 3"/LOS |
| [[turnip28]] | **Commander cascade** — activate a Snob, activation cascades to units they command; uncommanded units go last |
| [[rangers-of-shadow-deep]] | Ranger group-activates up to 2 figures within 3" |

> [!tip] The most actionable finding in the survey
> **Four unrelated games independently converge on "a leader drags subordinates into their activation."** This is not an edge case — it's a *design family*. The activation abstraction should support leader-scoped group activation **natively**, not as a per-game hack. Cheap to design in now; painful to retrofit.

## Distance 3 — non-deterministic turn length ("greed ends your turn")

| Game | Model |
|---|---|
| [[song-of-blades-and-heroes]] | Choose to roll **1, 2, or 3 dice** vs Quality. Each success = an action. **Two failures → activation ends AND turn passes.** Player tunes their own risk. |
| [[rampant-system]] | **2D6 vs the unit's stat; on failure your entire activation phase ends immediately.** |
| [[this-is-not-a-test]] | d10 + Mettle vs target. **Success → 2 actions + activate another model. Failure → 1 action, initiative passes.** |

> [!tip] A second convergent family — and the hard one
> Three unrelated designers, same core idea: **keep activating until a roll fails, then control passes.** Turn length is *discovered mid-turn by a die roll*, and in SBH the player chooses their exposure.
>
> An engine modelling "a turn is a list of activations you work through" **cannot represent any of these**. The turn boundary is emergent, not planned. **This is the load-bearing test case.** If the scheduler hosts SBH and Rampant, it hosts almost anything.

## Distance 4 — the round is not a queue at all

| Game | Model |
|---|---|
| [[five-leagues-from-the-borderlands]] | **Per-model initiative partition** — each model rolls d6 vs Agility to act in a "quick phase" *before* the enemy; the rest act after. No single turn order; the round is a *partition*, not a sequence. |
| [[five-parsecs-from-home]] | **Reaction-gated partial activation** — activate one unit, then roll 3d6; additional units activate if Reaction ≥ one of the dice. *How many* of your units act is rolled for. |
| [[gaslands-refuelled]] | **Gear phases 1–6.** Each phase, every vehicle in that gear *or higher* activates. A Gear 3 car activates in phases 1, 2, **and** 3 — activation *count* is a dynamic per-token property driven by game state. |

## Distance 5 — the phase is the unit of scheduling, not the model

| Game | Model |
|---|---|
| [[mordheim-community-rules]] | **Classic IGOUGO:** Recovery → Movement → Shooting → Close Combat, alternating by *side*. Move everything, then shoot with everything. And Close Combat is **bilateral — "both sides fight, regardless of whose turn it is."** |
| [[frostgrave]] | Fixed phases by **rank**: Wizard → Apprentice → Soldier → Creature |

> [!important] The biggest architectural fork
> Mordheim-style IGOUGO has **no per-model activation at all**. The scheduling unit is a *phase*, and one phase is *simultaneous for both players*. This is not a variation on alternating activation — it's a different paradigm.
>
> It's also an **enormous family**: all of oldhammer, most historical wargaming, most pre-2000s design. A "ruleset-neutral" engine that can't host IGOUGO isn't neutral — it's an alternating-activation engine. Since Mordheim itself is untouchable, validate this via a legally safe phase-based game.

## Out of scope entirely

| Game | Why |
|---|---|
| [[space-gits]] / [[riot-dice-srd]] | **Dexterity-based** — physically throw dice into the play area, models move toward where they land. No faithful VTT representation exists. A real boundary on what the engine can host, independent of licensing. |

## The orthogonal axis: who decides?

Distance measures *what order things act in*. A separate question: **who makes the decisions?**

- **PvP** — every activation prompts a human.
- **Deterministic AI** ([[rangers-of-shadow-deep]]) — rules-specified algorithm; the engine resolves it **completely**, no prompt.
- **Interpretive AI** ([[five-parsecs-from-home]]) — stance-based priorities requiring judgement; the engine can **assist but not resolve**.
- **Ownerless activations** — Rangers' Event phase: draw a card, resolve a table. Belongs to *no player*.

Both axes need to be pluggable. See [[solo-and-ai-driven-activation-as-an-engine-requirement]].

## Caveats

**Partial.** Distances are my judgement. Several models are sourced from reviews rather than rulebooks — [[open-combat]]'s is **unverified** and deliberately omitted from the table; [[zona-alfa]] is placed at distance 0 on the strength of the phrase "alternating activation" in marketing copy, which given how many neighbours here hide a roll-to-continue inside that same phrase, **may well be wrong**. [[danger-close]] — the best-licensed candidate — has **no activation data at all**; that gap should be closed first, and its rules are free and openly licensed, so reading them is trivial.

## Related

- [[licensing-freedom-ranking]]
- [[solo-and-ai-driven-activation-as-an-engine-requirement]]
- [[one-page-rules-see-other-agent]]
