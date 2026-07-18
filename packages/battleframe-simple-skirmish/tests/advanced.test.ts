import { describe, expect, it } from "vitest";
import { championDieSize } from "../src/combat/champion";
import { effectiveMoveInches, moveSpeedInches } from "../src/round/movement";
import { resolveAttack, type DiceApiLike } from "../src/combat/resolve";

describe("championDieSize", () => {
  it("uses the item's die, or the basic d6 when the champion has no item", () => {
    expect(championDieSize(12)).toBe(12);
    expect(championDieSize(8)).toBe(8);
    expect(championDieSize(null)).toBe(6);
    expect(championDieSize(undefined)).toBe(6);
  });
});

describe("resolveAttack honours a larger champion die", () => {
  it("rolls the given die size for every roll", async () => {
    const formulas: string[] = [];
    const dice: DiceApiLike = {
      async roll(formula) {
        formulas.push(formula);
        return { total: 10 }; // 10 >= a 5+ attack, and >= a 5 save -> saved
      }
    };

    await resolveAttack({ dice, models: 2, attackTarget: 5, saveTarget: 6, type: "magic", dieSize: 12 });

    expect(formulas).toContain("1d12");
    expect(formulas.every((f) => f === "1d12")).toBe(true);
  });
});

describe("movement", () => {
  it("maps the three named speeds to inches", () => {
    expect(moveSpeedInches("shambling")).toBe(3);
    expect(moveSpeedInches("standard")).toBe(6);
    expect(moveSpeedInches("fast")).toBe(9);
  });

  it("halves for terrain, halves for vertical, and stacks them literally", () => {
    expect(effectiveMoveInches(6)).toBe(6);
    expect(effectiveMoveInches(6, { throughTerrain: true })).toBe(3);
    expect(effectiveMoveInches(6, { vertical: true })).toBe(3);
    expect(effectiveMoveInches(6, { throughTerrain: true, vertical: true })).toBe(1.5);
  });
});
