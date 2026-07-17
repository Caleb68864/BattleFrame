---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: confirmed
---

# The Game Is Exactly Four Rounds, and You Cannot Win by Destroying the Enemy

Two hard facts that shape the whole design.

**Fixed length.** *"The game ends after 4 rounds"* — stated three separate times across the v3.5.1 Core Rules and Beginner's Guide. There is **no random game length**, no roll-to-continue, no variable turn count. A game is deterministically 4 rounds long.

**No tabling win.** Beginner's Guide v3.5.1, explicitly:

> unless stated otherwise, players don't ever win the game by fully destroying their opponent's army.

This is an unusually explicit *non*-condition, and it is worth taking seriously: destroying every enemy unit **does not end the game or win it**. You still play out the rounds and count markers ([[mechanics-objectives-are-sticky-and-checked-at-end-of-round]]). An army wiped out simply cannot contest, so it usually loses on markers — but the win is *always* on objectives.

## Consequences for BattleFrame

- **The engine needs no "army destroyed" victory check.** Only a round counter and an objective tally. This is a genuinely small win-condition surface.
- **A round counter is a first-class concept**, and terminal at 4. Foundry's combat tracker increments rounds naturally; the engine hooks end-of-round for both scoring and Fatigue clearing ([[mechanics-fatigue-punishes-striking-first]]).
- **Both end-of-round hooks matter**: objectives are scored at end of round, and Fatigue clears at end of round. Ordering between them is unspecified but shouldn't interact.
- **Zero-unit edge case.** If a player has no units left, the alternating-activation loop must still advance rounds to 4 without deadlocking. This intersects [[mechanics-alternating-activation-with-uneven-unit-counts-is-unspecified]] — a player with *zero* units is the degenerate case of "uneven counts," and is equally unaddressed by the rules.

## Setup facts

- **Battlefield**: *"6'x4' area, with 15+ pieces of terrain. The game can be also played on smaller areas, as long as armies deploy at least 24" apart."*
- **Deployment**: roll-off winner picks a long table edge; players alternate placing one unit each **within 12"** of their edge ([[mechanics-first-player-next-round-is-whoever-finished-activating-first]]).

**Confidence: confirmed** — 4 rounds and the no-tabling clause quoted from v3.5.1 primary sources; unchanged from v2.16. **Not found:** any tiebreaker for equal marker counts at the end of round 4.
