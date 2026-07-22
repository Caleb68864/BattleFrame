import { describe, expect, it } from "vitest";
import {
  novaCannonDamage,
  novaCannonDiceForTurn,
  novaCannonTemplateInches,
  novaCannonSweep,
  waveGunDamage,
  waveGunDiceAtRange,
  waveGunTemplateInches,
  waveGunIsCharged,
  waveGunChargeAfterTurn,
  waveGunChargeAfterFiring,
  waveGunFeedbackDamage
} from "../src/combat/spinal";

// --- Nova Cannon ------------------------------------------------------------

describe("novaCannonDamage (damage = actual die score, screens give no protection)", () => {
  it("sums the die faces directly (6D6 on turn 1 spans 6-36)", () => {
    // Note: "Damage per die = the face rolled (6D6 = 6-36 points on turn 1)."
    expect(novaCannonDamage([1, 1, 1, 1, 1, 1])).toBe(6);
    expect(novaCannonDamage([6, 6, 6, 6, 6, 6])).toBe(36);
    expect(novaCannonDamage([1, 2, 3, 4, 5, 6])).toBe(21);
  });
  it("is zero for an empty pool", () => {
    expect(novaCannonDamage([])).toBe(0);
  });
});

describe("novaCannonDiceForTurn (6D6 turn 1, 4D6 turn 2, 2D6 turn 3, then burnt out)", () => {
  it("rolls the falling dice count across its 3-turn life", () => {
    expect(novaCannonDiceForTurn(1)).toBe(6);
    expect(novaCannonDiceForTurn(2)).toBe(4);
    expect(novaCannonDiceForTurn(3)).toBe(2);
  });
  it("rolls nothing before it arms or after it burns out", () => {
    expect(novaCannonDiceForTurn(0)).toBe(0);
    expect(novaCannonDiceForTurn(4)).toBe(0);
  });
});

describe("novaCannonTemplateInches (2\"/4\"/6\" over its 3 turns)", () => {
  it("widens the template each turn", () => {
    expect(novaCannonTemplateInches(1)).toBe(2);
    expect(novaCannonTemplateInches(2)).toBe(4);
    expect(novaCannonTemplateInches(3)).toBe(6);
  });
  it("is zero outside the weapon's life", () => {
    expect(novaCannonTemplateInches(0)).toBe(0);
    expect(novaCannonTemplateInches(4)).toBe(0);
  });
});

describe("novaCannonSweep (cumulative forward sweep from the 6mu arming point)", () => {
  it("turn 1: 2\" / 6D6, from the 6mu arming point forward 18mu (24mu total)", () => {
    expect(novaCannonSweep(1)).toEqual({
      diameterInches: 2,
      diceCount: 6,
      travelMu: 18,
      startOffsetMu: 6,
      endOffsetMu: 24
    });
  });
  it("turn 2: 4\" / 4D6, continuing 24mu further (24 -> 48mu)", () => {
    expect(novaCannonSweep(2)).toEqual({
      diameterInches: 4,
      diceCount: 4,
      travelMu: 24,
      startOffsetMu: 24,
      endOffsetMu: 48
    });
  });
  it("turn 3: 6\" / 2D6, continuing 24mu further (48 -> 72mu)", () => {
    expect(novaCannonSweep(3)).toEqual({
      diameterInches: 6,
      diceCount: 2,
      travelMu: 24,
      startOffsetMu: 48,
      endOffsetMu: 72
    });
  });
  it("is null before arming and after it burns out", () => {
    expect(novaCannonSweep(0)).toBeNull();
    expect(novaCannonSweep(4)).toBeNull();
  });
});

// --- Wave Gun ---------------------------------------------------------------

describe("waveGunDamage (damage = actual die score; screens/armour give no protection)", () => {
  it("sums the die faces directly", () => {
    expect(waveGunDamage([1, 2, 3, 4])).toBe(10);
    expect(waveGunDamage([6, 6, 6])).toBe(18);
  });
  it("is zero for an empty pool", () => {
    expect(waveGunDamage([])).toBe(0);
  });
});

describe("waveGunDiceAtRange (4D6 0-12, 3D6 12-24, 2D6 24-36, boundary inclusive at lower band)", () => {
  it("rolls 4 dice within 12mu", () => {
    expect(waveGunDiceAtRange(0)).toBe(4);
    expect(waveGunDiceAtRange(12)).toBe(4);
  });
  it("rolls 3 dice in the 12-24 band and 2 in the 24-36 band", () => {
    expect(waveGunDiceAtRange(12.1)).toBe(3);
    expect(waveGunDiceAtRange(24)).toBe(3);
    expect(waveGunDiceAtRange(24.1)).toBe(2);
    expect(waveGunDiceAtRange(36)).toBe(2);
  });
  it("rolls nothing beyond its 36mu reach or at a non-finite distance", () => {
    expect(waveGunDiceAtRange(36.1)).toBe(0);
    expect(waveGunDiceAtRange(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("waveGunTemplateInches (2\"/3\"/4\" by range band)", () => {
  it("widens the template with range", () => {
    expect(waveGunTemplateInches(12)).toBe(2);
    expect(waveGunTemplateInches(24)).toBe(3);
    expect(waveGunTemplateInches(36)).toBe(4);
  });
  it("is zero beyond reach", () => {
    expect(waveGunTemplateInches(36.1)).toBe(0);
  });
});

describe("waveGun charging (accumulate 1d6/turn; fully charged at 6+; fire discharges to zero)", () => {
  it("accumulates the die face onto the stored charge each charging turn", () => {
    expect(waveGunChargeAfterTurn(0, 4)).toBe(4);
    expect(waveGunChargeAfterTurn(4, 3)).toBe(7);
  });
  it("is fully charged (may fire) only at a stored total of 6 or more", () => {
    expect(waveGunIsCharged(5)).toBe(false);
    expect(waveGunIsCharged(6)).toBe(true);
    expect(waveGunIsCharged(7)).toBe(true);
  });
  it("can charge fully in one turn on a rolled 6, or over several turns", () => {
    expect(waveGunIsCharged(waveGunChargeAfterTurn(0, 6))).toBe(true);
    expect(waveGunIsCharged(waveGunChargeAfterTurn(waveGunChargeAfterTurn(0, 2), 3))).toBe(false);
  });
  it("fully discharges when fired (recharge from zero)", () => {
    expect(waveGunChargeAfterFiring()).toBe(0);
  });
});

describe("waveGunFeedbackDamage (knocked out while charging/charged: ship takes the stored charge)", () => {
  it("returns the current stored charge as feedback damage", () => {
    expect(waveGunFeedbackDamage(0)).toBe(0);
    expect(waveGunFeedbackDamage(5)).toBe(5);
    expect(waveGunFeedbackDamage(9)).toBe(9);
  });
});
