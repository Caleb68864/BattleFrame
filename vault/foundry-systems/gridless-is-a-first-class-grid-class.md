---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/api/classes/foundry.grid.BaseGrid.html , https://foundryvtt.com/article/measurement/
confidence: partial
---

# Gridless Is a First-Class Grid Class

Relevant because miniature skirmish wargames measure in true inches, not squares.

`foundry.grid.GridlessGrid extends BaseGrid` (`CONST.GRID_TYPES.GRIDLESS = 0`). It honours the same `measurePath` contract as square and hex — **gridless is Euclidean point-to-point measurement, not a degenerate special case**.

Useful properties:
- `units` is a free-form string, so `"in"` works exactly as `"ft"` does.
- `distance` still defines what one grid space (pixel `size`) represents — this is how you set scale even with no grid drawn.
- `GridlessGrid` never consults `diagonals`. No diagonal rule, no snapping. Correct for skirmish play.
- Fully per-scene, like any grid — see [[system-json-grid-is-a-default-not-a-lock]].

**Known limitation (confirmed):** from the measurement article — "Gridless maps will not show highlighted spaces, though it will still show the area of the effect." Templates render true shape; no space highlighting.

**Not found / unverified:** nothing in the official docs about true edge-to-edge (base-to-base) token measurement, which is what miniature rules actually require. Foundry measures **center-to-center** by default. No official article on gridless/true-inch wargame play exists. Closing this gap looks like custom work on top of `GridlessGrid`, and [[custom-distance-measurement-has-no-clean-override-seam|the seam for that is thin]].

This is a genuine open risk for Battleframe and worth an early spike.
