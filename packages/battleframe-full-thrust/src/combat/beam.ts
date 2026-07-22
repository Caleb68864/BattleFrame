/**
 * Beam battery mechanics: how many dice a Class-N beam rolls at a given range,
 * and how a defensive screen level downgrades each die's damage. Pure functions
 * over die faces -- the actual rolling (via game.battleframe.dice.rollPool) and
 * target/arc checks live in the firing orchestration.
 *
 * Sources: FT2 "Beam Weapons", "Weapon Ranges & Damage Rolls", "Screens".
 */

import {
  BEAM_RANGE_BAND_MU,
  DIE_ONE_DAMAGE_MIN,
  DIE_ONE_DAMAGE_MAX,
  DIE_TWO_DAMAGE
} from "../constants";

/**
 * Dice a Class-`cls` beam rolls at `distanceMu`: full class dice in the first
 * 12mu band, one fewer per further band, zero beyond reach (class x 12mu). Band
 * boundaries are inclusive at the lower band (a target at exactly 12mu is in the
 * first band).
 */
export function beamDiceAtRange(cls: number, distanceMu: number): number {
  // A non-finite distance (an unplaced token, a degenerate measurement) must not
  // propagate NaN into the dice count -- treat it as out of range.
  if (!Number.isFinite(distanceMu)) {
    return 0;
  }
  if (distanceMu <= 0) {
    return cls;
  }
  const band = Math.ceil(distanceMu / BEAM_RANGE_BAND_MU) - 1;
  return Math.max(0, cls - band);
}

/**
 * Damage a single beam die scores against a target with `screenLevel` (0-3).
 * Unscreened: 4-5 = 1, 6 = 2. Each screen level downgrades: L1 ignores 4s, L2
 * makes 5 and 6 worth 1, L3 counts only a 6 as 1.
 */
export function beamDamageForFace(face: number, screenLevel: number): number {
  // A negative/absent screen level means unscreened -- never fall through to the
  // strongest (level-3) table, which would over-protect the target.
  switch (screenLevel <= 0 ? 0 : screenLevel) {
    case 0:
      if (face >= DIE_TWO_DAMAGE) return 2;
      if (face >= DIE_ONE_DAMAGE_MIN) return 1;
      return 0;
    case 1:
      if (face >= DIE_TWO_DAMAGE) return 2;
      if (face >= DIE_ONE_DAMAGE_MAX) return 1;
      return 0;
    case 2:
      if (face >= DIE_ONE_DAMAGE_MAX) return 1;
      return 0;
    default: // 3 or higher (max)
      if (face >= DIE_TWO_DAMAGE) return 1;
      return 0;
  }
}

/** Total damage of a beam die pool against a screen level. */
export function poolBeamDamage(faces: readonly number[], screenLevel: number): number {
  return faces.reduce((sum, face) => sum + beamDamageForFace(face, screenLevel), 0);
}
