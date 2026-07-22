/**
 * Preview geometry for the plotting overlay: turns a computed movement path
 * (mu displacements) into absolute pixel points for a line-and-arrow drawn on
 * the plotting player's canvas as they fill in the order. Pure -- the PIXI
 * drawing consumes these points; nothing here touches the canvas.
 */

import type { MovementPath } from "./path";

export interface Pt {
  x: number;
  y: number;
}

/**
 * The polyline of the plotted path in absolute pixels: the ship's start, the
 * mid-turn waypoint, and the final position. `pxPerMu` converts the path's mu
 * displacements to pixels.
 */
export function previewPointsPx(startPx: Pt, path: MovementPath, pxPerMu: number): Pt[] {
  return [
    { x: startPx.x, y: startPx.y },
    { x: startPx.x + path.waypoint.dx * pxPerMu, y: startPx.y + path.waypoint.dy * pxPerMu },
    { x: startPx.x + path.end.dx * pxPerMu, y: startPx.y + path.end.dy * pxPerMu }
  ];
}

/** Half-angle of the arrowhead barbs, radians (~28 degrees). */
const ARROW_BARB_ANGLE = 0.5;

/**
 * The two barb points of an arrowhead at `to`, pointing along the direction from
 * `from` to `to`, each `size` pixels back from the tip. Returns the tip's start
 * point unchanged when `from` and `to` coincide (no direction).
 */
export function arrowHeadPx(from: Pt, to: Pt, size: number): [Pt, Pt] {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const barb = (offset: number): Pt => ({
    x: to.x - size * Math.cos(angle + offset),
    y: to.y - size * Math.sin(angle + offset)
  });
  return [barb(-ARROW_BARB_ANGLE), barb(ARROW_BARB_ANGLE)];
}
