import { describe, expect, it } from "vitest";
import { inArc, ARC_HALF_ANGLE } from "../src/combat/arc";

/**
 * A9 — symmetric fire-arc predicate over an observer-relative bearing (0 = dead
 * ahead, from the engine's `facing.bearingOf`). A bearing is in arc if it falls
 * within `halfAngle` of dead-ahead on either side. Half-angles are geometry
 * constants, not GZG data.
 */
describe("inArc", () => {
  it("dead ahead (0) is in every arc", () => {
    expect(inArc(0, 15)).toBe(true);
    expect(inArc(0, 90)).toBe(true);
    expect(inArc(0, 180)).toBe(true);
  });

  it("a bearing of 100 is outside a 30° (half 15) and a 180° (half 90) arc", () => {
    expect(inArc(100, 15)).toBe(false);
    expect(inArc(100, 90)).toBe(false);
  });

  it("includes the boundary bearing on both sides", () => {
    expect(inArc(90, 90)).toBe(true);
    expect(inArc(270, 90)).toBe(true); // 360 - 90
  });

  it("wraps bearings at 360", () => {
    expect(inArc(350, 15)).toBe(true); // 350 >= 345
    expect(inArc(370, 90)).toBe(true); // normalises to 10
    expect(inArc(-10, 15)).toBe(true); // normalises to 350
  });

  it("a full turret (half 180) always includes any bearing", () => {
    expect(inArc(179, 180)).toBe(true);
    expect(inArc(181, 180)).toBe(true);
  });

  it("exposes the arc half-angle constants (geometry, not GZG data)", () => {
    expect(ARC_HALF_ANGLE.turret360).toBe(180);
    expect(ARC_HALF_ANGLE.turret180).toBe(90);
    expect(ARC_HALF_ANGLE.fixed30).toBe(15);
  });
});
