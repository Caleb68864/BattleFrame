/**
 * Where the spinal weapons' templates lie (roadmap P2 #20). Both weapons fire
 * straight ahead along the ship's centreline; this turns the profile's numbers
 * into segments along that line, and the segments into the engine's capsule
 * areas (a circle swept along a segment) for containment.
 *
 * ASSUMPTIONS, recorded in the roadmap as owner questions rather than settled:
 *  - Offsets are measured from the ship's CENTRE, the point every other Full
 *    Thrust range here is measured from (centre-to-centre), not from the bow.
 *  - Template diameters are quoted in inches and ranges in mu; both are taken as
 *    the scene's distance unit, as the rest of the module already does.
 *  - A ship is caught when its CENTRE is under the template, not when its base
 *    touches it: the module's scenes are in mu, and the engine sizes bases in
 *    millimetres, so a base has no size in mu.
 *  - The Wave Gun's template at a given distance has that distance band's
 *    diameter, so the sweep is one segment per band.
 */

import { novaCannonSweep } from "./spinal";
import { requireRules } from "../rules-profile";

/** A stretch of the centreline, `startMu` to `endMu` ahead, covered to `radiusMu` either side. */
export interface TemplateSegment {
  startMu: number;
  endMu: number;
  radiusMu: number;
}

/** The Nova Cannon's sweep on `turn` of its life, or nothing outside it. */
export function novaTemplateSegments(turn: number): TemplateSegment[] {
  const sweep = novaCannonSweep(turn);
  if (!sweep) {
    return [];
  }
  return [{ startMu: sweep.startOffsetMu, endMu: sweep.endOffsetMu, radiusMu: sweep.diameterInches / 2 }];
}

/** The Wave Gun's expanding template: one segment per range band, out to its reach. */
export function waveGunTemplateSegments(): TemplateSegment[] {
  const rules = requireRules();
  const band = rules.waveGunBandMu;
  const segments: TemplateSegment[] = [];
  if (!(band > 0)) {
    return segments;
  }
  rules.waveGunTemplateInchesByBand.forEach((inches, i) => {
    const startMu = i * band;
    if (startMu >= rules.waveGunMaxRangeMu) {
      return;
    }
    segments.push({ startMu, endMu: Math.min((i + 1) * band, rules.waveGunMaxRangeMu), radiusMu: inches / 2 });
  });
  return segments;
}

interface Point {
  x: number;
  y: number;
}

/**
 * The segments laid along a heading from an origin, as capsule areas. `headingDeg`
 * uses the engine's facing convention: 0 is up the screen (-y), clockwise.
 */
export function templateCapsules<A>(
  origin: Point,
  headingDeg: number,
  pxPerMu: number,
  segments: readonly TemplateSegment[],
  capsule: (from: Point, to: Point, radius: number) => A
): A[] {
  const radians = (headingDeg * Math.PI) / 180;
  const dx = Math.sin(radians) * pxPerMu;
  const dy = -Math.cos(radians) * pxPerMu;
  return segments
    .filter((segment) => segment.radiusMu > 0)
    .map((segment) =>
      capsule(
        { x: origin.x + dx * segment.startMu, y: origin.y + dy * segment.startMu },
        { x: origin.x + dx * segment.endMu, y: origin.y + dy * segment.endMu },
        segment.radiusMu
      )
    );
}
