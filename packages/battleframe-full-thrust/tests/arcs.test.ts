import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { arcForBearing, weaponBearsOn } from "../src/combat/arcs";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("arcForBearing (6 x 60-degree arcs, clockwise from ahead)", () => {
  it("puts dead ahead in the fore arc", () => {
    expect(arcForBearing(0)).toBe("F");
    expect(arcForBearing(29)).toBe("F");
    expect(arcForBearing(331)).toBe("F");
  });

  it("buckets the clockwise (starboard) arcs", () => {
    expect(arcForBearing(30)).toBe("FS"); // 1 o'clock -> fore-starboard
    expect(arcForBearing(89)).toBe("FS");
    expect(arcForBearing(90)).toBe("AS"); // 3 o'clock -> aft-starboard
    expect(arcForBearing(149)).toBe("AS");
  });

  it("buckets the aft arc around dead astern", () => {
    expect(arcForBearing(150)).toBe("A");
    expect(arcForBearing(180)).toBe("A");
    expect(arcForBearing(209)).toBe("A");
  });

  it("buckets the anticlockwise (port) arcs", () => {
    expect(arcForBearing(210)).toBe("AP"); // 7 o'clock -> aft-port
    expect(arcForBearing(269)).toBe("AP");
    expect(arcForBearing(270)).toBe("FP"); // 9 o'clock -> fore-port
    expect(arcForBearing(329)).toBe("FP");
  });

  it("normalises out-of-range bearings", () => {
    expect(arcForBearing(360)).toBe("F");
    expect(arcForBearing(-90)).toBe("FP"); // -90 -> 270 -> fore-port
  });
});

describe("weaponBearsOn", () => {
  it("is true when the target's arc is one the weapon covers", () => {
    expect(weaponBearsOn(["F", "FS", "FP"], 0)).toBe(true); // fore target, fore-covering weapon
    expect(weaponBearsOn(["F", "FS", "FP"], 60)).toBe(true); // fore-starboard
  });

  it("is false when the target is in an arc the weapon cannot cover", () => {
    // A weapon with no aft coverage cannot fire at a target dead astern.
    expect(weaponBearsOn(["F", "FS", "FP"], 180)).toBe(false);
  });
});
