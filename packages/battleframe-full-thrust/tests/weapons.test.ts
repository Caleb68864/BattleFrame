import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { torpedoToHit, countHits, submunitionDiceAtRange } from "../src/combat/weapons";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("torpedoToHit (2+/3+/4+/5+/6 by 6mu band, max 30mu)", () => {
  it("needs 2+ within 6mu, boundary inclusive", () => {
    expect(torpedoToHit(0)).toBe(2);
    expect(torpedoToHit(6)).toBe(2);
  });
  it("raises the target number one per further 6mu band", () => {
    expect(torpedoToHit(6.1)).toBe(3);
    expect(torpedoToHit(12)).toBe(3);
    expect(torpedoToHit(18)).toBe(4);
    expect(torpedoToHit(24)).toBe(5);
    expect(torpedoToHit(30)).toBe(6);
  });
  it("is null beyond 30mu (out of range)", () => {
    expect(torpedoToHit(30.1)).toBeNull();
  });
});

describe("countHits", () => {
  it("counts dice at or above the to-hit number", () => {
    expect(countHits([4, 6, 2, 5], 5)).toBe(2);
  });
});

describe("submunitionDiceAtRange (3D6 0-6, 2D6 6-12, 1D6 12-18)", () => {
  it("rolls 3 dice within 6mu", () => {
    expect(submunitionDiceAtRange(6)).toBe(3);
  });
  it("rolls 2 dice in the 6-12 band and 1 in the 12-18 band", () => {
    expect(submunitionDiceAtRange(6.1)).toBe(2);
    expect(submunitionDiceAtRange(12)).toBe(2);
    expect(submunitionDiceAtRange(12.1)).toBe(1);
    expect(submunitionDiceAtRange(18)).toBe(1);
  });
  it("rolls nothing beyond 18mu", () => {
    expect(submunitionDiceAtRange(18.1)).toBe(0);
  });
});
