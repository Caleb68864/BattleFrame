---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Clash Test — Opposed d6, Attacker Wins Ties

The universal combat resolution. Triggered by Bash (4), Light Melee (2), Heavy Melee (1) — see [[dice-face-to-action-mapping]].

QSR p2, verbatim:

> Bash, Light Melee Attack, and Heavy Melee Attack actions are clash tests. The defender chooses a defense, and attacker chooses to spend momentum. Then both players roll a d6, add any bonuses, and compare.
>
> Attacker wins if their total is equal to or higher than the defender's. (**Attacker wins ties.**)
> Defender wins if their total is **strictly higher** than the attacker's.

## Strict resolution order — engine-critical

1. Attacker declares the action (spends the die) — requires [[base-contact-and-engagement]].
2. **Defender declares a defense** ([[clash-defenses]]) — *before* any dice are rolled.
3. **Attacker commits momentum** ([[momentum]]) — also *before* rolling, irrevocably.
4. Both roll 1d6, add [[clash-bonuses]].
5. Compare. Attacker wins ties.
6. If the defender lost: roll [[heavy-armor-table]] to see if damage actually lands.
7. Winner gains 1 momentum, either side.

Steps 2 and 3 are blind commitments made before information exists. This is where the bluffing lives, and it is why [[hasty-rolling]] exists as a rule. **Any VTT implementation must enforce this sequencing** — it cannot be collapsed into a single roll.

Note there is no fixed target number and no to-hit stat. Only the opposed roll plus situational modifiers.

## Two-stage resolution

Winning the clash does **not** guarantee damage — the [[heavy-armor-table]] roll can negate it entirely on a 6. So an attack is two independent rolls deep.

Related: [[clash-bonuses]] · [[clash-defenses]] · [[outnumbering]] · [[bash-action]]
