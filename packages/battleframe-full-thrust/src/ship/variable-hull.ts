/**
 * Fleet Book 1 OPTIONAL variable hull strength (roadmap P2 #19). The Fleet Book
 * alternative to FT2's fixed Military/Merchant damage rule: hull boxes become a
 * purchasable design choice. An opt-in layer -- it does NOT change the FT2 fixed
 * model in ship/hull.ts (warshipDamagePoints) or ship/design.ts. The row/threshold
 * layout reuses ship/hull.ts rowBoundaries so the damage-track structure is shared.
 *
 * Source (user's "Variable Hull Strength" note): "you choose a hull integrity
 * grade from Fragile to Super. The grade consumes a percentage of the ship's total
 * MASS, and that same MASS figure becomes the ship's damage (hull) boxes. ...
 * Points cost of the hull integrity is always 2 x the MASS used on it." The five
 * grades take 10/20/30/40/50 percent of MASS. "Damage boxes are split into 4 rows;
 * if not divisible by 4, extra boxes go in the upper rows."
 *
 * ASSUMPTIONS (flagged, not invented):
 *  - The note's worked example is a MASS-60 ship, where every grade's percentage
 *    is a whole number of boxes. It does not state how a fractional box count
 *    rounds. We use nearest-integer rounding (Math.round); if the intent was
 *    floor/ceil this is a one-line change.
 *  - Points cost is derived straight from the note ("2 x the MASS used") and, since
 *    boxes == MASS used, equals 2 x boxes -- independent of the total MASS. The
 *    total MASS only bounds which grades/box counts are legal (10-50 percent).
 */

import { VARIABLE_HULL_GRADE_PERCENT, VARIABLE_HULL_POINTS_PER_MASS, VARIABLE_HULL_ROWS } from "../constants";
import { rowBoundaries } from "./hull";

export type HullGrade = keyof typeof VARIABLE_HULL_GRADE_PERCENT;

/** The five hull-integrity grades, weakest to toughest. */
export const HULL_GRADES: readonly HullGrade[] = ["fragile", "weak", "average", "strong", "super"];

/**
 * Hull (damage) box count for a chosen grade on a ship of `totalMass`: the grade's
 * percentage of the total MASS (rounded to a whole box -- see the file's rounding
 * assumption). Under this system that box count is also the MASS spent on the hull.
 */
export function hullBoxesForGrade(totalMass: number, grade: HullGrade): number {
  return Math.round((totalMass * VARIABLE_HULL_GRADE_PERCENT[grade]) / 100);
}

/**
 * The MASS a chosen hull-box count consumes. In this system the box count IS the
 * MASS figure, so this is the identity -- named for the callers that reason about
 * the ship's MASS budget rather than its damage track.
 */
export function variableHullMassUsed(boxes: number): number {
  return boxes;
}

/**
 * Points cost of a chosen hull-box count: 2 x the MASS used, and MASS used == the
 * box count, so 2 x boxes. (Every grade costs the same per box; toughness is paid
 * for in MASS, not in a higher points multiplier.)
 */
export function variableHullPointsCost(boxes: number): number {
  return VARIABLE_HULL_POINTS_PER_MASS * boxes;
}

/**
 * Points cost of a grade on a ship of `totalMass`: the cost of the box count that
 * grade yields. Convenience over hullBoxesForGrade + variableHullPointsCost.
 */
export function hullPointsForGrade(totalMass: number, grade: HullGrade): number {
  return variableHullPointsCost(hullBoxesForGrade(totalMass, grade));
}

/**
 * The damage-track layout for a variable box count: cumulative box counts at which
 * each of the `rows` (default 4) completes, reusing ship/hull.ts rowBoundaries so
 * uneven boxes go into the upper rows (Fleet Book) exactly as the fixed FT2 track
 * does. The last entry equals `boxes` (destruction).
 */
export function variableHullLayout(boxes: number, rows: number = VARIABLE_HULL_ROWS): number[] {
  return rowBoundaries(boxes, rows);
}
