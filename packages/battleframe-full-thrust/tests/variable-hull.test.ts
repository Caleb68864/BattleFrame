import { describe, expect, it } from "vitest";
import {
  HULL_GRADES,
  hullBoxesForGrade,
  variableHullMassUsed,
  variableHullPointsCost,
  hullPointsForGrade,
  variableHullLayout
} from "../src/ship/variable-hull";

// Worked example from the user's "Variable Hull Strength" note, a MASS 60 ship:
//   Fragile 10% -> 6 MASS, 6 boxes (2/2/1/1)
//   Weak    20% -> 12 MASS, 12 boxes (3/3/3/3)
//   Average 30% -> 18 MASS, 18 boxes (5/5/4/4)
//   Strong  40% -> 24 MASS, 24 boxes (6/6/6/6)
//   Super   50% -> 30 MASS, 30 boxes (8/8/7/7)
// Points cost of the hull integrity is always 2 x the MASS used on it.

describe("hullBoxesForGrade (MASS 60 worked example)", () => {
  it("matches every grade in the note table", () => {
    expect(hullBoxesForGrade(60, "fragile")).toBe(6);
    expect(hullBoxesForGrade(60, "weak")).toBe(12);
    expect(hullBoxesForGrade(60, "average")).toBe(18);
    expect(hullBoxesForGrade(60, "strong")).toBe(24);
    expect(hullBoxesForGrade(60, "super")).toBe(30);
  });

  it("exposes the five grades in order", () => {
    expect(HULL_GRADES).toEqual(["fragile", "weak", "average", "strong", "super"]);
  });

  it("rounds a fractional box count (assumption: nearest integer)", () => {
    // MASS 25, average 30% = 7.5 -> 8 boxes.
    expect(hullBoxesForGrade(25, "average")).toBe(8);
  });
});

describe("variableHullMassUsed", () => {
  it("equals the chosen box count (boxes ARE the MASS figure)", () => {
    expect(variableHullMassUsed(6)).toBe(6);
    expect(variableHullMassUsed(30)).toBe(30);
  });
});

describe("variableHullPointsCost", () => {
  it("is 2 x the boxes (= 2 x MASS used)", () => {
    expect(variableHullPointsCost(6)).toBe(12);
    expect(variableHullPointsCost(12)).toBe(24);
    expect(variableHullPointsCost(30)).toBe(60);
  });
});

describe("hullPointsForGrade (MASS 60 worked example)", () => {
  it("costs 2 x MASS used for each grade", () => {
    expect(hullPointsForGrade(60, "fragile")).toBe(12);
    expect(hullPointsForGrade(60, "weak")).toBe(24);
    expect(hullPointsForGrade(60, "average")).toBe(36);
    expect(hullPointsForGrade(60, "strong")).toBe(48);
    expect(hullPointsForGrade(60, "super")).toBe(60);
  });
});

describe("variableHullLayout (4 rows, extra boxes to the upper rows)", () => {
  it("reproduces the note's row splits via cumulative boundaries", () => {
    expect(variableHullLayout(6)).toEqual([2, 4, 5, 6]); // 2/2/1/1
    expect(variableHullLayout(12)).toEqual([3, 6, 9, 12]); // 3/3/3/3
    expect(variableHullLayout(18)).toEqual([5, 10, 14, 18]); // 5/5/4/4
    expect(variableHullLayout(24)).toEqual([6, 12, 18, 24]); // 6/6/6/6
    expect(variableHullLayout(30)).toEqual([8, 16, 23, 30]); // 8/8/7/7
  });

  it("always lays out over four rows", () => {
    expect(variableHullLayout(6)).toHaveLength(4);
    expect(variableHullLayout(30)).toHaveLength(4);
  });
});
