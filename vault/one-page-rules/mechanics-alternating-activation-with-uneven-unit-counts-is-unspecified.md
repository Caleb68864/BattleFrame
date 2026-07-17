---
tags: [wargame-research, one-page-rules]
source: https://cdn.prod.website-files.com/636c3b6dcdb4eb2dce722889/692dd5132221284157f8fc82_GF%20-%20Core%20Rules%20v3.5.1.pdf
confidence: unverified
---

# What Happens When One Player Has More Units Than the Other Is NOT Specified

**A genuine gap in the rules, sitting directly on the critical path of any turn engine.** Flagging it loudly because it is exactly the kind of hole an implementation must fill and a researcher must not paper over.

[[mechanics-alternating-unit-activation-is-the-core-turn-structure]] says players "alternate in activating one unit each." Army lists are built to equal **points**, not equal **unit counts** ([[mechanics-army-construction-is-points-based-with-optional-force-org]]) — so **unequal unit counts are the normal case**, not an edge case. One player runs out of units first, and the rules never say what then.

## Sources searched — all negative

Searched for `more units` / `fewer` / `uneven` / `remaining` / `consecutive` across:
- GF Core Rules v3.5.1
- GF Beginner's Guide v3.5.1
- GF Tournament Guidelines v3.5.0
- OPR Community Wiki Rules FAQ

**Zero hits in all four.** Even the Tournament Guidelines — the document that exists precisely to close competitive ambiguities — is silent.

## The inference (explicitly unverified — do not cite as a rule)

The round-order rule keys off *"the player that finished activating first on the last round"* ([[mechanics-first-player-next-round-is-whoever-finished-activating-first]]). That clause is **only meaningful if a player can run out of units before the other**. It presupposes the player with fewer units finishes first, the player with more activates their surplus **consecutively** at the end, and is then "punished" by ceding first activation next round — a neat self-balancing loop where more units buys tempo now and costs it later.

This reading makes the clause do real work and is almost certainly the intent. **But no fetched source states it.** It is inference.

## Why this is a decision, not a lookup

The gap is by design. The ruleset's own stated top-level rule:

> The most important rule: Whenever the rules are unclear, use common sense and personal preference. Have fun!

A two-page paper game can punt to the players. **A digital engine cannot** — it must do *something* when a player has no legal activation. BattleFrame must make an explicit, documented ruling. Candidate policies:

1. **Surplus activates consecutively** at the end of the round (matches the inference above; most likely intended).
2. **Interleave/stagger** the surplus across the round (some alternating-activation games do this; **no OPR support**).
3. **Pass tokens** (**no OPR support** — invented).

Recommend (1), **documented as a house ruling, not as an OPR rule**, and ideally configurable.

**Confidence: unverified** for the resolution; **confirmed** that no official source addresses it (four documents searched). Relevant API surface: `/api/tts` exposes a pre-computed `activationCount` per list ([[api-tts-endpoint-schema-is-a-ready-made-import-format]]), which is exactly the number this gap turns on.
