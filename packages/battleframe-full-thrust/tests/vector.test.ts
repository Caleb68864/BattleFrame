import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  headingVector,
  advance,
  applyMainDrive,
  applyPush,
  rotateFacing,
  manoeuvringThrusters,
  parseVectorOrder,
  checkManoeuvres,
  resolveTurn,
  velocityMagnitude,
  nearestCourse
} from "../src/movement/vector";
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
 * Verifies the optional FT2 / Fleet Book "Vector Movement" system: velocity is a
 * PERSISTENT vector, each turn the ship advances by that vector and thrust only
 * NUDGES it, so facing and course can differ. Vectors are {vx, vy} in mu, screen
 * space (x right, y DOWN, so "up"/course-12 is -y), matching path.ts: a course N
 * faces (N mod 12) x 30 degrees clockwise from up. Values below are hand-computed.
 */

describe("headingVector", () => {
  it("points up (-y) for course 12, right (+x) for course 3, down (+y) for course 6", () => {
    expect(headingVector(12)).toEqual({ vx: expect.closeTo(0, 6), vy: expect.closeTo(-1, 6) });
    expect(headingVector(3)).toEqual({ vx: expect.closeTo(1, 6), vy: expect.closeTo(0, 6) });
    expect(headingVector(6)).toEqual({ vx: expect.closeTo(0, 6), vy: expect.closeTo(1, 6) });
    expect(headingVector(9)).toEqual({ vx: expect.closeTo(-1, 6), vy: expect.closeTo(0, 6) });
  });

  it("scales by magnitude and is periodic across the clockface (unwrapped courses)", () => {
    expect(headingVector(3, 4)).toEqual({ vx: expect.closeTo(4, 6), vy: expect.closeTo(0, 6) });
    // course 0 == course 12; course 15 == course 3 (trig is periodic, no wrap needed).
    expect(headingVector(0)).toEqual(headingVector(12));
    expect(headingVector(15, 4)).toEqual({ vx: expect.closeTo(4, 6), vy: expect.closeTo(0, 6) });
  });
});

describe("advance", () => {
  it("moves position by the current velocity, leaving velocity and facing untouched", () => {
    const next = advance({ position: { vx: 2, vy: 3 }, velocity: { vx: 5, vy: -1 }, facing: 4 });
    expect(next.position).toEqual({ vx: 7, vy: 2 });
    expect(next.velocity).toEqual({ vx: 5, vy: -1 });
    expect(next.facing).toBe(4);
  });
});

describe("applyMainDrive", () => {
  it("adds thrust along the ship's FACING to the velocity (course of motion may then differ)", () => {
    // Moving up at 6 (course 12), but FACING course 3 (east): MD3 nudges +x by 3.
    const state = { position: { vx: 0, vy: 0 }, velocity: { vx: 0, vy: -6 }, facing: 3 };
    const next = applyMainDrive(state, 3);
    expect(next.velocity.vx).toBeCloseTo(3, 6);
    expect(next.velocity.vy).toBeCloseTo(-6, 6);
    expect(next.facing).toBe(3); // main drive never changes facing
  });
});

describe("applyPush", () => {
  it("nudges the vector Port/Starboard/Reverse relative to facing, 1 point = 1 mu, facing unchanged", () => {
    const state = { position: { vx: 0, vy: 0 }, velocity: { vx: 0, vy: 0 }, facing: 12 };
    expect(applyPush(state, "S", 2).velocity).toEqual({
      vx: expect.closeTo(2, 6),
      vy: expect.closeTo(0, 6)
    }); // starboard of "up" is +x
    expect(applyPush(state, "P", 2).velocity).toEqual({
      vx: expect.closeTo(-2, 6),
      vy: expect.closeTo(0, 6)
    }); // port of "up" is -x
    expect(applyPush(state, "R", 2).velocity).toEqual({
      vx: expect.closeTo(0, 6),
      vy: expect.closeTo(2, 6)
    }); // reverse of "up" is +y (down)
    expect(applyPush(state, "S", 2).facing).toBe(12);
  });
});

describe("rotateFacing", () => {
  it("rotates facing only (starboard +, port -), wrapping the 1..12 clockface", () => {
    expect(rotateFacing(12, 3)).toBe(3);
    expect(rotateFacing(1, -3)).toBe(10);
    expect(rotateFacing(11, 3)).toBe(2);
  });
});

describe("manoeuvringThrusters", () => {
  it("is half the main-drive rating, rounded DOWN", () => {
    expect(manoeuvringThrusters(6)).toBe(3);
    expect(manoeuvringThrusters(5)).toBe(2);
    expect(manoeuvringThrusters(4)).toBe(2);
    expect(manoeuvringThrusters(1)).toBe(0);
  });
});

