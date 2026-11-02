import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  shipClass,
  warshipDamagePoints,
  thresholdRows,
  rowBoundaries,
  applyHullDamage
} from "../src/ship/hull";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("shipClass (by the scenario world's invented MASS cut-offs)", () => {
  it("classes up to the first cut-off as an escort", () => {
    expect(shipClass(2)).toBe("escort");
    expect(shipClass(21)).toBe("escort");
  });

  it("classes up to the second cut-off as a cruiser", () => {
    expect(shipClass(22)).toBe("cruiser");
    expect(shipClass(43)).toBe("cruiser");
  });

  it("classes anything above as a capital ship", () => {
    expect(shipClass(44)).toBe("capital");
    expect(shipClass(100)).toBe("capital");
  });
});

describe("warshipDamagePoints (the world's share of MASS)", () => {
  it("divides the MASS by the world's divisor", () => {
    expect(warshipDamagePoints(36)).toBe(12);
  });

  it("rounds a fraction up", () => {
    expect(warshipDamagePoints(10)).toBe(4);
  });
});

describe("thresholdRows (the world's rows per class)", () => {
  it("reads each class from the world", () => {
    expect(thresholdRows("escort")).toBe(3);
    expect(thresholdRows("cruiser")).toBe(4);
    expect(thresholdRows("capital")).toBe(5);
  });
});

describe("rowBoundaries (uneven boxes fill upper rows first)", () => {
  it("splits 18 boxes into 3 even rows", () => {
    expect(rowBoundaries(18, 3)).toEqual([6, 12, 18]);
  });

  it("gives the upper rows the extra boxes (26 into 4 rows -> 7/7/6/6)", () => {
    expect(rowBoundaries(26, 4)).toEqual([7, 14, 20, 26]);
  });
});

describe("applyHullDamage", () => {
  it("crosses off boxes and reports no threshold when a row is not completed", () => {
    // 18 boxes, 3 rows (boundaries 6/12/18). 4 damage from fresh -> row 1 not done.
    const result = applyHullDamage({ damageBefore: 0, incoming: 4, boxes: 18, rows: 3 });
    expect(result.damage).toBe(4);
    expect(result.destroyed).toBe(false);
    expect(result.thresholdsCrossed).toEqual([]);
  });

  it("reports a 1st-row threshold when the first row completes", () => {
    const result = applyHullDamage({ damageBefore: 0, incoming: 6, boxes: 18, rows: 3 });
    expect(result.damage).toBe(6);
    expect(result.thresholdsCrossed).toEqual([1]);
  });

  it("reports every threshold crossed in one attack, excluding final-row destruction", () => {
    // From 6 damage, take 8 more -> 14, crossing the 2nd boundary (12). Boundaries
    // 6/12/18; the 3rd (18) is destruction, not a threshold.
    const result = applyHullDamage({ damageBefore: 6, incoming: 8, boxes: 18, rows: 3 });
    expect(result.damage).toBe(14);
    expect(result.destroyed).toBe(false);
    expect(result.thresholdsCrossed).toEqual([2]);
  });

  it("destroys the ship when the final row completes, without a threshold for it", () => {
    const result = applyHullDamage({ damageBefore: 12, incoming: 6, boxes: 18, rows: 3 });
    expect(result.damage).toBe(18);
    expect(result.destroyed).toBe(true);
    expect(result.thresholdsCrossed).toEqual([]);
  });

  it("clamps damage at the box count (excess is not tracked past destruction)", () => {
    const result = applyHullDamage({ damageBefore: 0, incoming: 99, boxes: 18, rows: 3 });
    expect(result.damage).toBe(18);
    expect(result.destroyed).toBe(true);
    // Both interior thresholds (1st, 2nd) were passed on the way to destruction.
    expect(result.thresholdsCrossed).toEqual([1, 2]);
  });
});
