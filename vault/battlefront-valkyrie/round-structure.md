---
tags: [wargame-research, battlefront-valkyrie]
source: https://www.rpgpub.com/threads/battlefront-valkyrie.11275/
confidence: confirmed
---

# Round Structure: Four Phases

A game round proceeds through **four strictly ordered phases**, all players participating in each phase before moving to the next. This is a *phase-major* structure, not a unit-major one — models do not "activate" and do everything at once.

1. **Command Phase** — allocate reserve power; sensor rolls determine initiative. See [[initiative-via-sensor-roll]] and [[reserve-power-allocation]].
2. **Movement Phase** — split alternating movement. See [[movement-alternating-half-all-half]].
3. **Combat Phase** — IGO-UGO, one ship at a time. See [[combat-igo-ugo-one-ship-at-a-time]].
4. **Repair Phase** — ships attempt to restore engine and hull points. See [[repair-phase]].

**Engine-architecture note:** this is the single most important structural fact. Because movement and combat are separate global phases, a per-model "activation" abstraction is the *wrong* primitive here. The correct primitive is a phase state machine with per-phase ordering rules that differ from each other (movement uses split-alternating; combat uses strict alternating).

Related: [[game-identity]], [[action-economy-is-not-activation-based]]
