/**
 * The threshold check: when a hull row completes, each surviving system rolls to
 * survive. FT2 rolls HIGH -- a system is knocked out on a die at or above the
 * kill number (6 / 5 / 4 for the 1st / 2nd / 3rd threshold). Crossing several
 * thresholds in one attack rolls only the worst reached, lowering the kill
 * number by 1 per extra threshold passed. Pure functions; the dice roll and the
 * mapping back onto actual ship systems live in the combat layer.
 *
 * DEFERRED (Fleet Book optional): "Core Systems" (Command Bridge / Power Core /
 * Life Support) rolled at +1 to the threshold number and immune to needle beams
 * are not modelled -- every surviving system rolls on the same table.
 *
 * Source: FT2 "Threshold Check".
 */

import { THRESHOLD_KILL_ON } from "../constants";

/**
 * The die value that knocks a system out at the given threshold. `worst` is the
 * threshold number reached (1, 2, 3...); `extra` is how many *additional*
 * thresholds were crossed in the same attack (0 for a single threshold). Never
 * drops below 2 -- a system is never lost automatically.
 */
export function thresholdKillOn(worst: number, extra: number): number {
  // Clamp `worst` into [1, table length] so a degenerate call cannot index off
  // the table and return NaN (which would silently disable every knockout).
  const clamped = Math.min(Math.max(1, Math.floor(worst)), THRESHOLD_KILL_ON.length);
  const base = THRESHOLD_KILL_ON[clamped - 1];
  return Math.max(2, base - extra);
}

/**
 * Indices of the systems knocked out: those whose rolled die face is at or above
 * `killOn`. `faces[i]` is the die rolled for system i.
 */
export function knockedOutIndices(faces: readonly number[], killOn: number): number[] {
  const lost: number[] = [];
  faces.forEach((face, i) => {
    if (face >= killOn) {
      lost.push(i);
    }
  });
  return lost;
}
