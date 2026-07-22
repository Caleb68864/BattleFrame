import { describe, expect, it } from "vitest";
import {
  pilotQualityForRoll,
  pilotAttackDice,
  aceSystemSnipeDice,
  pilotMoraleModifier,
  pilotMoralePasses,
  pilotRequiresMoraleCheck,
  pilotMoraleBreakThreshold,
  pilotMoraleBreaks,
  pilotDogfightDieModifier,
  pilotDogfightFaces,
  pilotInitiativeModifier
} from "../src/combat/pilot";

describe("pilotQualityForRoll (1D6 per group: 6 = Ace, 1 = Turkey, 2-5 = average)", () => {
  it("makes a 6 an Ace and a 1 a Turkey", () => {
    expect(pilotQualityForRoll(6)).toBe("ace");
    expect(pilotQualityForRoll(1)).toBe("turkey");
  });
  it("leaves 2-5 as standard (average)", () => {
    expect(pilotQualityForRoll(2)).toBe("standard");
    expect(pilotQualityForRoll(5)).toBe("standard");
  });
});

describe("pilotAttackDice (Ace: +1 die on all normal attacks)", () => {
  it("gives an Ace group one extra die (a full 6 rolls 7)", () => {
    expect(pilotAttackDice(6, "ace")).toBe(7);
    expect(pilotAttackDice(4, "ace")).toBe(5);
  });
  it("gives standard and Turkey groups one die per fighter", () => {
    expect(pilotAttackDice(6, "standard")).toBe(6);
    expect(pilotAttackDice(6, "turkey")).toBe(6);
  });
  it("diverts the Ace's extra die when the Ace snipes a system that turn", () => {
    // "the group then loses the Ace's extra die that turn"
    expect(pilotAttackDice(6, "ace", { aceSnipesSystem: true })).toBe(6);
    expect(pilotAttackDice(6, "standard", { aceSnipesSystem: true })).toBe(6);
  });
});

describe("aceSystemSnipeDice (Ace's single specific-system attack die)", () => {
  it("is one die for an Ace and none for other pilots", () => {
    expect(aceSystemSnipeDice("ace")).toBe(1);
    expect(aceSystemSnipeDice("standard")).toBe(0);
    expect(aceSystemSnipeDice("turkey")).toBe(0);
  });
});

describe("pilotMoraleModifier (Ace -1, Turkey +1 to morale rolls)", () => {
  it("subtracts for Aces, adds for Turkeys, nothing for standard", () => {
    expect(pilotMoraleModifier("ace")).toBe(-1);
    expect(pilotMoraleModifier("turkey")).toBe(1);
    expect(pilotMoraleModifier("standard")).toBe(0);
  });
});

describe("pilotMoralePasses ((roll + modifier) <= fighters remaining)", () => {
  it("lets an Ace group pass a roll a standard group would fail", () => {
    expect(pilotMoralePasses(5, 4, "standard")).toBe(false);
    expect(pilotMoralePasses(5, 4, "ace")).toBe(true); // 5 - 1 = 4 <= 4
  });
  it("makes a Turkey group fail a roll a standard group would pass", () => {
    expect(pilotMoralePasses(4, 4, "standard")).toBe(true);
    expect(pilotMoralePasses(4, 4, "turkey")).toBe(false); // 4 + 1 = 5 > 4
  });
});

describe("pilotRequiresMoraleCheck (depleted groups roll; Turkeys always roll)", () => {
  it("skips the check for a full standard/Ace group", () => {
    expect(pilotRequiresMoraleCheck(6, "standard")).toBe(false);
    expect(pilotRequiresMoraleCheck(6, "ace")).toBe(false);
  });
  it("requires the check for any depleted group", () => {
    expect(pilotRequiresMoraleCheck(5, "standard")).toBe(true);
  });
  it("requires the check for a Turkey group even at full strength", () => {
    expect(pilotRequiresMoraleCheck(6, "turkey")).toBe(true);
  });
});

describe("pilotMoraleBreakThreshold (Turkey breaks after 2 fails, others 3)", () => {
  it("is two for a Turkey and three for others", () => {
    expect(pilotMoraleBreakThreshold("turkey")).toBe(2);
    expect(pilotMoraleBreakThreshold("standard")).toBe(3);
    expect(pilotMoraleBreakThreshold("ace")).toBe(3);
  });
});

describe("pilotMoraleBreaks (consecutive fails reach the threshold)", () => {
  it("breaks a Turkey after two consecutive fails", () => {
    expect(pilotMoraleBreaks(2, "turkey")).toBe(true);
    expect(pilotMoraleBreaks(1, "turkey")).toBe(false);
  });
  it("breaks a standard group only after three", () => {
    expect(pilotMoraleBreaks(2, "standard")).toBe(false);
    expect(pilotMoraleBreaks(3, "standard")).toBe(true);
  });
});

describe("pilotDogfightDieModifier (Turkey -1 to every dogfight die)", () => {
  it("is -1 for a Turkey and 0 otherwise", () => {
    expect(pilotDogfightDieModifier("turkey")).toBe(-1);
    expect(pilotDogfightDieModifier("standard")).toBe(0);
    expect(pilotDogfightDieModifier("ace")).toBe(0);
  });
});

describe("pilotDogfightFaces (applies the dogfight die modifier per die)", () => {
  it("drops each Turkey dogfight die by one", () => {
    expect(pilotDogfightFaces([6, 4, 1], "turkey")).toEqual([5, 3, 0]);
  });
  it("leaves standard/Ace dogfight dice unchanged (Ace uses its extra die instead)", () => {
    expect(pilotDogfightFaces([6, 4, 1], "standard")).toEqual([6, 4, 1]);
    expect(pilotDogfightFaces([6, 4, 1], "ace")).toEqual([6, 4, 1]);
  });
});

describe("pilotInitiativeModifier (Fleet Book 1: +1 per Ace, -1 per Turkey group)", () => {
  it("is +1 for an Ace, -1 for a Turkey, 0 for standard", () => {
    expect(pilotInitiativeModifier("ace")).toBe(1);
    expect(pilotInitiativeModifier("turkey")).toBe(-1);
    expect(pilotInitiativeModifier("standard")).toBe(0);
  });
});
