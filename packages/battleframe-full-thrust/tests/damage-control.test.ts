import { describe, expect, it } from "vitest";
import { damageControlRepairs, standardDamageControlParties } from "../src/combat/damage-control";

describe("damageControlRepairs (More Thrust: each DCP rolls 1D6, a 6 repairs one system)", () => {
  it("counts one repair per 6 rolled", () => {
    expect(damageControlRepairs([6, 3, 6, 1])).toBe(2);
  });
  it("is zero when no party rolls a 6", () => {
    expect(damageControlRepairs([1, 2, 3, 4, 5])).toBe(0);
  });
});

describe("standardDamageControlParties (free allowance by class)", () => {
  it("gives escort 1, cruiser 2, capital 3", () => {
    expect(standardDamageControlParties("escort")).toBe(1);
    expect(standardDamageControlParties("cruiser")).toBe(2);
    expect(standardDamageControlParties("capital")).toBe(3);
  });
});
