import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  penetratingDamageForFace,
  triggersReroll,
  poolPenetratingDamage,
  applyDamageBypassingArmour,
  applyPenetratingDamageWithArmour,
  coreThresholdKillOn,
  knockedOutIndicesWithCore
} from "../src/ship/fleet-book";
import { applyDamageWithArmour } from "../src/ship/damage";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


// -----------------------------------------------------------------------------
// Reroll / penetrating damage (Fleet Book 1, optional)
//   "every roll of 6 inflicts its normal damage AND allows a reroll... If that
//    reroll is also a 6, apply the damage and reroll again, with no limit."
//   The reroll die scores on the ordinary unscreened table: 1-3 nothing, 4-5 = +1,
//   6 = +2 and reroll again.
// -----------------------------------------------------------------------------

describe("penetratingDamageForFace (the reroll-die table: 1-3 = 0, 4-5 = 1, 6 = 2)", () => {
  it("scores nothing on 1-3", () => {
    expect(penetratingDamageForFace(1)).toBe(0);
    expect(penetratingDamageForFace(2)).toBe(0);
    expect(penetratingDamageForFace(3)).toBe(0);
  });
  it("scores 1 on 4-5", () => {
    expect(penetratingDamageForFace(4)).toBe(1);
    expect(penetratingDamageForFace(5)).toBe(1);
  });
  it("scores 2 on 6", () => {
    expect(penetratingDamageForFace(6)).toBe(2);
  });
});

describe("triggersReroll (a rolled 6 penetrates and grants a reroll)", () => {
  it("is true only for a 6", () => {
    expect(triggersReroll(6)).toBe(true);
    expect(triggersReroll(5)).toBe(false);
    expect(triggersReroll(1)).toBe(false);
  });
});

describe("poolPenetratingDamage", () => {
  it("equals the plain beam pool when no die rolls a 6", () => {
    // 4,5,2 unscreened -> 1 + 1 + 0 = 2, no rerolls consumed.
    expect(poolPenetratingDamage([4, 5, 2], [], 0)).toBe(2);
  });

  it("adds a single reroll that misses (initial 6 = 2, reroll 3 = 0)", () => {
    // Initial 6 -> 2 and a reroll; reroll of 3 -> nothing. Total 2.
    expect(poolPenetratingDamage([6], [3], 0)).toBe(2);
  });

  it("chains 6 -> 6 -> 3 to 4 damage (2 + 2 + 0)", () => {
    // Initial 6 = 2 (+reroll); reroll 6 = +2 (+another reroll); reroll 3 = 0.
    expect(poolPenetratingDamage([6], [6, 3], 0)).toBe(4);
  });

  it("chains 6 -> 4 to 3 damage (2 + 1)", () => {
    expect(poolPenetratingDamage([6], [4], 0)).toBe(3);
  });

  it("handles several initial 6s each spawning their own reroll", () => {
    // 6,6 -> 2 + 2 = 4 and two rerolls; both rerolls are 3s -> 0. Total 4.
    expect(poolPenetratingDamage([6, 6], [3, 3], 0)).toBe(4);
  });

  it("stops gracefully when the caller under-supplies reroll faces", () => {
    // Initial 6 owes one reroll but none supplied -> just the initial 2.
    expect(poolPenetratingDamage([6], [], 0)).toBe(2);
  });

  it("screens the INITIAL dice but never the reroll dice", () => {
    // Screen 3: initial 6 scores 1 but still penetrates (face is a 6); the reroll
    // 5 is unscreened -> +1. Total 1 + 1 = 2.
    expect(poolPenetratingDamage([6], [5], 3)).toBe(2);
  });
});

// -----------------------------------------------------------------------------
// Armour bypass (Fleet Book 1, optional): penetrating damage skips armour.
// -----------------------------------------------------------------------------

