import { describe, expect, it } from "vitest";
import { confidenceTest, reactionTest } from "../src/round/morale";

/**
 * C2 — the confidence test. Score = LV + threat level. A roll strictly above the
 * score holds (drop 0); at or below drops one confidence rung; at or below HALF
 * the score (floor) drops two.
 */
describe("confidenceTest", () => {
  it("holds when the roll strictly exceeds the score", () => {
    expect(confidenceTest(8, 2, 3)).toEqual({ drop: 0 }); // score 5, 8 > 5
  });

  it("drops one when the roll is at or below the score", () => {
    expect(confidenceTest(5, 2, 3)).toEqual({ drop: 1 }); // score 5, 5 <= 5
    expect(confidenceTest(4, 2, 3)).toEqual({ drop: 1 }); // above half (2)
  });

  it("drops two when the roll is at or below half the score (floor)", () => {
    expect(confidenceTest(2, 2, 3)).toEqual({ drop: 2 }); // score 5, floor(5/2)=2, 2<=2
    expect(confidenceTest(1, 2, 3)).toEqual({ drop: 2 });
  });
});

/**
 * C3 — the reaction test. Same strict-exceed mechanic (roll > LV + threat), but
 * it never touches confidence — a distinct boolean pass/fail; a failure just
 * loses the action.
 */
describe("reactionTest", () => {
  it("passes on a strict exceed of LV + threat", () => {
    expect(reactionTest(6, 2, 3)).toBe(true); // score 5, 6 > 5
  });

  it("fails at or below the score", () => {
    expect(reactionTest(5, 2, 3)).toBe(false);
    expect(reactionTest(1, 2, 3)).toBe(false);
  });
});
