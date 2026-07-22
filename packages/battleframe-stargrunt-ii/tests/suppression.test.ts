import { describe, expect, it } from "vitest";
import {
  placeSuppression,
  removeSuppression,
  clearSuppressionRoll,
  SUPPRESSION_CAP
} from "../src/round/suppression";

/**
 * C1 — suppression markers, a 0..3 counter. Placing stacks but caps at 3;
 * clearing rolls the Quality die and succeeds on a strict exceed of the
 * leadership value (LV), removing exactly one marker per success.
 */
describe("placeSuppression", () => {
  it("adds one marker", () => {
    expect(placeSuppression(0)).toBe(1);
    expect(placeSuppression(2)).toBe(3);
  });

  it("caps at the maximum", () => {
    expect(placeSuppression(SUPPRESSION_CAP)).toBe(SUPPRESSION_CAP);
    expect(placeSuppression(3)).toBe(3);
  });
});

describe("removeSuppression", () => {
  it("removes exactly one marker, never below zero", () => {
    expect(removeSuppression(2)).toBe(1);
    expect(removeSuppression(0)).toBe(0);
  });
});

describe("clearSuppressionRoll", () => {
  it("succeeds only on a strict exceed of LV", () => {
    expect(clearSuppressionRoll(3, 2)).toBe(true);
    expect(clearSuppressionRoll(2, 2)).toBe(false);
    expect(clearSuppressionRoll(1, 2)).toBe(false);
  });
});
