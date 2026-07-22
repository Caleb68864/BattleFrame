/**
 * Beam battery mechanics: how many dice a Class-N beam rolls at a given range,
 * and how a defensive screen level downgrades each die's damage. Pure functions
 * over die faces -- the actual rolling (via game.battleframe.dice.rollPool) and
 * target/arc checks live in the firing orchestration.
 *
 * Sources: FT2 "Beam Weapons", "Weapon Ranges & Damage Rolls", "Screens".
 */

import { BEAM_RANGE_BAND_MU } from "../constants";

/**
 * Dice a Class-`cls` beam rolls at `distanceMu`: full class dice in the first
 * 12mu band, one fewer per further band, zero beyond reach (class x 12mu). Band
 * boundaries are inclusive at the lower band (a target at exactly 12mu is in the
 * first band).
 */
export function beamDiceAtRange(cls: number, distanceMu: number): number {
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
  switch (screenLevel) {
    case 0:
      if (face >= 6) return 2;
      if (face >= 4) return 1;
      return 0;
    case 1:
      if (face >= 6) return 2;
      if (face >= 5) return 1;
      return 0;
    case 2:
      if (face >= 5) return 1;
      return 0;
    default: // 3 or higher (max)
      if (face >= 6) return 1;
      return 0;
  }
}

/** Total damage of a beam die pool against a screen level. */
export function poolBeamDamage(faces: readonly number[], screenLevel: number): number {
  return faces.reduce((sum, face) => sum + beamDamageForFace(face, screenLevel), 0);
}
