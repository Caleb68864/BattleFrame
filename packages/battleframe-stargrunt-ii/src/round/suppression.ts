/**
 * C1 — suppression markers. Suppression is a 0..3 counter (stored as a
 * NumberField, surfaced as a single status icon with a numeric badge). Placing a
 * marker stacks but caps; clearing rolls the Quality die against the unit's
 * leadership value (LV) and removes one marker on a strict exceed.
 */

/** Suppression tops out at three markers. */
export const SUPPRESSION_CAP = 3;

/** Place one marker, capped at the maximum. */
export function placeSuppression(current: number): number {
  return Math.min(SUPPRESSION_CAP, current + 1);
}

/** Remove exactly one marker, never below zero. */
export function removeSuppression(current: number): number {
  return Math.max(0, current - 1);
}

/**
 * A clear attempt: the Quality die roll must STRICTLY exceed the leadership
 * value to remove a marker. The caller decrements with `removeSuppression` on a
 * `true` result — one marker per successful action.
 */
export function clearSuppressionRoll(qualityRoll: number, lv: number): boolean {
  return qualityRoll > lv;
}
