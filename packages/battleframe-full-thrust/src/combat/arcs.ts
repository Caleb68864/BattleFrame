/**
 * Fire-arc bucketing: turns the engine's neutral numeric bearing
 * (game.battleframe.facing.bearingOf, degrees clockwise, 0 = dead ahead) into
 * one of Full Thrust's six 60-degree arcs, and decides whether a weapon that
 * covers a given set of arcs bears on a target at that bearing.
 *
 * The engine owns the geometry (the bearing); THIS is the ruleset's part -- how
 * many arcs, their names, and which one a bearing falls in. Source: "Fire Arcs"
 * (F, FS, AS, A, AP, FP, clockwise from dead ahead). The 6x60-degree scheme is
 * the Fleet Book / Full Thrust Light standard (original FT2 used 4x90); we use
 * the modern 6-arc model throughout.
 *
 * DEFERRED aft-fire rules: the FTL "aft blind spot" (no weapon fires out of the
 * A arc) is expressed per-weapon by simply omitting "A" from a mount's arcs, so
 * it needs no global rule here. The Fleet Book *conditional* aft fire (all-round
 * turrets may fire aft only on a turn with no main-drive thrust) is NOT modelled
 * -- weaponBearsOn has no access to whether the firer thrusted this turn.
 */

import { ARC_DEGREES, FIRE_ARCS, type FireArc } from "../constants";

// A local copy of the engine's normaliseDegrees: ruleset code does not import
// engine internals (only the runtime game.battleframe surface), and this is a
// one-line pure helper -- duplicating it is cheaper than a runtime dependency.
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
  // A non-finite bearing (degenerate geometry) must still yield a valid arc, not
  // `undefined` -- default to dead ahead. The firing orchestrators separately
  // reject a non-finite range, so this never produces a spurious in-arc hit.
  const safe = Number.isFinite(bearing) ? bearing : 0;
  const index = Math.floor(normalise(safe + ARC_DEGREES / 2) / ARC_DEGREES);
  return FIRE_ARCS[index];
}

/** Whether a weapon covering `weaponArcs` bears on a target at `bearing`. */
export function weaponBearsOn(weaponArcs: readonly FireArc[], bearing: number): boolean {
  return weaponArcs.includes(arcForBearing(bearing));
}
