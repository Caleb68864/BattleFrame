import { describe, expect, it } from "vitest";
import { confidenceTest } from "../src/round/confidence";

/**
 * A8 — the quality-die-vs-threshold confidence test. bar = leadership + threat
 * (threat is the SINGLE highest threat in play, never summed — the caller picks
 * it). Pass beats the bar for no change; a plain fail costs 1 confidence level; a
 * bad fail (roll <= half the bar) costs 2.
 */
describe("confidenceTest", () => {
  it("passes with no confidence change when the roll exceeds the bar", () => {
    expect(confidenceTest(8, 3, 2)).toEqual({ pass: true, clDelta: 0 }); // bar 5, 8 > 5
  });

  it("a plain fail (roll <= bar, > bar/2) drops one level", () => {
    expect(confidenceTest(5, 3, 2)).toEqual({ pass: false, clDelta: -1 }); // bar 5, 5 <= 5, > 2.5
    expect(confidenceTest(3, 3, 2)).toEqual({ pass: false, clDelta: -1 }); // 3 > 2.5
  });

  it("a bad fail (roll <= bar/2) drops two levels", () => {
    expect(confidenceTest(2, 3, 2)).toEqual({ pass: false, clDelta: -2 }); // bar 5, 2 <= 2.5
    expect(confidenceTest(1, 4, 4)).toEqual({ pass: false, clDelta: -2 }); // bar 8, 1 <= 4
  });

  it("uses the single threat value, not a sum (caller supplies the highest)", () => {
    // threat is one number; the function never adds multiple threats itself.
    expect(confidenceTest(6, 5, 1)).toEqual({ pass: false, clDelta: -1 }); // bar 6, 6 <= 6
    expect(confidenceTest(7, 5, 1)).toEqual({ pass: true, clDelta: 0 }); // 7 > 6
  });
});
