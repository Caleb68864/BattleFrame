---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Round Order Is Inherited, Not Re-Rolled — "Whoever Finished Activating First Goes First"

A small rule with outsized architectural consequences. GF Core Rules v3.5.1:

> Each new round, the player that finished activating first on the last round gets to go first.

**There is exactly one roll-off in the entire game**, at deployment. After that, first-player is **derived from the previous round's completion order** — never re-rolled.

## The deployment roll-off chain

The single roll-off cascades into three advantages at once:

> Players roll-off, and the winner picks a long table edge as their deployment zone, with their opponent taking the opposite. Then the players alternate in placing one unit each within 12" of their table edge, **starting with the player that won the deployment roll**.

So the roll-off winner picks the table edge **and** deploys first **and** activates first in round 1. Note this is *unusual* — many wargames make deploying first a **cost** paid for choosing, since deploying first means being reacted to. In OPR the same player gets all three. Confirmed in both the Core Rules and the Beginner's Guide.

## Why this matters for BattleFrame

- **Round order is a derived value, not a stored roll.** The engine must track *completion order* — which player exhausted their activations first — and carry it into the next round. This is state most VTT combat trackers don't model: Foundry re-sorts by a stored initiative value each round, which is exactly wrong here.
- **It couples to the unspecified gap.** "Finished first" is only well-defined once you have ruled on [[mechanics-alternating-activation-with-uneven-unit-counts-is-unspecified]] — the two rules are entangled, and the clause is the main evidence for how that gap should be filled.
- **Ties.** If both players have equal unit counts, they finish on the same round-boundary; the player who activated their last unit *first* is the one who "finished first" — i.e. the player who did **not** go first this round goes first next round, so it strictly alternates. With unequal counts it does not. **The rules do not spell this out — this reading is inference (unverified).**

## Contrast

This is the sharpest structural difference from initiative-roll systems, and the crux of [[assessment-opr-activation-vs-per-round-initiative-roll-models]]. There is no per-round randomisation of order at all — order is **deterministic and path-dependent** after round 1.

**Confidence: confirmed** for the quoted rules (v3.5.1 PDF text-extracted). The tie/alternation analysis is **unverified** inference.
