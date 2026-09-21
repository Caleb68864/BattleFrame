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


describe("shipClass (FT2 class by MASS)", () => {
  it("classes MASS <= 18 as an escort", () => {
    expect(shipClass(2)).toBe("escort");
    expect(shipClass(18)).toBe("escort");
  });

  it("classes MASS 19-36 as a cruiser", () => {
    expect(shipClass(19)).toBe("cruiser");
    expect(shipClass(36)).toBe("cruiser");
  });

  it("classes MASS 37-100 as a capital ship", () => {
    expect(shipClass(37)).toBe("capital");
    expect(shipClass(100)).toBe("capital");
  });
});

describe("warshipDamagePoints (half MASS)", () => {
  it("is half the MASS", () => {
    expect(warshipDamagePoints(36)).toBe(18);
    expect(warshipDamagePoints(32)).toBe(16);
  });

  it("rounds a half up (odd MASS)", () => {
    expect(warshipDamagePoints(15)).toBe(8);
  });
});

describe("thresholdRows (FT2: escort 2, cruiser 3, capital 4)", () => {
  it("gives an escort 2 rows (1 threshold)", () => {
    expect(thresholdRows("escort")).toBe(2);
  });
  it("gives a cruiser 3 rows (2 thresholds)", () => {
    expect(thresholdRows("cruiser")).toBe(3);
  });
  it("gives a capital 4 rows (3 thresholds)", () => {
    expect(thresholdRows("capital")).toBe(4);
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
