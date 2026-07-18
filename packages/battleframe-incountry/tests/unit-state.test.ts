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

describe("armorModifier — from the armor tier", () => {
  it("maps unarmored/body/advanced to +4/+5/+6", () => {
    expect(armorModifier(unit({ armorType: "unarmored" }))).toBe(4);
    expect(armorModifier(unit({ armorType: "body" }))).toBe(5);
    expect(armorModifier(unit({ armorType: "advanced" }))).toBe(6);
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
