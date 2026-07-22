import { describe, expect, it } from "vitest";
import {
  fighterMaxMove,
  distance,
  moveToward,
  canReachToAttack
} from "../src/movement/fighter-move";
import { FIGHTER_ATTACK_RANGE_MU } from "../src/constants";

/**
 * Verifies the pure fighter-movement core. Unlike ships (cinematic pivot-move in
 * path.ts), a fighter group moves a FLAT distance in ANY direction each turn --
 * 12 mu standard, 18 mu Fast -- tracking no course or velocity, and does not obey
 * ship turning caps (Fighter Groups.md: "move any or all operational groups up to
 * 12 mu in any direction ... no orders, no course/velocity tracked"). Positions
 * are {x, y} in mu, screen space: x right, y DOWN, matching vector.ts / path.ts.
 * All values below are hand-computed.
 */

describe("fighterMaxMove", () => {
  it("is 12 mu for a standard group and 18 mu for a Fast group", () => {
    expect(fighterMaxMove()).toBe(12);
    expect(fighterMaxMove("interceptor")).toBe(12);
    expect(fighterMaxMove("fast")).toBe(18);
  });
});

describe("distance", () => {
  it("is the straight-line mu gap between two points (3-4-5 triangle)", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 9);
    expect(distance({ x: 1, y: 1 }, { x: 4, y: 5 })).toBeCloseTo(5, 9);
    expect(distance({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
  });
});

describe("moveToward", () => {
  it("lands exactly on the target when it is within reach", () => {
    // gap 3-4-5 = 5 mu <= 12 mu allowance -> land on it
    expect(moveToward({ x: 0, y: 0 }, { x: 3, y: 4 }, 12)).toEqual({ x: 3, y: 4 });
    // gap exactly equal to the allowance -> still lands on it
    expect(moveToward({ x: 0, y: 0 }, { x: 12, y: 0 }, 12)).toEqual({ x: 12, y: 0 });
  });

  it("clamps to maxMu along the straight line toward a point out of reach", () => {
    // straight along +x: 24 mu away, 12 allowance -> halfway
    expect(moveToward({ x: 0, y: 0 }, { x: 24, y: 0 }, 12)).toEqual({ x: 12, y: 0 });
    // straight along +y (screen DOWN): 20 mu away, 12 allowance
    const down = moveToward({ x: 0, y: 0 }, { x: 0, y: 20 }, 12);
    expect(down.x).toBeCloseTo(0, 9);
    expect(down.y).toBeCloseTo(12, 9);
    // 30-40-50 triangle, 12 allowance -> t = 12/50 = 0.24 -> (7.2, 9.6)
    const diag = moveToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 12);
    expect(diag.x).toBeCloseTo(7.2, 9);
    expect(diag.y).toBeCloseTo(9.6, 9);
  });

  it("does not move when the allowance is zero or the group is already there", () => {
    expect(moveToward({ x: 5, y: 5 }, { x: 20, y: 20 }, 0)).toEqual({ x: 5, y: 5 });
    expect(moveToward({ x: 5, y: 5 }, { x: 5, y: 5 }, 12)).toEqual({ x: 5, y: 5 });
  });
});

describe("canReachToAttack", () => {
  it("uses the default 6 mu attack range constant", () => {
    expect(FIGHTER_ATTACK_RANGE_MU).toBe(6);
  });

  it("reports the target already in range without moving", () => {
    // 4 mu away, inside 6 mu strike range -> attack from where it stands
    const r = canReachToAttack({ x: 0, y: 0 }, { x: 4, y: 0 });
    expect(r.canAttack).toBe(true);
    expect(r.intercept).toEqual({ x: 0, y: 0 });
    expect(r.distanceToTarget).toBeCloseTo(4, 9);
  });

  it("closes only as far as the edge of strike range, not onto the ship", () => {
    // 9 mu away: needs to cover 9 - 6 = 3 mu to be in range
    const r = canReachToAttack({ x: 0, y: 0 }, { x: 9, y: 0 });
    expect(r.canAttack).toBe(true);
    expect(r.intercept.x).toBeCloseTo(3, 9);
    expect(r.intercept.y).toBeCloseTo(0, 9);
    expect(r.distanceToTarget).toBeCloseTo(6, 9);
  });

  it("just reaches at the 12 + 6 = 18 mu limit for a standard group", () => {
    const reach = canReachToAttack({ x: 0, y: 0 }, { x: 18, y: 0 });
    expect(reach.canAttack).toBe(true);
    expect(reach.intercept.x).toBeCloseTo(12, 9);
    expect(reach.distanceToTarget).toBeCloseTo(6, 9);

    // one mu beyond the combined move+strike reach -> cannot attack this turn
    const miss = canReachToAttack({ x: 0, y: 0 }, { x: 19, y: 0 });
    expect(miss.canAttack).toBe(false);
    expect(miss.intercept.x).toBeCloseTo(12, 9); // still advances the full allowance
    expect(miss.distanceToTarget).toBeCloseTo(7, 9);
  });

  it("lets a Fast group reach 18 + 6 = 24 mu where a standard group cannot", () => {
    const standard = canReachToAttack({ x: 0, y: 0 }, { x: 24, y: 0 });
    expect(standard.canAttack).toBe(false);

    const fast = canReachToAttack({ x: 0, y: 0 }, { x: 24, y: 0 }, "fast");
    expect(fast.canAttack).toBe(true);
    expect(fast.intercept.x).toBeCloseTo(18, 9);
    expect(fast.distanceToTarget).toBeCloseTo(6, 9);
  });

  it("honours an explicit attack-range override", () => {
    // with a 3 mu range, a 16 mu target is out of a 12 + 3 = 15 mu reach
    const r = canReachToAttack({ x: 0, y: 0 }, { x: 16, y: 0 }, undefined, 3);
    expect(r.canAttack).toBe(false);
    expect(r.distanceToTarget).toBeCloseTo(4, 9);
  });
});