describe("parseVectorOrder", () => {
  it("maps MDn / TPn|TSn / PPn|PSn|PRn shorthand to ordered manoeuvres", () => {
    expect(parseVectorOrder("TP3, MD4")).toEqual([
      { kind: "rotate", points: -3 },
      { kind: "main-drive", points: 4 }
    ]);
    expect(parseVectorOrder("MD6 TS2 PR1")).toEqual([
      { kind: "main-drive", points: 6 },
      { kind: "rotate", points: 2 },
      { kind: "push", direction: "R", points: 1 }
    ]);
    expect(parseVectorOrder("")).toEqual([]);
  });
});

describe("checkManoeuvres (budgets)", () => {
  it("passes main-drive within thrust and thruster spend within half (rounded down)", () => {
    expect(checkManoeuvres(parseVectorOrder("MD6 TS2 PR1"), 6)).toEqual({ legal: true });
  });
  it("rejects main-drive over the thrust rating", () => {
    expect(checkManoeuvres(parseVectorOrder("MD7"), 6)).toEqual({
      legal: false,
      reason: "main-drive-budget"
    });
  });
  it("rejects thruster spend over half the rating (rotation costs 1 regardless of size)", () => {
    // thrust 4 -> 2 thruster points. One rotation (1) + push 2 = 3 > 2.
    expect(checkManoeuvres(parseVectorOrder("TP4 PS2"), 4)).toEqual({
      legal: false,
      reason: "manoeuvre-budget"
    });
  });
  it("allows at most one rotation and one push per turn", () => {
    expect(checkManoeuvres(parseVectorOrder("TP1 TS1"), 8)).toEqual({
      legal: false,
      reason: "too-many-rotations"
    });
    expect(checkManoeuvres(parseVectorOrder("PP1 PS1"), 8)).toEqual({
      legal: false,
      reason: "too-many-pushes"
    });
  });
});

describe("resolveTurn (order matters)", () => {
  const start = { position: { vx: 0, vy: 0 }, velocity: { vx: 0, vy: 0 }, facing: 12 };

  it("advances by velocity first, then folds manoeuvres in WRITTEN order: TP3,MD4", () => {
    // vel 0 so no advance; rotate to course 9 (west) THEN burn 4 -> velocity all -x.
    const next = resolveTurn(start, parseVectorOrder("TP3, MD4"));
    expect(next.facing).toBe(9);
    expect(next.velocity.vx).toBeCloseTo(-4, 6);
    expect(next.velocity.vy).toBeCloseTo(0, 6);
  });

  it("gives a DIFFERENT result for the reversed order MD4,TP3", () => {
    // burn 4 along facing 12 (up) FIRST -> velocity {0,-4}; then rotate (velocity kept).
    const next = resolveTurn(start, parseVectorOrder("MD4, TP3"));
    expect(next.facing).toBe(9);
    expect(next.velocity.vx).toBeCloseTo(0, 6);
    expect(next.velocity.vy).toBeCloseTo(-4, 6);
  });

  it("full worked turn: persistent vector carries the ship, thrust nudges it", () => {
    // Moving up at 6 (course 12) but FACING east (course 3); order MD3.
    const s = { position: { vx: 10, vy: 20 }, velocity: { vx: 0, vy: -6 }, facing: 3 };
    const next = resolveTurn(s, parseVectorOrder("MD3"));
    // Position advanced by the OLD velocity {0,-6}: 20 - 6 = 14.
    expect(next.position).toEqual({ vx: 10, vy: 14 });
    // Velocity nudged +3 along facing east: {3, -6}. Course of motion now != facing.
    expect(next.velocity.vx).toBeCloseTo(3, 6);
    expect(next.velocity.vy).toBeCloseTo(-6, 6);
    expect(next.facing).toBe(3);
  });
});

describe("velocityMagnitude / nearestCourse (marker realignment)", () => {
  it("reports the straight-line speed and the nearest clockface course of a velocity vector", () => {
    expect(velocityMagnitude({ vx: 3, vy: -4 })).toBeCloseTo(5, 6);
    expect(nearestCourse({ vx: 0, vy: -7 })).toBe(12); // dead up
    expect(nearestCourse({ vx: 5, vy: 0 })).toBe(3); // dead right
    expect(nearestCourse({ vx: 0, vy: 4 })).toBe(6); // dead down
    expect(nearestCourse({ vx: 0, vy: 0 })).toBe(12); // stationary -> default up
  });
});
