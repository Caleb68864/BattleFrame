/**
 * Independent-missile phase core (roadmap P2 #15): the pure state transitions the
 * missile-phase orchestrator drives — advance a launched missile one turn along
 * its course (bumping its life), and decide when it has burned out. The Foundry
 * glue (scene-flag storage, PIXI markers, resolving strikes vs nearby ships) is
 * live-verified; this covers the movement + lifespan math.
 */

import { describe, expect, it } from "vitest";
import { advanceMissile, missileExpired, type ActiveMissile } from "../src/combat/missile-phase";
import { MISSILE_LIFE_TURNS, MISSILE_MOVE_MU } from "../src/constants";

function missile(overrides: Partial<ActiveMissile> = {}): ActiveMissile {
  return { id: "m1", x: 100, y: 100, course: 12, turnsLived: 0, warhead: "normal", ownerDisposition: 1, ...overrides };
}

describe("advanceMissile", () => {
  it("moves the missile its full move up-range along course 12 (dead up) and ages it", () => {
    // course 12 → heading 0° (up); screen y is down, so it moves -y by 18mu × ppm.
    const next = advanceMissile(missile({ course: 12 }), 0, 2); // 2 px per mu
    expect(next.x).toBeCloseTo(100);
    expect(next.y).toBeCloseTo(100 - MISSILE_MOVE_MU * 2);
    expect(next.course).toBe(12);
    expect(next.turnsLived).toBe(1);
  });

  it("applies a mid-point course turn (starboard) to the final heading", () => {
    const next = advanceMissile(missile({ course: 12 }), 2, 1); // +2 points starboard
    expect(next.course).toBe(2); // 12 → +2 → 2
    expect(next.turnsLived).toBe(1);
  });

  it("treats an illegal (too-sharp) turn as flying straight", () => {
    const next = advanceMissile(missile({ course: 3 }), 5, 1); // |5| > 2 cap → straight
    expect(next.course).toBe(3);
    expect(next.turnsLived).toBe(1);
  });

  it("does not mutate the input", () => {
    const m = missile();
    advanceMissile(m, 0, 1);
    expect(m.turnsLived).toBe(0);
  });
});

describe("missileExpired", () => {
  it("is not expired before its life span", () => {
    expect(missileExpired(missile({ turnsLived: MISSILE_LIFE_TURNS - 1 }))).toBe(false);
  });

  it("is expired at (and beyond) its life span", () => {
    expect(missileExpired(missile({ turnsLived: MISSILE_LIFE_TURNS }))).toBe(true);
    expect(missileExpired(missile({ turnsLived: MISSILE_LIFE_TURNS + 1 }))).toBe(true);
  });
});
