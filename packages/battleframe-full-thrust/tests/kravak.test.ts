import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  kgunToHit,
  kgunDamageForFace,
  applyKgunHit,
  kgunK1PointDefenceKills,
  mkpHits,
  scattergunFighterKills,
  scattergunPlasmaReduction,
  scattergunShipDamageForFace,
  scattergunFriendlyFireHit
} from "../src/combat/kravak";
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
//   Factions & Ships/Xeno/K-guns.md, Scatterguns.md, Kra'Vak Armour.md.

describe("kgunToHit (all K-gun classes share 2+/3+/4+/5+/6 by 6mu band, max 30mu)", () => {
  // Note: "To hit (roll 1 die per K-gun): 0-6mu 2+, 6-12 3+, 12-18 4+, 18-24 5+, 24-30 6."
  it("needs 2+ within 6mu, boundary inclusive at the nearer band", () => {
    expect(kgunToHit(0)).toBe(2);
    expect(kgunToHit(6)).toBe(2);
  });
  it("raises the target number one per further 6mu band", () => {
    expect(kgunToHit(6.1)).toBe(3);
    expect(kgunToHit(12)).toBe(3);
    expect(kgunToHit(18)).toBe(4);
    expect(kgunToHit(24)).toBe(5);
    expect(kgunToHit(30)).toBe(6);
  });
  it("is null beyond 30mu (out of range)", () => {
    expect(kgunToHit(30.1)).toBeNull();
    expect(kgunToHit(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("kgunDamageForFace (roll>class = class DP; roll<=class = class x2; natural 6 = class)", () => {
  it("class-3 does 6 DP on 1-3, 3 DP on 4-6 (note example)", () => {
    expect(kgunDamageForFace(3, 1)).toBe(6);
    expect(kgunDamageForFace(3, 3)).toBe(6);
    expect(kgunDamageForFace(3, 4)).toBe(3);
    expect(kgunDamageForFace(3, 6)).toBe(3);
  });
  it("class-5 does 10 DP on 1-5, 5 DP on 6 (note example)", () => {
    expect(kgunDamageForFace(5, 1)).toBe(10);
    expect(kgunDamageForFace(5, 5)).toBe(10);
    expect(kgunDamageForFace(5, 6)).toBe(5);
  });
  it("a natural 6 always = class even when class >= 6 (K-6 / K-6+)", () => {
    // class-6: 1-5 double to 12, natural 6 caps at class (6).
    expect(kgunDamageForFace(6, 5)).toBe(12);
    expect(kgunDamageForFace(6, 6)).toBe(6);
    // class-7 (a K-6+): 1-5 double to 14, natural 6 caps at 7.
    expect(kgunDamageForFace(7, 1)).toBe(14);
    expect(kgunDamageForFace(7, 6)).toBe(7);
  });
  it("class-1 doubles only on a 1", () => {
    expect(kgunDamageForFace(1, 1)).toBe(2);
    expect(kgunDamageForFace(1, 2)).toBe(1);
    expect(kgunDamageForFace(1, 6)).toBe(1);
  });
});

describe("applyKgunHit (armour pierce: only the first DP of a single hit hits armour)", () => {
  it("takes exactly 1 DP on armour and sends the remainder straight to hull", () => {
    const result = applyKgunHit({
      armour: { boxes: 3, damage: 0 },
      hull: { boxes: 10, damage: 0, rows: 4 },
      damage: 6
    });
    expect(result.armour).toEqual({ boxes: 3, damage: 1 });
    expect(result.hull.damage).toBe(5);
    expect(result.destroyed).toBe(false);
  });
  it("puts the whole hit on the hull when the ship has no armour", () => {
    const result = applyKgunHit({
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 10, damage: 0, rows: 4 },
      damage: 6
    });
    expect(result.armour).toEqual({ boxes: 0, damage: 0 });
    expect(result.hull.damage).toBe(6);
  });
  it("pierces to hull when armour is already spent", () => {
    const result = applyKgunHit({
      armour: { boxes: 2, damage: 2 },
      hull: { boxes: 10, damage: 0, rows: 4 },
      damage: 4
    });
    expect(result.armour).toEqual({ boxes: 2, damage: 2 });
    expect(result.hull.damage).toBe(4);
  });
});

describe("kgunK1PointDefenceKills (K-1 PD mode: hit on 5-6, one kill per hit)", () => {
  it("counts each die of 5 or 6 as one kill", () => {
    expect(kgunK1PointDefenceKills([5, 6, 4, 3, 5])).toBe(3);
    expect(kgunK1PointDefenceKills([1, 2, 3, 4])).toBe(0);
  });
});

describe("mkpHits (MKP pack: 4-5 = 1 hit, 6 = 2 hits)", () => {
  it("maps the single effect die to hit count", () => {
    expect(mkpHits(3)).toBe(0);
    expect(mkpHits(4)).toBe(1);
    expect(mkpHits(5)).toBe(1);
    expect(mkpHits(6)).toBe(2);
  });
  it("each MKP hit resolves like a class-4 K-gun (flat 4 DP, 1 to armour)", () => {
    const result = applyKgunHit({
      armour: { boxes: 3, damage: 0 },
      hull: { boxes: 10, damage: 0, rows: 4 },
      damage: 4
    });
    expect(result.armour.damage).toBe(1);
    expect(result.hull.damage).toBe(3);
  });
});

describe("scattergunFighterKills (kills 1D6 elements; halve round up vs heavy fighters)", () => {
  it("kills a number of standard fighters equal to the die roll", () => {
    expect(scattergunFighterKills(1)).toBe(1);
    expect(scattergunFighterKills(6)).toBe(6);
  });
  it("halves (round up) against heavy fighters", () => {
    expect(scattergunFighterKills(6, true)).toBe(3);
    expect(scattergunFighterKills(5, true)).toBe(3);
    expect(scattergunFighterKills(1, true)).toBe(1);
  });
});

describe("scattergunPlasmaReduction (4-5 reduces a plasma bolt by 1, 6 by 2)", () => {
  it("maps the effect die to bolt-strength reduction", () => {
    expect(scattergunPlasmaReduction(3)).toBe(0);
    expect(scattergunPlasmaReduction(4)).toBe(1);
    expect(scattergunPlasmaReduction(5)).toBe(1);
    expect(scattergunPlasmaReduction(6)).toBe(2);
  });
});

describe("scattergunShipDamageForFace (point-blank anti-ship: 4-5 = 1 DP, 6 = 2 DP)", () => {
  it("maps the effect die to damage points", () => {
    expect(scattergunShipDamageForFace(3)).toBe(0);
    expect(scattergunShipDamageForFace(4)).toBe(1);
    expect(scattergunShipDamageForFace(6)).toBe(2);
  });
});

describe("scattergunFriendlyFireHit (area-defence: an effect roll of 1 hits the defended ship)", () => {
  it("is true only on a 1", () => {
    expect(scattergunFriendlyFireHit(1)).toBe(true);
    expect(scattergunFriendlyFireHit(2)).toBe(false);
    expect(scattergunFriendlyFireHit(6)).toBe(false);
  });
});
