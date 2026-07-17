---
tags: [wargame-research, greathelm]
source: inference
confidence: unverified
---

# Open Questions — What Is NOT Known

Consolidated gaps. **Every item here is unknown. None should be guessed at during architecture design.** Ranked by architectural blast radius.

## Tier 1 — blocks data-model decisions

1. **Scene transition payload.** What carries between scenes — damage, momentum, casualties? ([[scenes]]) Determines whether the engine needs a scenario-level state machine and what it serialises. **Biggest unknown.**
2. **Campaign persistence.** What survives between games? ([[campaign-play]]) Determines whether `Knight` has cross-session identity. Currently it has none ([[knights-have-no-stat-line]]).
3. **Warband construction.** Points? Roles? Loadout menu? ([[warband-construction]]) Determines whether a list-builder exists at all.
4. **Does momentum persist between rounds?** ([[momentum]]) Never stated. Straightforward but genuinely unresolved, and it changes round-boundary cleanup.

## Tier 2 — changes rules resolution

5. **Outnumbering geometry.** Does an ally touching *your own* combatant count, or must it touch the enemy? ([[outnumbering]]) Two defensible readings; materially different bonuses.
6. **Courage cascade within a phase.** Does a knight fleeing mid-phase raise difficulty for subsequent tests that same phase? ([[courage-test]]) Changes the death-spiral rate a lot.
7. **Voluntary pass.** May you pass while holding a legal die? ([[turn-options-activate-adjust-pass]]) Strict reading says no.
8. **Full-game objectives and scoring.** QSR is last-man-standing only ([[victory-condition-quickstart]]). Scenario/VP system entirely unknown.
9. **Round limits.** Goonhammer says scenarios specify them; QSR has none.

## Tier 3 — content gaps

10. **Complete equipment list**, costs, legality (shield + two-handed?). ([[equipment]])
11. **Light armour table** full breakdown. ([[heavy-armor-table]])
12. **Ranged combat rules** — bows (step 2) / crossbows (step 1) beyond their step placement.
13. **Item rules** (resolve at step 4).
14. **Terrain rules** beyond "cannot move through".
15. **Exact-tie initiative tiebreak.** ([[initiative-order-determination]])
    - **Status:** genuinely **not found** in QSR v0.4. The rulebook covers "most 6s chooses",
      "neither has 6s → cascade to 5s, 4s…", and "only one player has 6s → forced first". It
      does **not** cover equal, non-zero counts at every face.
    - **Implementation decision (INVENTED HOUSE RULE — not a rule from the rulebook):**
      `determineInitiative` returns `{ result: "tie" }` rather than guessing, and callers
      re-roll the tied pools. Decreed in the "Decisions (SS-10)" block of
      `docs/specs/2026-07-16-battleframe-core-mvp.md`. Recorded here because
      `packages/battleframe-greathelm/src/round/dice-pool.ts:56-63` cites this entry — it
      previously pointed at nothing.
    - **Do not present the re-roll as a real rule.** Close this by buying the ~$25 full
      rulebook; the QSR is v0.4 and explicitly introductory.
    - **Known gap (2026-07-16 converge pass 1):** no caller consumes the `"tie"` outcome, so
      the re-roll is documented but **not implemented**. Tracked separately — see the converge
      report.
16. **Mutual wipe-out / draw handling.** ([[victory-condition-quickstart]])
17. **Healing** — no mechanism found. ([[damage-and-removal]])
18. **Solo rules.**

## How to close them

Buy the full rulebook (~$25, Indie Tabletop Club early access). See [[source-inventory]]. Note also that everything known is from **v0.4**, pre-1.0 — see [[version-discrepancies-qsr-vs-kickstarter]].

## Standing instruction

Where an answer is needed before the rulebook arrives, **make the unknown an explicit, swappable seam in the architecture** rather than picking a plausible rule and hard-coding it. See [[engine-implications]].

Related: [[source-inventory]] · [[engine-implications]]
