/**
 * Range-band bucketing shared by the weapons whose dice/to-hit step by fixed
 * distance bands (beams: 12mu; torpedoes/submunitions: 6mu). Boundaries belong
 * to the nearer band -- a target at exactly one band width is in the lower band.
 */

/** The band index a distance falls in, boundaries inclusive at the lower band. */
export function bandIndex(distanceMu: number, bandWidth: number): number {
  if (distanceMu <= 0) {
    return 0;
  }
  return Math.ceil(distanceMu / bandWidth) - 1;
}
