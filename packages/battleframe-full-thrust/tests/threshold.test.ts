import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { thresholdKillOn, knockedOutIndices } from "../src/ship/threshold";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("thresholdKillOn (FT2 rolls high: 6 / 5-6 / 4-6)", () => {
  it("kills on 6 at the 1st threshold", () => {
    expect(thresholdKillOn(1, 0)).toBe(6);
  });
  it("kills on 5+ at the 2nd threshold", () => {
    expect(thresholdKillOn(2, 0)).toBe(5);
  });
  it("kills on 4+ at the 3rd threshold", () => {
    expect(thresholdKillOn(3, 0)).toBe(4);
  });

  it("lowers the kill number by 1 per extra threshold passed in one attack", () => {
    // 3rd threshold normally 4+, one extra threshold passed -> 3+.
    expect(thresholdKillOn(3, 1)).toBe(3);
  });

  it("never drops below a 2+ kill number (a system is never auto-lost)", () => {
    expect(thresholdKillOn(3, 5)).toBe(2);
  });
});

describe("knockedOutIndices", () => {
  it("knocks out systems whose die is at or above the kill number", () => {
    // killOn 5: faces 6,4,5,2 -> indices 0 and 2 are lost.
    expect(knockedOutIndices([6, 4, 5, 2], 5)).toEqual([0, 2]);
  });

  it("returns nothing when no die reaches the kill number", () => {
    expect(knockedOutIndices([1, 2, 3, 4], 6)).toEqual([]);
  });
});
