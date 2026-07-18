/**
 * Range and charge measurement for Simple Skirmish.
 *
 * The QSR measures Range / Charge-In as "unit centre to the nearest enemy
 * model". This module represents a unit as a single token (MVP: model count is
 * a stat, models are not placed individually), so "nearest enemy model"
 * resolves to the nearest enemy *unit* by **centre-to-centre** distance -- the
 * core measurement mode this ruleset drove into existence. Which model of a
 * unit is nearest is unit-formation detail core knows nothing about; walking the
 * enemy units and taking the minimum lives here, in the ruleset.
 */

export interface MeasureResultLike {
  distance: number;
}

export interface MeasureApiLike {
  between(
    tokenA: unknown,
    tokenB: unknown,
    mode?: "base-to-base" | "centre-to-centre"
  ): MeasureResultLike;
}

export interface RangeUnit {
  id: string;
  /** Opaque -- only ever handed to `measure.between`. */
  token: unknown;
}

export interface NearestEnemy<T extends RangeUnit> {
  enemy: T;
  distance: number;
}

/**
 * The nearest enemy unit by centre-to-centre distance, or `undefined` when
 * there are none. Re-walked every call -- no cached adjacency -- so a unit
 * destroyed between calls simply stops being a candidate once the caller drops
 * it from `enemies`.
 */
export function nearestEnemy<T extends RangeUnit>(
  attacker: RangeUnit,
  enemies: readonly T[],
  measure: MeasureApiLike
): NearestEnemy<T> | undefined {
  let best: NearestEnemy<T> | undefined;

  for (const enemy of enemies) {
    const distance = measure.between(attacker.token, enemy.token, "centre-to-centre").distance;

    if (!best || distance < best.distance) {
      best = { enemy, distance };
    }
  }

  return best;
}

/** Whether a target at `distance` inches is within `rangeInches` (inclusive). */
export function isInRange(distance: number, rangeInches: number): boolean {
  return distance <= rangeInches;
}
