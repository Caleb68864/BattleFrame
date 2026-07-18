/**
 * Suppression is INX's morale system (rulebook F) -- there is no separate flee
 * test. When an infantry model in a unit is destroyed, the unit rolls one d10;
 * if the roll is **greater than the highest morale still alive in the unit**,
 * the unit gains its (single) Suppressed marker. Blast survivors and the crew of
 * a destroyed vehicle are suppressed the same way.
 */

/** The suppression check: a d10 strictly above the best surviving morale. */
export function rollSuppresses(roll: number, bestSurvivingMorale: number): boolean {
  return roll > bestSurvivingMorale;
}

/**
 * The best morale among a unit's surviving models, or `null` if none survive.
 * A wiped unit has nothing left to suppress, so the caller skips the check.
 */
export function highestSurvivingMorale(survivingMorales: readonly number[]): number | null {
  if (survivingMorales.length === 0) {
    return null;
  }
  return survivingMorales.reduce((best, morale) => Math.max(best, morale), survivingMorales[0]);
}
