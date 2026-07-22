/**
 * A2 — range banding (Tier-1 GZG-family math; build plan §4).
 *
 * All band distances are USER-entered on the weapon (`WeaponSchema.bands`); this
 * module ships only the comparison, no GZG numbers. A banded weapon fills
 * close/medium/long; a flat-range weapon (HEL/GMS/IAVR/APSW) fills `flatMax` and
 * skips banding entirely.
 */

export interface Bands {
  /** Max distance still counted as close range. */
  close: number;
  /** Max distance still counted as medium range. */
  medium: number;
  /** Max distance still counted as long range. */
  long: number;
  /** >0 = flat-range weapon: one effective range, no banding. */
  flatMax: number;
}

/**
 * The die-shift step for `distance` against a weapon's bands: close → +1,
 * medium → 0, long → -1. Returns `null` when the shot is out of range (beyond
 * long, or beyond `flatMax` for a flat-range weapon) so the fire path can stop
 * before rolling.
 */
export function bandStep(distance: number, bands: Bands): number | null {
  if (bands.flatMax > 0) {
    return distance <= bands.flatMax ? 0 : null;
  }
  if (distance <= bands.close) {
    return 1;
  }
  if (distance <= bands.medium) {
    return 0;
  }
  if (distance <= bands.long) {
    return -1;
  }
  return null;
}
