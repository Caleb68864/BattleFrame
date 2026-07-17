---
date: 2026-07-16
parent_spec: 2026-07-16-battleframe-core-mvp.md
---

# Battleframe toolkit extraction (design Phase 5)

## Context

The opt-in, **deletable** library layer: turn-order schedulers, a resolution stack, and
objective/campaign helpers. Rulesets use it or ignore it. Core never depends on it.

This is the entire point of Approach C: **abstractions get discovered from real rulesets
rather than guessed from a brain dump.** The original design guessed at an "activation
engine" and five researched games broke it in five different ways.

## ⛔ Gated — do not start early

**Do not extract until three rulesets with structurally different turn models have shipped:**

1. GREATHELM — dice-pool-as-action
2. OPR — alternating, inherited order
3. **Alpha Strike — phase-based, no per-unit activation**

Extracting from GREATHELM alone yields a dice-pool-shaped toolkit. Extracting from
GREATHELM + OPR yields an **alternating-shaped** toolkit — reintroducing the exact bias this
architecture exists to remove, just later and with more code attached.

**Extraction from too few examples is worse than no toolkit.** A wrong toolkit that rulesets
adopt becomes load-bearing, and then it may as well have been in core.

## Candidate contents (hypotheses, not commitments)

- **Schedulers** — alternating · phase-IGOUGO · dice-pool · per-round-initiative
- **Resolution Stack** — the most valuable and most speculative piece. Two unrelated games
  independently demand it:
  - **INX** — reaction tokens let a non-active unit act during another's activation
  - **Classic BattleTech** — *"the target chooses"* resolves geometric ties **before the
    attacker rolls**

  Both mean **attack resolution cannot be a pure function** — it must suspend and prompt
  another player. Genuinely hard, genuinely shared.
- **Objectives** · **Campaign** · **Conditions** — note Battlefront Valkyrie has *none* of
  these, which is exactly why they aren't in core.

## Known hard cases any scheduler abstraction must survive

| Game | What it breaks |
|---|---|
| Song of Blades / Rampant / TNT | **"Greed ends your turn"** — turn length discovered *mid-turn* by a die roll. There is no list to walk. |
| Battlefront Valkyrie | **Two orderings in one round** — half/all/half movement, 1:1 combat |
| INX | Reactions interrupt the active unit |
| Classic BattleTech | Phase-structured; all units move before any shoots |

If a proposed scheduler interface can't express all four, **don't ship it.** Leave the
duplication. Duplication is cheaper than a wrong abstraction that three rulesets adopt.

## Acceptance criteria

- `[STRUCTURAL]` Core does not import the toolkit. Ever.
- `[STRUCTURAL]` Every ruleset can still hand-roll its loop and ignore the toolkit entirely.
- `[STRUCTURAL]` Deleting the toolkit leaves the system and all rulesets functional.
- `[MECHANICAL]` Each extracted scheduler is used by **at least two** shipped rulesets. One
  consumer is not evidence — it's a guess with extra steps.
