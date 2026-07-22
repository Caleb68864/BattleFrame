import { describe, expect, it } from "vitest";
import { previewPointsPx, arrowHeadPx } from "../src/movement/preview";
import { plotMovementPath } from "../src/movement/path";

describe("previewPointsPx", () => {
  it("maps the mu path to absolute pixel points [start, waypoint, end]", () => {
    // Straight +8 up from Course 12: end 8mu up; at 50px/mu that is -400px in y.
    const path = plotMovementPath({ velocity: 0, course: 12 }, "+8", 8);
    const points = previewPointsPx({ x: 100, y: 100 }, path, 50);
    expect(points).toHaveLength(3);
    expect(points[0]).toEqual({ x: 100, y: 100 });
    expect(points[2].x).toBeCloseTo(100, 2);
    expect(points[2].y).toBeCloseTo(100 - 400, 2);
  });

  it("bends at the waypoint for a turning order", () => {
    const path = plotMovementPath({ velocity: 10, course: 3 }, "P3", 6);
    const points = previewPointsPx({ x: 0, y: 0 }, path, 10);
    // Waypoint is the first half-move (4.33, -2.5)mu * 10px.
    expect(points[1].x).toBeCloseTo(43.3, 1);
    expect(points[1].y).toBeCloseTo(-25, 1);
  });
});

describe("arrowHeadPx", () => {
  it("returns two barbs behind the tip, symmetric about the travel direction", () => {
    // Travelling right (from -> to along +x): barbs are behind (x < tip) and mirror in y.
    const [b1, b2] = arrowHeadPx({ x: 0, y: 0 }, { x: 10, y: 0 }, 3);
    expect(b1.x).toBeLessThan(10);
    expect(b2.x).toBeLessThan(10);
    expect(b1.y).toBeCloseTo(-b2.y, 5); // symmetric about the axis
  });
});
