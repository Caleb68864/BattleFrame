---
tags: [wargame-research, greathelm]
source: https://malev-da-shinobi.itch.io/great-helm-pt
confidence: partial
---

# Knights Have No Stat Line

In QSR v0.4, a knight has **no statistics at all**. No Move, no Weapon Skill, no Toughness, no Attacks, no Wounds value.

Every knight is mechanically **identical**. The only differentiator is [[equipment]].

## The complete knight state

```
Knight {
  position: (x, y)      // and base size
  damage:   0..3        // [[damage-and-removal]]
  momentum: 0..3        // [[momentum]]
  equipment: [...]      // one-handed / two-handed / shield
}
```

That is the entire model. Notably absent: any per-model identity, name, role, or rating.

## Where variance comes from instead

| Conventional source | GREATHELM equivalent |
|---|---|
| Move stat | The die face you spend ([[dice-face-to-action-mapping]]) |
| To-hit / WS | Opposed d6 ([[clash-test]]) — no stat at all |
| Strength / AP | Action choice: Light (1 dmg) vs Heavy (2 dmg) |
| Toughness / Save | [[heavy-armor-table]] — same for everyone |
| Wounds | Flat 3 for everyone |
| Leadership | [[courage-test]] — derived from damage + casualties, no stat |

All differentiation is **situational**: position, momentum, outnumbering, and which dice you happen to hold. This is why a stat-less model works.

## `confidence: partial` — scope caveat

Confirmed **for the quickstart**. Whether the full game adds stat lines, named characters, or knight types is **not found**. Given the QSR is explicitly "an introductory ruleset", absence here is weak evidence about the full game. Goonhammer's mentions of light armour and bows/crossbows show the full game at least has more equipment variety.

Related: [[equipment]] · [[warband-construction]] · [[engine-implications]]
