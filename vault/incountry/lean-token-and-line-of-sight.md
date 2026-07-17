---
tags: [wargame-research, incountry]
source: https://blog.kaiscastle.com/2026/06/16/inx-incountry-review/
confidence: partial
---

# Lean Token — Shoot From Cover Without Full Exposure

The **lean token** models peeking out from behind cover.

**Confirmed:** the lean token "permits line-of-sight drawing without full exposure, allowing units to benefit from cover while shooting" (https://www.boardgamequest.com/inx-incountry-review/) — it lets you "target an enemy without completely exposing yourself" (https://blog.kaiscastle.com/2026/06/16/inx-incountry-review/).

## Why this matters architecturally

This is the interesting one for a VTT engine. It means **line of sight is not a pure geometric function of model position.** A model's LOS and its exposure are decoupled and mediated by a *declared state* (the lean token). Two models on identical footprints can have different LOS depending on whether they've leaned.

An engine that computes LOS purely from `(position, terrain)` cannot represent this. LOS needs to be a function of `(position, terrain, lean_state)` — and lean state is a player decision, which implies it is also **information other players can see** (the token is on the table).

## Unknowns (not found)

- **When** the lean token is taken — during activation as part of the move? As the shoot action? Free?
- Whether leaning has a **cost** or downside (does it expose you to reactions? forfeit something?).
- Whether the cover benefit is a defence bonus, a save bonus, or an attack penalty to the shooter — sources say "benefit from cover" without specifying.
- Whether lean persists across rounds.
- Whether there is any general cover rule *independent* of leaning. **Not found.**

Related: [[combat-resolution-d10]], [[action-economy-move-then-shoot-or-react]], [[reaction-token-overwatch]]
