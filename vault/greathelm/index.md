---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# GREATHELM — Research Index

Design reference for a Foundry VTT game engine. **Goal was the *shape* of the mechanics, not reproduction of the rules.**

Primary source `GREATHELM-QSR.pdf` (this folder) — *Malev greathelm QSR v0.4*, the official free quickstart. Most notes below are quoted directly from it.

> [!warning] Confidence discipline
> Every note is marked `confirmed` / `partial` / `unverified` in frontmatter. **`unverified` means my inference — not a rule.** Gaps are recorded as "not found" rather than guessed. See [[open-questions]] before designing anything, and [[version-discrepancies-qsr-vs-kickstarter]] before trusting any constant — the QSR is v0.4, pre-1.0.

## Start here

- [[greathelm-overview]] — what the game is: 6v6 knights on a sheet of paper.
- [[initiative-dice-are-the-action-menu]] — **the key insight**: the dice pool *is* initiative, action economy, action selection, and sequencing, all at once.
- [[engine-implications]] — what all this means for a Foundry port.
- [[open-questions]] — what is genuinely unknown. Read before architecting.

## Round structure

- [[game-phases-round-structure]] — Initiative → Battle → Courage, every round.
- [[initiative-dice-pool-size]] — pool = knights + 1; start at 7; shrinks as you lose.
- [[initiative-phase]] — roll, organise into descending rows, re-roll non-6s once.
- [[initiative-order-determination]] — most 6s *chooses* first or second; sole-6s holder is forced first.
- [[battle-phase-initiative-steps]] — play walks down 6→1; movement resolves before violence, always.
- [[courage-phase]] — who tests, and in what order.

## Taking a turn

- [[turn-options-activate-adjust-pass]] — exactly three options; each ends your turn.
- [[dice-face-to-action-mapping]] — **the central table**: face value hard-selects the action.
- [[action-economy-per-die-not-per-model]] — no activation limit; one knight can take every action.
- [[dice-adjust-rotate-down]] — burn a turn to walk a die down one pip. Downgrade only.

## Combat

- [[clash-test]] — opposed d6, attacker wins ties, two blind commitments first.
- [[clash-bonuses]] — the five modifiers; weapons are bound to specific initiative steps.
- [[clash-defenses]] — Parry / Riposte / Block / Dodge, declared before rolling.
- [[outnumbering]] — the positional +1s that make the game strategic.
- [[bash-action]] — the clash that deals no damage; strips momentum and repositions.
- [[heavy-armor-table]] — the *second* roll: 6 shrugs it off, 1 pierces for +1.
- [[hasty-rolling]] — the null defense, and the correct software default.

## Resources and attrition

- [[momentum]] — cap 3; the bridge from mobility to lethality; attacker-only spend.
- [[damage-and-removal]] — cap 3, immediate removal, no healing found.
- [[courage-test]] — d6 ≥ (allies lost + own damage); the real death spiral.

## Space

- [[movement-and-measurement]] — real inches, not zones. Sprint 5" on an 8.5"×11" board.
- [[base-contact-and-engagement]] — the only engagement concept; disengaging is free.
- [[play-area-and-setup]] — free alternating deployment, ≥1" from edges, contact allowed.

## Above the round

- [[scenes]] — a "scene" *is* the play area; scenarios chain scenes. Transitions unknown.
- [[victory-condition-quickstart]] — last man standing — **quickstart only**, not the real scoring.

## Warband

- [[knights-have-no-stat-line]] — knights are mechanically identical; no stats exist.
- [[equipment]] — the only differentiator; QSR shows three items and no list.
- [[warband-construction]] — **not found.** No points system evidenced.
- [[campaign-play]] — **exists, mechanics not found.** One line of back-cover copy.

## Meta

- [[source-inventory]] — every source, what it gave, and the PDF's provenance.
- [[version-discrepancies-qsr-vs-kickstarter]] — where sources conflict and which wins.

## Answers to the original nine questions

| # | Question | Status | Note |
|---|---|---|---|
| 1 | Initiative/activation | ✅ confirmed | [[initiative-phase]], [[initiative-order-determination]], [[battle-phase-initiative-steps]] |
| 2 | Actions | ✅ confirmed | [[dice-face-to-action-mapping]], [[action-economy-per-die-not-per-model]] |
| 3 | Movement | ✅ confirmed | [[movement-and-measurement]] — real inches |
| 4 | Clash test | ✅ confirmed | [[clash-test]] |
| 5 | Damage/wounds/momentum | ✅ confirmed | [[damage-and-removal]], [[momentum]], [[heavy-armor-table]] |
| 6 | Objectives & scoring | ⚠️ QSR only | [[victory-condition-quickstart]] — full system **not found** |
| 7 | Warband construction | ❌ **not found** | [[warband-construction]] |
| 8 | Campaign play | ❌ **not found** | [[campaign-play]] |
| 9 | Scenes | ⚠️ partial | [[scenes]] — defined; transitions **not found** |
