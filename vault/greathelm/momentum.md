---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Momentum

A per-knight resource, tracked with tokens. Cap **3**.

QSR p2, verbatim:

> Knights gain 1 momentum every time they win a clash test (whether attacking or defending).
> Before rolling, an attacking knight may spend any amount of momentum for +1 per momentum spent.
> All knights have a momentum limit of 3. Additional momentum is discarded.

## Sources of momentum

| Source | Amount |
|---|---|
| Sprint (face 6) | +2 |
| Encircle (face 5) | +1 |
| Win any clash test (attacking **or** defending) | +1 |
| Parry defense, on success | +1 additional (so +2 with the clash win) |

## Spending

- **Attacker only.** QSR [[clash-bonuses]] says "(attacker only)"; Kickstarter states it directly: "Defending knights cannot spend momentum." (https://www.kickstarter.com/projects/1674560143/greathelm)
- Committed **before rolling** — a blind bet. See [[clash-test]].
- +1 per point, "any amount", so max **+3**.

## Loss

- A successful [[bash-action]] strips **all** momentum from the defender. This is Bash's entire purpose.
- Overflow past 3 is discarded.

## The economic loop

Movement (6/5) converts into momentum; momentum converts into clash bonuses; winning clashes generates more momentum. The cap of 3 is what stops it running away — and it's the real reason [[action-economy-per-die-not-per-model]] doesn't degenerate. Goonhammer: "A knight can only have up to three momentum tokens at a time so there's sort of a limit to how much running around is worth doing."

Momentum is the bridge between the mobility half of [[dice-face-to-action-mapping]] (high faces) and the damage half (low faces). It is how a good movement roll eventually becomes lethality.

## Not found

Whether momentum persists between rounds. The QSR never says it resets, and the courage phase doesn't clear it — so it plausibly persists, but **this is not confirmed**. Important for engine state modelling; verify against the full rulebook.

Related: [[clash-bonuses]] · [[clash-defenses]] · [[bash-action]]
