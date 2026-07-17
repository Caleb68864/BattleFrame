---
tags: [foundry-vtt, system-development]
source: https://foundryvtt.com/api/classes/foundry.grid.BaseGrid.html , https://github.com/foundryvtt/foundryvtt/issues/11428
confidence: partial
---

# Custom Distance Measurement Has No Clean Override Seam

A sharp edge for any system with non-standard measurement rules.

The canonical method is **`BaseGrid#measurePath`**:
```ts
measurePath<SegmentData>(
  waypoints: (Coordinates2D & Partial<GridMeasurePathWaypointData2D> & SegmentData)[],
  options?: { cost?: GridMeasurePathCostFunction2D<SegmentData> }
): GridMeasurePathResult
```

**The only real extension point is the `cost` callback.** There is no per-call diagonal-rule override: `SquareGrid#diagonals` is **read-only**, baked in at grid construction.

This is an acknowledged, open gap. [foundryvtt#11428](https://github.com/foundryvtt/foundryvtt/issues/11428) — "Allow overriding diagonal rule for calls to `canvas.grid.measurePath()`" — is **still open**, no milestone, no staff response. The requester's workaround is maintaining custom diagonal measurement in their own module.

**Who owns the rule at runtime:** `system.json` `grid.diagonals` is only a default; the GM overrides it via the world setting "Square Grid Diagonals". Systems *declare a preference*, they do not own it.

**v13 moved measurement out of the Ruler.** `foundry.canvas.interaction.Ruler` in v13 exposes only presentational overrides — `_configureOutline()`, `_getSegmentStyle()`, `_getWaypointStyle()`, `_getWaypointLabelContext()`. The v11/v12 computation hooks (`_getMeasurementSegments`, `_getSegmentLabel`, `measure`) do not appear in the v13 docs. The v13 Ruler *renders* measurement; it no longer *computes* it. Target the grid layer, not the ruler.

**Marked partial / not found:**
- `GridLayer.measureDistances` — not found anywhere in the v13/v14 grid API. It was the v11-era API, superseded by the v12 Grid API v2 rewrite ([#10088](https://github.com/foundryvtt/foundryvtt/issues/10088)). Exact removal version unverified.
- `CONFIG.Canvas.rulerClass` — not found in the v13 docs; likely gone. Unverified.

Related: [[gridless-is-a-first-class-grid-class]], [[grid-types-and-diagonal-rules-constants]].
