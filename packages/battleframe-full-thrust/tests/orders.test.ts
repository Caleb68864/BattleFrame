import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseOrder, applyOrder, turningCap } from "../src/movement/orders";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("parseOrder", () => {
  it("parses a combined accel + port turn order", () => {
    expect(parseOrder("+4,P2")).toEqual({ accel: 4, turn: -2 });
  });
  it("parses a decel", () => {
    expect(parseOrder("-3")).toEqual({ accel: -3, turn: 0 });
  });
  it("parses a starboard turn (positive)", () => {
    expect(parseOrder("S1")).toEqual({ accel: 0, turn: 1 });
  });
  it("tolerates spaces and mixed order", () => {
    expect(parseOrder("P1 +2")).toEqual({ accel: 2, turn: -1 });
  });
  it("treats an empty order as no change", () => {
    expect(parseOrder("")).toEqual({ accel: 0, turn: 0 });
  });
});

describe("turningCap (FT2: half of thrust, rounded up)", () => {
  it("rounds the turning half up", () => {
    expect(turningCap(6)).toBe(3);
    expect(turningCap(5)).toBe(3);
    expect(turningCap(1)).toBe(1);
  });
});

describe("applyOrder", () => {
  const thrust = 6;

  it("accelerates and turns within the thrust budget", () => {
    const result = applyOrder({ velocity: 8, course: 3 }, { accel: 4, turn: -2 }, thrust);
    expect(result.legal).toBe(true);
    expect(result.velocity).toBe(12);
    expect(result.course).toBe(1); // course 3, port 2 -> 1
  });

  it("wraps course past 12 on a starboard turn", () => {
    const result = applyOrder({ velocity: 0, course: 11 }, { accel: 0, turn: 3 }, thrust);
    expect(result.course).toBe(2); // 11 -> 12 -> 1 -> 2
  });

  it("wraps course below 1 on a port turn", () => {
    const result = applyOrder({ velocity: 0, course: 2 }, { accel: 0, turn: -3 }, thrust);
    expect(result.course).toBe(11); // 2 -> 1 -> 12 -> 11
  });

  it("never lets velocity go below zero (no reverse)", () => {
    const result = applyOrder({ velocity: 2, course: 6 }, { accel: -5, turn: 0 }, thrust);
    expect(result.legal).toBe(false);
    expect(result.reason).toBe("reverse");
  });

  it("rejects turning beyond half the thrust", () => {
    const result = applyOrder({ velocity: 0, course: 6 }, { accel: 0, turn: 4 }, thrust);
    expect(result.legal).toBe(false);
    expect(result.reason).toBe("turn-cap");
  });

  it("rejects spending more total thrust than available", () => {
    const result = applyOrder({ velocity: 0, course: 6 }, { accel: 5, turn: -2 }, thrust);
    expect(result.legal).toBe(false);
    expect(result.reason).toBe("thrust-budget");
  });
});
