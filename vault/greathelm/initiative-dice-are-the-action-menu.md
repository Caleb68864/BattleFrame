---
tags: [wargame-research, greathelm]
source: inference
confidence: unverified
---

# The Initiative Dice ARE the Action Menu

**This note is my synthesis, not a rule.** Every underlying fact is confirmed elsewhere; the framing is mine and is flagged `unverified` deliberately.

GREATHELM collapses four systems that most skirmish games keep separate into a single object — the rolled dice pool:

| Conventional system | In GREATHELM |
|---|---|
| Initiative / turn order | Count of 6s in the pool ([[initiative-order-determination]]) |
| Action points / economy | One die = one action ([[action-economy-per-die-not-per-model]]) |
| Action selection | The die's **face value** ([[dice-face-to-action-mapping]]) |
| Round sequencing | Descending face value ([[battle-phase-initiative-steps]]) |

There is no separate "AP budget", no per-model activation flag, no action list to consult independently of the dice. The pool is simultaneously *what you can do*, *how much you can do*, *in what order*, and *who goes first*.

## Why this matters for an engine

The naive port — modelling "initiative" and "actions" as separate subsystems — will fight the design the whole way. The correct primitive is roughly:

```
Round {
  pools: { playerA: Multiset<1..6>, playerB: Multiset<1..6> }
  currentStep: max(unspent faces across both pools)
  activePlayer: alternates per action
}
```

An action is legal iff the acting player has an unspent die whose face == `currentStep`. Spending it consumes the die and selects the action. `currentStep` recomputes to the next-highest unspent face when the current one empties.

The pool is **persistent, visible round state** that deserves real UI (rows of matching faces, highest to lowest — the game literally sells a tray for this), not an ephemeral roll dialog.

Related: [[greathelm-overview]] · [[engine-implications]]
