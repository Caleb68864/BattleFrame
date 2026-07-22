/**
 * C2/C3 — the two morale rolls. Both use the same strict-exceed mechanic against
 * `LV + threatLevel`, but return different things: the confidence test grades how
 * far a failure falls (drop one, or two on a half-or-less roll) and moves the
 * confidence ladder; the reaction test is a bare pass/fail that never touches
 * confidence (a failure just costs the action).
 *
 * Pure: takes the rolled Quality value and the numeric inputs; the caller clamps
 * the confidence rung and applies the loss.
 */

export interface ConfidenceTestResult {
  /** Rungs of confidence lost: 0 (held), 1 (failed), or 2 (half-or-less). */
  drop: 0 | 1 | 2;
}

/**
 * C2 — confidence test. Score = LV + threat. Roll strictly above the score holds
 * (drop 0); at or below drops one; at or below HALF the score (floor) drops two.
 */
export function confidenceTest(
  qualityRoll: number,
  lv: number,
  threatLevel: number
): ConfidenceTestResult {
  const score = lv + threatLevel;
  if (qualityRoll > score) {
    return { drop: 0 };
  }
  if (qualityRoll <= Math.floor(score / 2)) {
    return { drop: 2 };
  }
  return { drop: 1 };
}

/**
 * C3 — reaction test. Same `roll > LV + threat` mechanic; a pass lets the
 * reaction proceed, a fail loses the action. Never changes confidence (distinct
 * return type from the confidence test). Mission Motivation is not consulted here
 * — it only scales how often confidence tests are taken.
 */
export function reactionTest(qualityRoll: number, lv: number, threatLevel: number): boolean {
  return qualityRoll > lv + threatLevel;
}
