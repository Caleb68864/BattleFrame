import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { plotMissilePath } from "../src/movement/missile-path";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


/**
 * Verifies the independent missile's move-pivot-move displacement by hand.
 * A missile moves up to 18mu straight ahead, with ONE 2-point (60°) course
 * change taken at the MID-POINT (unlike a ship, whose turn is split across the
 * whole move). Displacements are in scene distance units (mu), from the launch
 * point, in screen space (x right, y DOWN, so "up"/course-12 is -y). Course N
 * faces (N mod 12) x 30 degrees clockwise from up.
 */

describe("plotMissilePath", () => {
  it("moves 18mu with a 2-point starboard turn at the mid-point (from Course 12)", () => {
    const path = plotMissilePath({ course: 12 }, 18, 2);
    expect(path.legal).toBe(true);
    expect(path.midCourse).toBe(12); // first half runs straight on the launch course
    expect(path.course).toBe(2); // turn taken at the mid-point -> Course 2
    // First 9mu on Course 12 (heading 0/up): straight up.
    expect(path.waypoint.dx).toBeCloseTo(0, 5);
    expect(path.waypoint.dy).toBeCloseTo(-9, 5);
    // Then Course 2 (heading 60°) for 9mu: (9 sin60, -9 cos60).
    expect(path.end.dx).toBeCloseTo(7.794, 2);
    expect(path.end.dy).toBeCloseTo(-13.5, 2);
  });

  it("runs straight the full distance when there is no turn", () => {
    // Course 3 = heading 90° (east/right): 18mu straight right.
    const path = plotMissilePath({ course: 3 }, 18, 0);
    expect(path.legal).toBe(true);
    expect(path.course).toBe(3);
    expect(path.end.dx).toBeCloseTo(18, 5);
    expect(path.end.dy).toBeCloseTo(0, 5);
  });

  it("turns to port at the mid-point of a partial-distance move", () => {
    // Course 12, 12mu, 2-point port turn -> Course 10 (heading -60/300°).
    const path = plotMissilePath({ course: 12 }, 12, -2);
    expect(path.course).toBe(10);
    // First 6mu straight up.
    expect(path.waypoint.dx).toBeCloseTo(0, 5);
    expect(path.waypoint.dy).toBeCloseTo(-6, 5);
    // Then Course 10 (heading 300°) for 6mu: adds (6 sin300, -6 cos300) = (-5.196, -3)
    // to the mid-point (0, -6) -> final (-5.196, -9).
    expect(path.end.dx).toBeCloseTo(-5.196, 2);
    expect(path.end.dy).toBeCloseTo(-9, 2);
  });

  it("rejects a turn steeper than one 2-point change", () => {
    const path = plotMissilePath({ course: 12 }, 18, 3);
    expect(path.legal).toBe(false);
    expect(path.reason).toBe("turn-cap");
  });

  it("rejects a move beyond the 18mu limit", () => {
    const path = plotMissilePath({ course: 12 }, 20, 0);
    expect(path.legal).toBe(false);
    expect(path.reason).toBe("over-range");
  });
});
