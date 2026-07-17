---
tags: [wargame-research, greathelm]
source: inference
confidence: unverified
---

# Engine Implications (Foundry VTT)

**This entire note is inference.** No source discusses implementation. Every underlying rule is cited in its own note; the engineering opinions are mine.

## 1. The dice pool is the turn structure — model it first

Do not build "initiative" and "actions" as separate subsystems. See [[initiative-dice-are-the-action-menu]]. The round state is roughly:

```
Round {
  pools: { [playerId]: Multiset<1..6> }   // private, per-player
  currentStep: max(unspent faces across BOTH pools)
  activePlayer: alternates per single action
}
```

Legality: an action is available iff the actor holds an unspent die with `face === currentStep`. Spending consumes it *and* selects the action. `currentStep` recomputes to next-highest unspent face when the current empties (skipping empty steps entirely).

The pool needs **real persistent UI** — rows of matching faces, high→low. The game sells a physical tray for exactly this; a roll dialog that discards results is the wrong shape.

## 2. State is tiny

Per knight: `{position, damage: 0..3, momentum: 0..3, equipment[]}`. That's it — [[knights-have-no-stat-line]]. All d6, all small integers. Cheap to model, cheap to sync, trivially serialisable. Resist adding an `activated` flag: [[action-economy-per-die-not-per-model]] is per-die, not per-model.

## 3. The hard part is clash sequencing

A single attack is a **multi-round-trip interactive negotiation** ([[clash-test]]):

```
attacker: declare action (spend die)  → requires base contact
defender: declare defense             ← BLIND, before any roll
attacker: commit momentum             ← BLIND, before any roll
both:     roll d6 + situational bonuses
compare  (attacker wins ties)
if defender lost: defender rolls armor table
winner gains 1 momentum
```

Two blind commitments before dice touch the table. **This cannot be collapsed into one roll** without destroying the game. Foundry needs enforced turn-gated prompts with a timeout/default — and [[hasty-rolling]] tells you what the correct default is (bonus-free defense, not an error).

## 4. Geometry is real, not abstract

Real inches ([[movement-and-measurement]]), physical collision ("cannot move through spaces smaller than their base width"), and base contact as the sole engagement predicate ([[base-contact-and-engagement]]). `inBaseContact(a,b)` gates attacks, [[outnumbering]], and [[courage-test]] triggers — it is the hottest query in the ruleset and wants to be a cached adjacency relation.

Foundry's grid is a poor fit: this is a gridless, 8.5"×11" board with sub-inch precision. Configure gridless with a real inch scale.

## 5. Build the seams where the unknowns are

[[open-questions]] Tier 1 items all sit *above* the round loop:

- **Scene transitions** ([[scenes]]) → scenario-level state machine with an **undefined carry-over payload**. Make it an interface, not a decision.
- **Campaign persistence** ([[campaign-play]]) → cross-session knight identity, which currently doesn't exist.
- **Warband construction** ([[warband-construction]]) → possibly no list-builder at all.

**Recommendation:** build the round loop (well-understood, fully sourced) as a self-contained core. Put an explicit, swappable boundary where Scene/Scenario/Campaign would attach. Do **not** design those layers from this research — see [[version-discrepancies-qsr-vs-kickstarter]] for why even the known constants are provisional (v0.4, pre-1.0).

## 6. Constants belong in config

Sprint 5" is already contradicted by a review's 6". Damage cap 3, momentum cap 3, pool = n+1, armour table thresholds — all of these are v0.4 values that may have shifted before v1.0. Externalise them.

Related: [[initiative-dice-are-the-action-menu]] · [[open-questions]]
