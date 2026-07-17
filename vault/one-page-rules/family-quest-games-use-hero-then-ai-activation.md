---
tags: [wargame-research, one-page-rules]
source: https://www.onepagefan.wiki/index.php/Grimdark_Future_Star_Quest_Core_Rules
confidence: partial
---

# The Quest Games Break Alternating Activation — Heroes First, Then an AI

**Star Quest** and **AoF: Quest** are the first genuine exception to [[mechanics-alternating-unit-activation-is-the-core-turn-structure]]. They are **solo/co-op dungeon crawls vs an AI**, 1-4 players, 12-15 models, 45-60 min.

Activation, verbatim:

> Each round, players activate all heroes first, and then the AI activates all units in order from the **closest to a hero to the furthest**.

So: **not alternating.** It is a two-phase round — *all* heroes, then *all* AI — and AI activation order is **derived from board state** (proximity to the nearest hero), recomputed rather than fixed.

## A richer action economy

> Heroes may take any one action plus one **Skill** action (in any order), and may suffer **2 stress** to take any one **additional** action.

Compare GF's one-action-from-four ([[mechanics-four-actions-hold-advance-rush-charge]]). Quest adds **Rest** and **Skill** actions, a **stress** resource, and **stress-for-actions** — a genuine economy rather than an enum pick.

Quest also adds stats GF lacks: **Str / Dex / Wil / End**, plus power and stress ([[mechanics-quality-and-defense-are-the-only-two-stats]]).

## The AI is a published decision tree

The AI is a deterministic 3-step procedure: **line of sight → advance/shoot or charge → else rush to nearest AI Goal.**

This is significant for BattleFrame: it is **specified, deterministic, and implementable** — no judgement calls. A Quest implementation could genuinely automate the opponent, which is an unusual and attractive property for a VTT (solo play in Foundry is normally awkward).

## What Quest still shares

The dice core survives intact: Quality tests, the 6-always-succeeds clamp, hit→block resolution, and the special-rules glossary ([[mechanics-two-roll-combat-hit-then-block]]).

So Quest needs a **hero/stress/AI layer on top of a shared dice core** — a bigger lift than [[family-firefight-differs-in-damage-not-activation]], but far from a rewrite. Notably it requires the engine's turn structure to be **pluggable**, not merely parameterised: "all A, then all B (ordered by proximity)" is not a variation on "alternate one each."

Campaigns differ too — Quest persists levelled individual heroes with gold and gear ([[mechanics-campaign-persistence-xp-injuries-and-permadeath]]).

**Confidence: partial** — the activation, action economy and AI tree are **confirmed** quotes, but from the **community wiki at v3.4.1**, not the official **v2.0.1** Quest PDFs, which were not opened. Note the wiki stamps a global "3.4.1" on a game officially at v2.0.1 ([[family-eight-current-rulesets-in-two-version-families]]) — its version labelling is unreliable, so treat exact details as provisional. **Star Quest ↔ AoF: Quest are textually identical** apart from naming ([[family-gf-and-aof-are-the-same-engine-reskinned]]).
