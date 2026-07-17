---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Version Discrepancies — QSR v0.4 vs Kickstarter/Goonhammer

Sources disagree. **This note exists so no one silently trusts the wrong number.**

## Source authority ranking

1. **QSR v0.4 PDF** (`GREATHELM-QSR.pdf`, this folder) — actual rules text, most recent. **Authoritative.**
2. **Kickstarter** (https://www.kickstarter.com/projects/1674560143/greathelm) — designer's own words, but campaign marketing copy, predates fulfillment.
3. **Goonhammer** (https://www.tabletopbattles.com/goonhammer-reviews-greathelm-a-micro-skirmish-game-of-chivalric-fantasy/) — Sep 2025, reviewed a **pre-release copy**, may simplify.

## Known conflicts

| Mechanic | QSR v0.4 | Other source | Verdict |
|---|---|---|---|
| Sprint/Run distance | **5"** | Goonhammer: "Run to move 6"" | **Use 5"** — QSR is newer |
| Initiative winner | "**chooses** whether to go first or second" | Goonhammer: "wins initiative and **activates a model first**" | **Use QSR** — Kickstarter agrees with QSR ("decides who will activate a knight first") |
| Dice pool minimum | no minimum stated | Kickstarter: "**to a minimum of 3 dice**" | Likely both true — QSR omits an edge case. See [[initiative-dice-pool-size]] |
| Dice adjust scope | "one of your **highest** initiative dice" | Kickstarter: "one of your **current** initiative dice" | Probably synonymous; **use QSR's tighter wording**. See [[dice-adjust-rotate-down]] |
| Action names | Sprint / Encircle / Shift | Run / Walk / Step (KS, tray product, **and QSR p5 card**) | **Both are QSR** — p1 vs p5 disagree internally; treat as aliases |

## Note the internal inconsistency

QSR p1 uses **Sprint / Encircle / Shift**; QSR p5's reference card uses **Run / Walk / Step**. Same document. So the naming is unsettled even in v0.4 — the Kickstarter and the licensed initiative tray both use Run/Walk/Step, suggesting *those* are the settled names and p1 is the outlier. `confidence: partial` on that conclusion.

## Standing risk

QSR is **v0.4** — an explicitly pre-1.0, "introductory" document. Kickstarter fulfillment was ~Feb 2026. **Every number in this vault may have changed in the shipped rulebook.** Treat all of it as directionally correct, not final. Do not hard-code constants without a v1.0 check.

Related: [[source-inventory]] · [[open-questions]]
