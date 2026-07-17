---
tags: [wargame-research, battletech]
source: http://www.masterunitlist.info/Unit/QuickList
confidence: confirmed
---

# Hex vs Inches — The Architectural Fault Line Between the Two BattleTechs

The two BattleTech flavours **do not share a spatial model**, and this is the deepest architectural split between them.

## Alpha Strike: inches (confirmed)

The MUL API returns movement as a **string with an inch mark**:

```json
"BFMove":"6\""
```

Alpha Strike is played with a **tape measure on an open table** — the same spatial model as One Page Rules, Warhammer, and essentially every modern skirmish game. Distance is continuous; facing is loose; line of sight is drawn.

## Classic BattleTech: hexes (confirmed)

`.mtf` files encode `walk mp:3` — **Movement Points**, spent hex-by-hex ([[megamek-mtf-unit-format]]). MegaMek's own description: *"a turn-based sci-fi boardgame… on a **hex-based map**."*

Classic requires:
- a **hex grid** with defined terrain per hex
- **facing** — which of 6 hexsides the unit fronts (drives hit-location side tables)
- **MP costs** per hex by terrain type
- hex-based **line of sight**

## Why this is a fault line, not a setting

A hex game isn't "an inches game with a grid overlay." Facing-as-hexside, MP budgets, and hex-LOS are *load-bearing* rules that reach into combat resolution — in Classic, the hexside you're hit from **selects which hit-location table is rolled** ([[classic-battletech-mechanics]]).

Foundry VTT does support hex grids natively, so the *rendering* is solved. The hard part is that an engine designed around **"measure inches, no facing, resolve attack"** has no place to put "which of 6 hexsides did this attack cross, and what's the MP cost of that woods hex."

## The consequence for engine design

| | Alpha Strike | Classic |
|---|---|---|
| Distance | **Inches**, continuous | **Hexes**, discrete |
| Facing | Minimal | **6 hexsides, rules-critical** |
| Movement | Move up to `6"` | Spend MP per hex by terrain |
| Fits a paper-sized skirmish engine? | **Yes, naturally** | **No, not without a hex/facing subsystem** |

Alpha Strike drops into an inches-based engine essentially for free. Classic demands the engine grow a genuine hex-and-facing spatial layer — which is exactly the stress-test value described in [[engine-fit-assessment]].
