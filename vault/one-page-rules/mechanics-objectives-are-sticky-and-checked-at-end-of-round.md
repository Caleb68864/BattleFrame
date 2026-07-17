---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# Objectives Are Seized at End of Round and Stay Seized After You Leave

The whole scoring system, quoted verbatim from GF Core Rules v3.5.1:

> Place **D3+2 objectives**. Players roll-off to go first, and then alternate in placing one marker each **outside of deployment zones**, and **over 9" away from each other**. **At the end of each round**, if a unit is **within 3"** of a marker while enemies aren't, then it's seized. Markers stay under the player's control **even after leaving**, but if units from both sides are contesting a marker, then it becomes **neutral again**. **The game ends after 4 rounds**, and the player that controls most markers wins.

## The three non-obvious properties

1. **Sticky control.** Once seized, a marker stays yours *"even after leaving"*. You can grab and go. This is unusual — most objective games require continuous presence — and it means objective state is **persistent**, not recomputed from board position each round.
2. **Evaluated only at end of round.** Not continuously, not on activation. A single scoring tick per round. Standing on a marker mid-round means nothing if you're gone (and it was never seized) by round end.
3. **Contest resets to neutral.** If both sides have units within 3", the marker *"becomes neutral again"* — contesting doesn't just block the seize, it **strips existing control**. So an owner can *lose* a marker they'd banked by letting an enemy walk up while they're also present.

## State model

Each marker needs `controller: player | null`, mutated only by the end-of-round tick:
- friendly within 3", no enemies within 3" → `controller = player`
- both sides within 3" → `controller = null`
- nobody within 3" → **unchanged** (sticky)

Shaken units *"can't seize **or contest**"* ([[mechanics-shaken-costs-a-full-activation-to-clear]]) — so Shaken models are invisible to **both** branches; a Shaken unit can't even deny.

Setup: markers *"can't be placed in unreachable positions, like impassable terrain or spots too tight to get to."*

## Victory

- **4 rounds, hard stop** ([[mechanics-the-game-is-exactly-four-rounds-with-no-tabling-win]]).
- Most markers wins.
- **No tiebreaker is stated** in the core rules — **not found**. Ties appear to be genuine draws. The Tournament Guidelines v3.5.0 layer a separate TP/DP tournament-points system *around* the game, but that is scaffolding, not an in-game tiebreak.

**Confidence: confirmed** — quoted from GF Core Rules v3.5.1, cross-checked against the Beginner's Guide. The D3+2 / 3" / 4-round mission is **unchanged from v2.16** — one of the few things that didn't ([[mechanics-rules-versions-v2-vs-v3-differ-materially]]).
