import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { beamDiceAtRange, beamDamageForFace } from "../src/combat/beam";
import { torpedoToHit, submunitionDiceAtRange } from "../src/combat/weapons";
import { arcForBearing } from "../src/combat/arcs";
import { thresholdKillOn } from "../src/ship/threshold";
import { rowBoundaries } from "../src/ship/hull";
import { parseOrder } from "../src/movement/orders";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


/**
 * Hardening: the pure rule functions are exported and may receive degenerate
 * input (a NaN distance from an unplaced token, an out-of-schema value from a
 * manual edit / compendium import). None may return NaN/undefined or throw.
 */

describe("beam hardening", () => {
  it("beamDiceAtRange returns 0 for a non-finite distance (not NaN)", () => {
    expect(beamDiceAtRange(3, NaN)).toBe(0);
    expect(beamDiceAtRange(3, Infinity)).toBe(0);
  });
  it("beamDamageForFace treats a negative screen level as unscreened, not maximum", () => {
    expect(beamDamageForFace(6, -1)).toBe(2); // unscreened 6 = 2, not the L3 value of 1
    expect(beamDamageForFace(4, -1)).toBe(1);
  });
});

describe("weapons hardening", () => {
  it("torpedoToHit returns null (never undefined) for a non-finite range", () => {
    expect(torpedoToHit(NaN)).toBeNull();
    expect(torpedoToHit(Infinity)).toBeNull();
  });
  it("submunitionDiceAtRange returns 0 for a non-finite range", () => {
    expect(submunitionDiceAtRange(NaN)).toBe(0);
  });
});

describe("arc hardening", () => {
  it("arcForBearing always returns a valid arc, even for a non-finite bearing", () => {
    expect(arcForBearing(NaN)).toBe("F");
    expect(arcForBearing(Infinity)).toBe("F");
  });
});

describe("threshold hardening", () => {
  it("thresholdKillOn clamps a non-positive threshold instead of returning NaN", () => {
    expect(thresholdKillOn(0, 0)).toBe(6);
    expect(Number.isNaN(thresholdKillOn(-3, 0))).toBe(false);
  });
});

describe("hull hardening", () => {
  it("rowBoundaries treats rows < 1 as a single row instead of dividing by zero", () => {
    expect(rowBoundaries(18, 0)).toEqual([18]);
  });
});

describe("orders hardening", () => {
  it("parseOrder tolerates a nullish argument instead of throwing", () => {
    expect(parseOrder(undefined as unknown as string)).toEqual({ accel: 0, turn: 0 });
    expect(parseOrder(null as unknown as string)).toEqual({ accel: 0, turn: 0 });
  });
});
