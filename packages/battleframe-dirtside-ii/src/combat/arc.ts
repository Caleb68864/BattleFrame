/**
 * A9 — symmetric fire-arc predicate (build plan §1a, §4).
 *
 * Consumes an observer-relative bearing (0 = dead ahead) as produced by the
 * engine's `facing.bearingOf`, and answers whether it falls inside a symmetric
 * arc of the given half-angle. The half-angles are GEOMETRY constants (arc sizes
 * are rules-agnostic angles, not GZG design data). Only the `normaliseDegrees`
 * atom and this predicate are engine-extraction candidates; the arc-name → angle
 * mapping stays module-local (see plan §7).
 */

/** Fire-arc half-angles by mount type. Pure geometry, no GZG numbers. */
export const ARC_HALF_ANGLE = {
  turret360: 180,
  turret180: 90,
  fixed30: 15,
  walker180: 90,
  artillery180: 90,
} as const;

export type ArcName = keyof typeof ARC_HALF_ANGLE;

/** Normalise any angle into `[0, 360)`. */
function normaliseDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * True when a relative `bearingDeg` lies within `halfAngleDeg` of dead-ahead on
 * either side. Boundary bearings are included; bearings wrap at 360.
 */
export function inArc(bearingDeg: number, halfAngleDeg: number): boolean {
  const bearing = normaliseDegrees(bearingDeg);
  return bearing <= halfAngleDeg || bearing >= 360 - halfAngleDeg;
}
