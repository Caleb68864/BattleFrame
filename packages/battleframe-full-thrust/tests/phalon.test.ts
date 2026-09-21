import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  plasmaBoltPdsReduction,
  plasmaBoltInterceptReduction,
  plasmaBoltStrength,
  plasmaBoltDamageForFace,
  poolPlasmaBoltDamage,
  applyShellHit,
  applyKgunShellHit,
  applyHalfArmourShellHit
} from "../src/combat/phalon";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


// All numbers hand-computed from the user's notes:
//   Factions & Ships/Xeno/Phalon Systems.md, Phalons.md, K-guns.md.

// --- Plasma Bolt Launchers: interception (strength reduction) ----------------

describe("plasmaBoltPdsReduction (each PDS 6 = -1 to bolt strength)", () => {
  it("reduces by 1 only on a 6", () => {
    expect(plasmaBoltPdsReduction(6)).toBe(1);
  });
  it("does nothing below 6 (PDS beats plasma only on a 6)", () => {
    expect(plasmaBoltPdsReduction(5)).toBe(0);
    expect(plasmaBoltPdsReduction(4)).toBe(0);
    expect(plasmaBoltPdsReduction(1)).toBe(0);
  });
});

describe("plasmaBoltInterceptReduction (scatterguns/interceptor pods roll like a beam die: 4-5 = -1, 6 = -2)", () => {
  it("reduces by 1 on a 4 or 5", () => {
    expect(plasmaBoltInterceptReduction(4)).toBe(1);
    expect(plasmaBoltInterceptReduction(5)).toBe(1);
  });
  it("reduces by 2 on a 6", () => {
    expect(plasmaBoltInterceptReduction(6)).toBe(2);
  });
  it("does nothing on 1-3 (no rerolls)", () => {
    expect(plasmaBoltInterceptReduction(3)).toBe(0);
    expect(plasmaBoltInterceptReduction(1)).toBe(0);
  });
});

describe("plasmaBoltStrength (reduced size = size minus all PDS/interceptor reductions, floored at 0)", () => {
  it("is the unreduced size when nothing intercepts", () => {
    expect(plasmaBoltStrength(3, [], [])).toBe(3);
  });
  it("subtracts PDS 6s and interceptor dice together", () => {
    // size 6, one PDS 6 (-1), two interceptor 4s (-1 each) = 6 - 3 = 3.
    expect(plasmaBoltStrength(6, [6], [4, 4])).toBe(3);
  });
  it("subtracts 2 for an interceptor 6", () => {
    // size 4, two PDS 6s (-2), one interceptor 6 (-2) = 4 - 4 = 0.
    expect(plasmaBoltStrength(4, [6, 6], [6])).toBe(0);
  });
  it("never drops below 0 (over-interception cannot make a negative bolt)", () => {
    expect(plasmaBoltStrength(2, [6, 6, 6], [])).toBe(0);
  });
  it("ignores PDS/interceptor misses", () => {
    expect(plasmaBoltStrength(5, [1, 2, 3], [1, 2, 3])).toBe(5);
  });
});

// --- Plasma Bolt Launchers: burst damage -------------------------------------

describe("plasmaBoltDamageForFace (full dice: DP = die score; screens/shrouds negate high rolls)", () => {
  it("unscreened DP equals the die score", () => {
    expect(plasmaBoltDamageForFace(6, 0)).toBe(6);
    expect(plasmaBoltDamageForFace(5, 0)).toBe(5);
    expect(plasmaBoltDamageForFace(1, 0)).toBe(1);
  });
  it("level-1 screen negates 6s only", () => {
    expect(plasmaBoltDamageForFace(6, 1)).toBe(0);
    expect(plasmaBoltDamageForFace(5, 1)).toBe(5);
    expect(plasmaBoltDamageForFace(4, 1)).toBe(4);
  });
  it("level-2 screen / vapour shroud negates 5s and 6s", () => {
    expect(plasmaBoltDamageForFace(6, 2)).toBe(0);
    expect(plasmaBoltDamageForFace(5, 2)).toBe(0);
    expect(plasmaBoltDamageForFace(4, 2)).toBe(4);
    expect(plasmaBoltDamageForFace(1, 2)).toBe(1);
  });
  it("caps at level-2 (a screen above 2 protects no more than a shroud)", () => {
    expect(plasmaBoltDamageForFace(5, 3)).toBe(0);
    expect(plasmaBoltDamageForFace(4, 3)).toBe(4);
  });
});

describe("poolPlasmaBoltDamage (sum of the reduced bolt's dice)", () => {
  it("sums full dice unscreened", () => {
    expect(poolPlasmaBoltDamage([6, 5, 4, 1], 0)).toBe(16);
  });
  it("drops 6s under a level-1 screen", () => {
    expect(poolPlasmaBoltDamage([6, 5, 4, 1], 1)).toBe(10);
  });
  it("drops 5s and 6s under a level-2 screen / shroud", () => {
    expect(poolPlasmaBoltDamage([6, 5, 4, 1], 2)).toBe(5);
  });
});

// --- Shell armour: normal hits (outermost layer first, overflow to hull) ------

