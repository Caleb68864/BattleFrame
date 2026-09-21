import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { beamDiceAtRange, beamDamageForFace, poolBeamDamage } from "../src/combat/beam";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("beamDiceAtRange (Class N: N dice 0-12, -1 die per further 12mu band)", () => {
  it("rolls full class dice within the first 12mu band, boundary inclusive", () => {
    expect(beamDiceAtRange(3, 0)).toBe(3);
    expect(beamDiceAtRange(3, 12)).toBe(3);
  });

  it("drops one die per further band", () => {
    expect(beamDiceAtRange(3, 12.1)).toBe(2); // 12-24 band
    expect(beamDiceAtRange(3, 24)).toBe(2);
    expect(beamDiceAtRange(3, 24.1)).toBe(1); // 24-36 band
    expect(beamDiceAtRange(3, 36)).toBe(1);
  });

  it("rolls zero dice beyond the weapon's reach (class x 12mu)", () => {
    expect(beamDiceAtRange(3, 36.1)).toBe(0);
    expect(beamDiceAtRange(1, 12.1)).toBe(0);
  });
});

describe("beamDamageForFace (screens downgrade each die)", () => {
  it("unscreened: 1-3 miss, 4-5 = 1, 6 = 2", () => {
    expect(beamDamageForFace(3, 0)).toBe(0);
    expect(beamDamageForFace(4, 0)).toBe(1);
    expect(beamDamageForFace(5, 0)).toBe(1);
    expect(beamDamageForFace(6, 0)).toBe(2);
  });

  it("level-1 screen ignores 4s (5 = 1, 6 = 2)", () => {
    expect(beamDamageForFace(4, 1)).toBe(0);
    expect(beamDamageForFace(5, 1)).toBe(1);
    expect(beamDamageForFace(6, 1)).toBe(2);
  });

  it("level-2 screen: 5 and 6 each = 1", () => {
    expect(beamDamageForFace(5, 2)).toBe(1);
    expect(beamDamageForFace(6, 2)).toBe(1);
  });

  it("level-3 screen: only a 6 counts, as 1", () => {
    expect(beamDamageForFace(5, 3)).toBe(0);
    expect(beamDamageForFace(6, 3)).toBe(1);
  });
});

describe("poolBeamDamage", () => {
  it("sums the per-die damage of a pool against a screen level", () => {
    // Note example: rolling 1,2,4,6 unscreened = 0+0+1+2 = 3.
    expect(poolBeamDamage([1, 2, 4, 6], 0)).toBe(3);
  });

  it("applies the screen level to every die in the pool", () => {
    expect(poolBeamDamage([4, 5, 6], 1)).toBe(0 + 1 + 2);
  });
});
