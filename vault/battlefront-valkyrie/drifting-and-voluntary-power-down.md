---
tags: [wargame-research, battlefront-valkyrie]
source: https://www.fatdragongames.com/fdgfiles/battlefront-valkyrie-faq/
confidence: confirmed
---

# Drifting and Voluntary Power-Down

A ship at **Engine 0** — or one that **voluntarily shuts down its engines** — enters a **drifting** state. This is the game's only real status condition.

From the official FAQ (rules v4.5), near-verbatim:

- **Voluntary shutdown is legal.** "Ships may voluntarily shut down engines to drift or be towed."
- **The decision is locked in at the start of the turn and cannot change until the next turn.** This is a commitment mechanic.
- A powered-down ship: **cannot move**, has **no Reserve Power Points**, and operates at **reduced shield power** ([[shield-dice-defense]]).
- **A drifting ship that leaves the map or strikes a medium/large asteroid is destroyed**, unless a scenario says otherwise.
- **A ship that hits Engine 0 without having moved last turn stays stationary** — it "remains stationary until affected by another force (attack, tractor beam, asteroid, etc.)."

That last rule is the crux: **drift direction is inherited from last turn's movement vector.** No prior movement means no drift vector, so the ship simply sits there until something pushes it.

**This is the rule reviewers object to** — see [[known-criticism-initiative-is-fiddly]] ("don't power your engine and your ship stops?!?").

**Engine note:** drift requires persisting *last turn's movement vector* as ship state. That is a frame-to-frame dependency most naive models omit.

Related: [[engine-damage-death-spiral]], [[tractor-beams]], [[asteroids]]