describe("applyShellHit (hits cross off the outermost layer first, then inward, then hull)", () => {
  it("spends the outer layer before touching the inner one", () => {
    const result = applyShellHit({
      layers: [
        { boxes: 2, damage: 0 },
        { boxes: 2, damage: 0 }
      ],
      hull: { boxes: 10, damage: 0, rows: 4 },
      incoming: 3
    });
    expect(result.layers).toEqual([
      { boxes: 2, damage: 2 },
      { boxes: 2, damage: 1 }
    ]);
    expect(result.hull.damage).toBe(0);
    expect(result.destroyed).toBe(false);
  });
  it("overflows to the hull once every layer is spent", () => {
    const result = applyShellHit({
      layers: [
        { boxes: 2, damage: 0 },
        { boxes: 2, damage: 0 }
      ],
      hull: { boxes: 10, damage: 0, rows: 4 },
      incoming: 5
    });
    expect(result.layers).toEqual([
      { boxes: 2, damage: 2 },
      { boxes: 2, damage: 2 }
    ]);
    expect(result.hull.damage).toBe(1);
  });
  it("starts from partially-damaged layers", () => {
    const result = applyShellHit({
      layers: [
        { boxes: 2, damage: 2 },
        { boxes: 2, damage: 1 }
      ],
      hull: { boxes: 10, damage: 0, rows: 4 },
      incoming: 2
    });
    expect(result.layers).toEqual([
      { boxes: 2, damage: 2 },
      { boxes: 2, damage: 2 }
    ]);
    expect(result.hull.damage).toBe(1);
  });
});

// --- Shell armour: K-gun hits (one box from EACH layer, remainder to hull) ----

describe("applyKgunShellHit (K-gun takes one box from EACH layer, then remainder to hull)", () => {
  it("removes exactly one box per layer and sends the rest to hull", () => {
    const result = applyKgunShellHit({
      layers: [
        { boxes: 2, damage: 0 },
        { boxes: 2, damage: 0 },
        { boxes: 2, damage: 0 }
      ],
      hull: { boxes: 10, damage: 0, rows: 4 },
      damage: 6
    });
    expect(result.layers).toEqual([
      { boxes: 2, damage: 1 },
      { boxes: 2, damage: 1 },
      { boxes: 2, damage: 1 }
    ]);
    expect(result.hull.damage).toBe(3);
  });
  it("skips spent layers (a box only comes from layers that still have one)", () => {
    const result = applyKgunShellHit({
      layers: [
        { boxes: 2, damage: 2 },
        { boxes: 2, damage: 0 },
        { boxes: 2, damage: 0 }
      ],
      hull: { boxes: 10, damage: 0, rows: 4 },
      damage: 5
    });
    expect(result.layers).toEqual([
      { boxes: 2, damage: 2 },
      { boxes: 2, damage: 1 },
      { boxes: 2, damage: 1 }
    ]);
    expect(result.hull.damage).toBe(3);
  });
  it("cannot take more boxes than its DP (a small hit reaches outward layers only)", () => {
    const result = applyKgunShellHit({
      layers: [
        { boxes: 2, damage: 0 },
        { boxes: 2, damage: 0 },
        { boxes: 2, damage: 0 }
      ],
      hull: { boxes: 10, damage: 0, rows: 4 },
      damage: 2
    });
    expect(result.layers).toEqual([
      { boxes: 2, damage: 1 },
      { boxes: 2, damage: 1 },
      { boxes: 2, damage: 0 }
    ]);
    expect(result.hull.damage).toBe(0);
  });
  it("puts the whole hit on the hull when there is no shell left", () => {
    const result = applyKgunShellHit({
      layers: [{ boxes: 1, damage: 1 }],
      hull: { boxes: 10, damage: 0, rows: 4 },
      damage: 4
    });
    expect(result.layers).toEqual([{ boxes: 1, damage: 1 }]);
    expect(result.hull.damage).toBe(4);
  });
});

// --- Shell armour: half-armour weapons (half to outer, half to next layer) ----

describe("applyHalfArmourShellHit (splits half to the outer layer, half to the next layer)", () => {
  it("splits an even hit evenly across the two outermost layers", () => {
    const result = applyHalfArmourShellHit({
      layers: [
        { boxes: 4, damage: 0 },
        { boxes: 4, damage: 0 }
      ],
      hull: { boxes: 10, damage: 0, rows: 4 },
      incoming: 4
    });
    expect(result.layers).toEqual([
      { boxes: 4, damage: 2 },
      { boxes: 4, damage: 2 }
    ]);
    expect(result.hull.damage).toBe(0);
  });
  it("sends the odd point to the outer layer (assumed rounding; see note)", () => {
    const result = applyHalfArmourShellHit({
      layers: [
        { boxes: 4, damage: 0 },
        { boxes: 4, damage: 0 }
      ],
      hull: { boxes: 10, damage: 0, rows: 4 },
      incoming: 3
    });
    expect(result.layers).toEqual([
      { boxes: 4, damage: 2 },
      { boxes: 4, damage: 1 }
    ]);
    expect(result.hull.damage).toBe(0);
  });
  it("overflows each half inward once its target layer is full", () => {
    // outer half ceil(6/2)=3 -> layer0 absorbs 1, 2 overflow inward;
    // next half floor(6/2)=3 -> layer1 absorbs 1, 2 overflow inward.
    // remaining layer (index 2, 4 boxes) absorbs the 4 overflow.
    const result = applyHalfArmourShellHit({
      layers: [
        { boxes: 1, damage: 0 },
        { boxes: 1, damage: 0 },
        { boxes: 4, damage: 0 }
      ],
      hull: { boxes: 10, damage: 0, rows: 4 },
      incoming: 6
    });
    expect(result.layers).toEqual([
      { boxes: 1, damage: 1 },
      { boxes: 1, damage: 1 },
      { boxes: 4, damage: 4 }
    ]);
    expect(result.hull.damage).toBe(0);
  });
});
