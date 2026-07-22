import { describe, expect, it } from "vitest";
import { facingOf, absoluteBearing, bearingOf } from "./facing";

describe("facingOf (resolve a token's facing angle in degrees)", () => {
  it("reads the token's rotation, defaulting to 0", () => {
    expect(facingOf({ center: { x: 0, y: 0 } })).toBe(0);
    expect(facingOf({ center: { x: 0, y: 0 }, rotation: 90 })).toBe(90);
  });

  it("prefers the document rotation over a placeable rotation", () => {
    expect(
      facingOf({ center: { x: 0, y: 0 }, rotation: 90, document: { rotation: 45 } })
    ).toBe(45);
  });

  it("lets an explicit battleframe.facing flag override rotation", () => {
    expect(
      facingOf({
        center: { x: 0, y: 0 },
        rotation: 90,
        flags: { battleframe: { facing: 200 } }
      })
    ).toBe(200);
  });

  it("normalises into [0, 360)", () => {
    expect(facingOf({ center: { x: 0, y: 0 }, rotation: -90 })).toBe(270);
    expect(facingOf({ center: { x: 0, y: 0 }, rotation: 450 })).toBe(90);
  });
});

describe("absoluteBearing (clockwise from north / up, screen y-down)", () => {
  const origin = { x: 0, y: 0 };
  it("is 0 for a target directly above (north)", () => {
    expect(absoluteBearing(origin, { x: 0, y: -10 })).toBe(0);
  });
  it("is 90 for a target to the right (east)", () => {
    expect(absoluteBearing(origin, { x: 10, y: 0 })).toBe(90);
  });
  it("is 180 for a target directly below (south)", () => {
    expect(absoluteBearing(origin, { x: 0, y: 10 })).toBe(180);
  });
  it("is 270 for a target to the left (west)", () => {
    expect(absoluteBearing(origin, { x: -10, y: 0 })).toBe(270);
  });
});

describe("bearingOf (target's bearing relative to the observer's facing)", () => {
  const observer = { center: { x: 0, y: 0 } };

  it("is 0 (dead ahead) for a target in the observer's facing direction", () => {
    // Observer faces north (0); target is north.
    expect(bearingOf(observer, { center: { x: 0, y: -10 } })).toBe(0);
  });

  it("is clockwise-positive: a target to the right is bearing 90", () => {
    expect(bearingOf(observer, { center: { x: 10, y: 0 } })).toBe(90);
  });

  it("subtracts the observer's own facing", () => {
    // Observer faces east (90); a target due north is off the port quarter (270).
    const facingEast = { center: { x: 0, y: 0 }, rotation: 90 };
    expect(bearingOf(facingEast, { center: { x: 0, y: -10 } })).toBe(270);
  });

  it("is dead ahead when the target lies along the observer's heading", () => {
    // Observer faces east (90); target to the east is dead ahead (0).
    const facingEast = { center: { x: 0, y: 0 }, rotation: 90 };
    expect(bearingOf(facingEast, { center: { x: 10, y: 0 } })).toBe(0);
  });
});
