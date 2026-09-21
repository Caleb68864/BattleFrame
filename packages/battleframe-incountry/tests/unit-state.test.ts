import { describe, expect, it } from "vitest";
import {
  armorModifier,
  attackValue,
  canReactWith,
  isDestroyed,
  type UnitSystemData,
  type WeaponProfile
} from "../src/data/unit-state";

function weapon(extra: Partial<WeaponProfile> = {}): WeaponProfile {
  return { name: "Rifle", count: 1, dmg: 1, attackDice: 2, owDice: 1, ...extra };
}

function unit(extra: Partial<UnitSystemData> = {}): UnitSystemData {
  return {
    modelCount: 4,
    modelsRemaining: 4,
    move: 6,
    morale: 6,
    attackClear: 7,
    attackCover: 5,
    armorType: "body",
    suppressed: false,
    weapons: [weapon()],
    ...extra
  };
}

describe("isDestroyed", () => {
  it("is destroyed at zero models", () => {
    expect(isDestroyed(unit({ modelsRemaining: 0 }))).toBe(true);
  });
  it("is alive while a model remains", () => {
    expect(isDestroyed(unit({ modelsRemaining: 1 }))).toBe(false);
  });
});

describe("attackValue — cover swaps to the lower number", () => {
  it("uses the clear value out of cover", () => {
    expect(attackValue(unit(), false)).toBe(7);
  });
  it("uses the cover value in cover", () => {
    expect(attackValue(unit(), true)).toBe(5);
  });
});

describe("armorModifier — read off the card", () => {
  it("hands back the modifier the user entered", () => {
    expect(armorModifier(unit({ armorModifier: 3 }))).toBe(3);
    expect(armorModifier(unit({ armorModifier: 7 }))).toBe(7);
  });

  /**
   * This replaced a test asserting a published tier table -- +4/+5/+6 by tier
   * name. Stripping the constant is not enough on its own: a suite that
   * re-states the table keeps it in the repository, and this is where it would
   * have survived.
   */
  it("hands back nothing for a card nobody has filled in", () => {
    expect(armorModifier(unit({ armorModifier: 0 }))).toBe(0);
  });
});

describe("canReactWith — needs a react profile", () => {
  it("can react when the weapon has overwatch dice", () => {
    expect(canReactWith(weapon({ owDice: 1 }))).toBe(true);
  });
  it("cannot react with no overwatch profile", () => {
    expect(canReactWith(weapon({ owDice: 0 }))).toBe(false);
  });
});
