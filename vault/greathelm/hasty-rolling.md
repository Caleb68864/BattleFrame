---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: confirmed
---

# Hasty Rolling — The Null Defense

A real rule, not flavour. QSR p2, verbatim:

> **hasty rolling!**
> If the defender wins the clash but forgot to declare a defense in advance: the attack misses and no other defense effects apply. The defender gains 1 momentum.

## What it is

The fallback when a player rolls a [[clash-test]] without having declared a [[clash-defenses]] choice. Outcome: the defence still *works* (attack misses), but you get **no rider** — no Riposte damage, no Parry momentum, no Dodge move, no shield +2.

You still gain the standard 1 momentum for winning a clash ([[momentum]]) — so "The defender gains 1 momentum" is restating the normal win reward, not granting a bonus. `confidence: partial` — that's my reading; the rule could be read as a separate grant, but that would make forgetting your defense *better* than Block, which is incoherent.

## Why it's engine-relevant

Its existence tells you the declaration ordering in [[clash-test]] is fumbled often enough at the table to need a written fallback. In a VTT this rule becomes largely vestigial — software can simply *require* the declaration before allowing the roll — but it also tells you the correct default: **an undeclared defense is a valid state that resolves as a bonus-free defense**, not an error or an auto-loss.

Useful as the AI/timeout default, and for solo play.

Related: [[clash-defenses]] · [[clash-test]]
