/**
 * Range/to-hit math for the non-beam weapons: pulse torpedoes and submunition
 * packs. Pure functions over range and die faces; the rolling and damage
 * application live in the firing orchestration.
 *
 * Sources: FT2 "Pulse Torpedoes", "Submunition Packs".
 */

import {
  TORPEDO_BAND_MU,
  TORPEDO_MAX_RANGE_MU,
  TORPEDO_TO_HIT_BY_BAND,
  SUBMUNITION_BAND_MU,
  SUBMUNITION_DICE_BY_BAND,
  SUBMUNITION_MAX_RANGE_MU
} from "../constants";

/** The band index a distance falls in, boundaries inclusive at the lower band. */
function bandIndex(distanceMu: number, bandWidth: number): number {
  if (distanceMu <= 0) {
    return 0;
  }
  return Math.ceil(distanceMu / bandWidth) - 1;
}

/**
 * Pulse-torpedo to-hit target number at `distanceMu` (2+/3+/4+/5+/6 by 6mu
 * band), or null beyond the 30mu maximum range.
 */
export function torpedoToHit(distanceMu: number): number | null {
  if (distanceMu > TORPEDO_MAX_RANGE_MU) {
    return null;
  }
  return TORPEDO_TO_HIT_BY_BAND[bandIndex(distanceMu, TORPEDO_BAND_MU)];
}

/** Count of dice at or above a to-hit / kill number. */
export function countHits(faces: readonly number[], target: number): number {
  return faces.reduce((count, face) => count + (face >= target ? 1 : 0), 0);
}

/**
 * Submunition-pack dice at `distanceMu` (3D6 0-6, 2D6 6-12, 1D6 12-18), zero
 * beyond the 18mu maximum. Submunitions ignore screens, so their per-die damage
 * uses the unscreened beam table.
 */
export function submunitionDiceAtRange(distanceMu: number): number {
  if (distanceMu > SUBMUNITION_MAX_RANGE_MU) {
    return 0;
  }
  return SUBMUNITION_DICE_BY_BAND[bandIndex(distanceMu, SUBMUNITION_BAND_MU)] ?? 0;
}