describe("applyDamageBypassingArmour (all damage straight to hull, armour untouched)", () => {
  it("leaves armour intact and lands every point on the hull", () => {
    const res = applyDamageBypassingArmour({
      armour: { boxes: 10, damage: 0 },
      hull: { boxes: 20, damage: 0, rows: 2 },
      incoming: 5
    });
    expect(res.armour).toEqual({ boxes: 10, damage: 0 });
    expect(res.hull.damage).toBe(5);
    expect(res.destroyed).toBe(false);
  });

  it("differs from the default armour application, which would absorb it", () => {
    const params = {
      armour: { boxes: 10, damage: 0 },
      hull: { boxes: 20, damage: 0, rows: 2 },
      incoming: 5
    };
    const bypass = applyDamageBypassingArmour(params);
    const normal = applyDamageWithArmour(params);
    expect(bypass.hull.damage).toBe(5);
    expect(normal.hull.damage).toBe(0); // absorbed by armour
    expect(normal.armour.damage).toBe(5);
  });
});

describe("applyPenetratingDamageWithArmour (normal spends armour, penetrating hits hull)", () => {
  it("splits normal damage onto armour and penetrating damage onto hull", () => {
    const res = applyPenetratingDamageWithArmour({
      armour: { boxes: 10, damage: 0 },
      hull: { boxes: 20, damage: 0, rows: 2 },
      normalDamage: 4,
      penetratingDamage: 3
    });
    expect(res.armour.damage).toBe(4); // 4 normal spent on armour
    expect(res.hull.damage).toBe(3); // 3 penetrating straight to hull
  });

  it("overflows normal damage past exhausted armour onto the hull, adding penetrating", () => {
    const res = applyPenetratingDamageWithArmour({
      armour: { boxes: 2, damage: 0 },
      hull: { boxes: 20, damage: 0, rows: 2 },
      normalDamage: 5,
      penetratingDamage: 2
    });
    // Armour absorbs 2, overflow 3 to hull; plus 2 penetrating = 5 hull.
    expect(res.armour.damage).toBe(2);
    expect(res.hull.damage).toBe(5);
  });

  it("with zero penetrating damage reduces to the default armour application", () => {
    const params = {
      armour: { boxes: 10, damage: 0 },
      hull: { boxes: 20, damage: 0, rows: 2 },
      incoming: 6
    };
    const normal = applyDamageWithArmour(params);
    const pen = applyPenetratingDamageWithArmour({
      armour: params.armour,
      hull: params.hull,
      normalDamage: 6,
      penetratingDamage: 0
    });
    expect(pen.armour).toEqual(normal.armour);
    expect(pen.hull.damage).toBe(normal.hull.damage);
  });
});

// -----------------------------------------------------------------------------
// Core Systems +1 (Fleet Book 1, optional): buried systems resist thresholds.
//   "core systems roll at +1 to the current threshold number".
// -----------------------------------------------------------------------------

describe("coreThresholdKillOn (+1 to the surface kill number)", () => {
  it("makes 1st-threshold core systems safe (kill on 7 = unreachable on a d6)", () => {
    expect(coreThresholdKillOn(1, 0)).toBe(7);
  });
  it("kills 2nd-threshold core systems only on a 6", () => {
    expect(coreThresholdKillOn(2, 0)).toBe(6);
  });
  it("kills 3rd-threshold core systems on 5-6", () => {
    expect(coreThresholdKillOn(3, 0)).toBe(5);
  });
  it("still tracks the extra-threshold penalty, one step tougher than surface", () => {
    // Surface 3rd threshold + 1 extra = 3+; core = 4+.
    expect(coreThresholdKillOn(3, 1)).toBe(4);
  });
});

describe("knockedOutIndicesWithCore (per-system kill number: core gets +1)", () => {
  it("applies the surface number to surface systems and +1 to core systems", () => {
    // 2nd threshold: surface killOn 5, core killOn 6.
    // faces 6,5,5 ; system 1 is core.
    // s0 surface 6>=5 lost; s1 core 5<6 survives; s2 surface 5>=5 lost.
    expect(knockedOutIndicesWithCore([6, 5, 5], [false, true, false], 2, 0)).toEqual([0, 2]);
  });

  it("makes core systems immune at the 1st threshold", () => {
    // 1st threshold: surface killOn 6, core killOn 7 (unreachable).
    expect(knockedOutIndicesWithCore([6, 6], [false, true], 1, 0)).toEqual([0]);
  });
});
