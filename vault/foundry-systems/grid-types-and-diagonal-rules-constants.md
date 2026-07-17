---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/api/variables/CONST.GRID_TYPES.html , https://foundryvtt.com/api/variables/CONST.GRID_DIAGONALS.html
confidence: confirmed
---

# Grid Types and Diagonal Rules Constants

`CONST.GRID_TYPES` — "The allowed Grid types which are supported by the software":

| Member | Value |
|---|---|
| GRIDLESS | 0 |
| SQUARE | 1 |
| HEXODDR | 2 |
| HEXEVENR | 3 |
| HEXODDQ | 4 |
| HEXEVENQ | 5 |

**Hex naming decoded:** `R` = rows (pointy-top hexes), `Q` = columns (flat-top hexes); `ODD`/`EVEN` selects which row/column is offset. So all four hex orientations are natively supported — there is no "hex support" question for Foundry, it's built in.

`CONST.GRID_DIAGONALS` — "the distance/cost of moving diagonally relative to the distance/cost of a horizontal or vertical move":

| Member | Value |
|---|---|
| EQUIDISTANT | 0 |
| EXACT | 1 |
| APPROXIMATE | 2 |
| RECTILINEAR | 3 |
| ALTERNATING_1 | 4 |
| ALTERNATING_2 | 5 |
| ILLEGAL | 6 |

`ALTERNATING_1` / `ALTERNATING_2` are the 5-10-5 style rules (PF2e/D&D variant). `EQUIDISTANT` is the 5e default. Note these ship in core — a system does not implement them, it selects one via [[system-json-grid-is-a-default-not-a-lock|system.json grid.diagonals]].

Values read from the v14 docs tree; stable since v12.

Grid classes live under `foundry.grid`: `BaseGrid` → `GridlessGrid`, `HexagonalGrid`, `SquareGrid`, with accessors `isGridless()`, `isHexagonal()`, `isSquare()`. `BaseGrid` is generic over 2D **and 3D** coordinates in v13+.

Related: [[custom-distance-measurement-has-no-clean-override-seam]].
