/**
 * Fire-arc bucketing: turns the engine's neutral numeric bearing
 * (game.battleframe.facing.bearingOf, degrees clockwise, 0 = dead ahead) into
 * one of Full Thrust's six 60-degree arcs, and decides whether a weapon that
 * covers a given set of arcs bears on a target at that bearing.
 *
 * The engine owns the geometry (the bearing); THIS is the ruleset's part -- how
 * many arcs, their names, and which one a bearing falls in. Source: FT2/Fleet
 * Book "Fire Arcs" (F, FS, AS, A, AP, FP, clockwise from dead ahead).
 */

import { ARC_DEGREES, FIRE_ARCS, type FireArc } from "../constants";

/** Normalises an angle in degrees into [0, 360). */
function normalise(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * The fire arc a target at `bearing` (degrees, clockwise, 0 = dead ahead) falls
 * in. The fore arc straddles dead ahead (330-30); each subsequent 60-degree arc
 * follows clockwise. Boundaries belong to the clockwise arc (a target at exactly
 * 30 is fore-starboard).
 */
export function arcForBearing(bearing: number): FireArc {
  const index = Math.floor(normalise(bearing + ARC_DEGREES / 2) / ARC_DEGREES);
  return FIRE_ARCS[index];
}

/** Whether a weapon covering `weaponArcs` bears on a target at `bearing`. */
export function weaponBearsOn(weaponArcs: readonly FireArc[], bearing: number): boolean {
  return weaponArcs.includes(arcForBearing(bearing));
}
