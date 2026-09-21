/**
 * Range/to-hit math for the non-beam weapons: pulse torpedoes and submunition
 * packs. Pure functions over range and die faces; the rolling and damage
 * application live in the firing orchestration.
 *
 * Sources: FT2 "Pulse Torpedoes", "Submunition Packs".
 */

import { bandIndex } from "./bands";
import { requireRules } from "../rules-profile";

/**
 * Pulse-torpedo to-hit target number at `distanceMu` (2+/3+/4+/5+/6 by 6mu
 * band), or null beyond the 30mu maximum range.
 */
export function torpedoToHit(distanceMu: number): number | null {
  if (!Number.isFinite(distanceMu) || distanceMu > requireRules().torpedoMaxRangeMu) {
    return null;
  }
  // `?? null` guards a band index that falls off the table -- never return
  // `undefined`, which a `=== null` caller would read as "in range" (auto-hit).
  return requireRules().torpedoToHitByBand[bandIndex(distanceMu, requireRules().torpedoBandMu)] ?? null;
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
  if (!Number.isFinite(distanceMu) || distanceMu > requireRules().submunitionMaxRangeMu) {
    return 0;
  }
  return requireRules().submunitionDiceByBand[bandIndex(distanceMu, requireRules().submunitionBandMu)] ?? 0;
}
