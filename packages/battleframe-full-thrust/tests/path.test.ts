import { describe, expect, it } from "vitest";
import { plotMovementPath } from "../src/movement/path";

/**
 * Verifies the cinematic pivot-move-pivot-move displacement against the two
 * worked examples in the notes (Making Course Changes). Displacements are in
 * scene distance units (mu), measured from the ship's start, in screen space
 * (x right, y DOWN, so "up"/course-12 is -y). Course->heading: course N faces
 * (N mod 12) x 30 degrees clockwise from up.
 */

describe("plotMovementPath", () => {
  it("3-point port turn, velocity 10, from Course 3: pivot 1, move 5, pivot 2, move 5", () => {
    const path = plotMovementPath({ velocity: 10, course: 3 }, "P3", 6);
    expect(path.legal).toBe(true);
    expect(path.course).toBe(12); // final heading
    expect(path.midCourse).toBe(2); // half the turn (rounded down) applied first
    // First half-move (5mu) on Course 2 (heading 60deg): (5 sin60, -5 cos60).
    expect(path.waypoint.dx).toBeCloseTo(4.330, 2);
    expect(path.waypoint.dy).toBeCloseTo(-2.5, 2);
    // Then pivot to Course 12 (heading 0/up) and move 5mu straight up.
    expect(path.end.dx).toBeCloseTo(4.330, 2);
    expect(path.end.dy).toBeCloseTo(-7.5, 2);
  });

  it("1-point starboard turn, velocity 14, from Course 8: no turn at start, move 7, turn 1, move 7", () => {
    const path = plotMovementPath({ velocity: 14, course: 8 }, "S1", 4);
    expect(path.legal).toBe(true);
    expect(path.midCourse).toBe(8); // half of 1 rounds to 0 -- no turn at the start
    expect(path.course).toBe(9);
    // First 7mu on Course 8 (heading 240deg).
    expect(path.waypoint.dx).toBeCloseTo(-6.062, 2);
    expect(path.waypoint.dy).toBeCloseTo(3.5, 2);
    // Then Course 9 (heading 270/west) for 7mu more.
    expect(path.end.dx).toBeCloseTo(-13.062, 2);
    expect(path.end.dy).toBeCloseTo(3.5, 2);
  });

  it("moves the full (post-order) velocity straight ahead when there is no turn", () => {
    // Accelerate to velocity 8 from a standstill on Course 12 (up): end 8mu up.
    const path = plotMovementPath({ velocity: 0, course: 12 }, "+8", 8);
    expect(path.legal).toBe(true);
    expect(path.course).toBe(12);
    expect(path.end.dx).toBeCloseTo(0, 5);
    expect(path.end.dy).toBeCloseTo(-8, 5);
  });

  it("passes through an illegal order's reason without a path", () => {
    const path = plotMovementPath({ velocity: 0, course: 6 }, "S4", 6); // turn > half thrust
    expect(path.legal).toBe(false);
    expect(path.reason).toBe("turn-cap");
  });
});
