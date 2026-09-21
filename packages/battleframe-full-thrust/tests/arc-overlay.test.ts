/**
 * Fire-arc token overlay geometry: the pure math that places the 6 arc-boundary
 * rays and the arc labels around a ship token, oriented to its facing, so the
 * drawn ring matches the ACTUAL fire-arc math (`arcForBearing`). Rendering (PIXI)
 * is live-verified; this covers the angles + point projection.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { arcRayAngles, arcLabelAngles, polarToScreen } from "../src/ui/arc-overlay";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("arcRayAngles", () => {
  it("places the 6 arc boundaries at facing + 30/90/150/210/270/330", () => {
    expect(arcRayAngles(0)).toEqual([30, 90, 150, 210, 270, 330]);
  });

  it("rotates every boundary with the token's facing (normalised)", () => {
    // Facing 45 → boundaries shift +45, wrapping into [0,360).
    expect(arcRayAngles(45)).toEqual([75, 135, 195, 255, 315, 15]);
  });
});

describe("arcLabelAngles", () => {
  it("labels each arc at its sector midpoint, clockwise from the forward arc", () => {
    const labels = arcLabelAngles(0);
    expect(labels).toEqual([
      { arc: "F", angle: 0 },
      { arc: "FS", angle: 60 },
      { arc: "AS", angle: 120 },
      { arc: "A", angle: 180 },
      { arc: "AP", angle: 240 },
      { arc: "FP", angle: 300 }
    ]);
  });

  it("rotates the labels with facing", () => {
    expect(arcLabelAngles(90)[0]).toEqual({ arc: "F", angle: 90 });
  });
});

describe("polarToScreen", () => {
  it("projects an angle (clockwise from up) + radius to a screen point (y down)", () => {
    const c = { x: 100, y: 100 };
    // 0° = straight up = -y
    expect(polarToScreen(c, 0, 10)).toEqual({ x: 100, y: 90 });
    // 90° = starboard = +x
    const right = polarToScreen(c, 90, 10);
    expect(right.x).toBeCloseTo(110);
    expect(right.y).toBeCloseTo(100);
    // 180° = aft = +y
    const down = polarToScreen(c, 180, 10);
    expect(down.x).toBeCloseTo(100);
    expect(down.y).toBeCloseTo(110);
  });
});
