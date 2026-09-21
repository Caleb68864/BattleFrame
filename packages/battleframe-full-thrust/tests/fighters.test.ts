import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  fighterAttackDamage,
  pdsKillsVsFighters,
  pdsKillsVsMissiles,
  dogfightKills,
  dogfightKillsAgainst,
  enduranceForType,
  fighterMoralePasses,
  enduranceAfterActiveTurn,
  enduranceExhausted
} from "../src/combat/fighters";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("fighterAttackDamage (vs ships: beam table, screens apply)", () => {
  it("scores 1 per fighter die on 4-5 and 2 on a 6, unscreened", () => {
    expect(fighterAttackDamage([4, 5, 6, 2], 0)).toBe(1 + 1 + 2 + 0);
  });
  it("is reduced by the target's screens like beams", () => {
    // Level-1 screen ignores 4s: 4,5,6 -> 0+1+2 = 3.
    expect(fighterAttackDamage([4, 5, 6], 1)).toBe(3);
  });
});

describe("pdsKillsVsFighters (universal kill table: 4-5 = 1, 6 = 2)", () => {
  it("counts kills across the anti-fighter dice", () => {
    expect(pdsKillsVsFighters([6, 4, 2, 5])).toBe(2 + 1 + 0 + 1);
  });
});

describe("pdsKillsVsMissiles (only a 6 kills; one per system)", () => {
  it("counts one kill per 6 rolled", () => {
    expect(pdsKillsVsMissiles([6, 5, 6, 3])).toBe(2);
  });
});

describe("dogfightKills (universal kill table)", () => {
  it("scores fighter kills like the anti-fighter table", () => {
    expect(dogfightKills([6, 5, 4, 1])).toBe(2 + 1 + 1 + 0);
  });
});

describe("fighterMoralePasses (More Thrust: roll <= fighters remaining = attack)", () => {
  it("passes when the die is at or under the group size", () => {
    expect(fighterMoralePasses(3, 4)).toBe(true);
    expect(fighterMoralePasses(4, 4)).toBe(true);
  });
  it("fails (aborts the attack) when the die exceeds the group size", () => {
    expect(fighterMoralePasses(5, 4)).toBe(false);
  });
});

describe("dogfightKillsAgainst (defender type modifies the kill table)", () => {
  it("scores like the universal table against a standard defender", () => {
    expect(dogfightKillsAgainst([6, 5, 4, 1], "standard")).toBe(2 + 1 + 1 + 0);
  });
  it("treats a Heavy defender as a level-1 screen (4s are ignored)", () => {
    // Heavy = level-1 screen: 4 ignored, 5 = 1, 6 = 2.
    expect(dogfightKillsAgainst([6, 5, 4, 4], "heavy")).toBe(2 + 1 + 0 + 0);
  });
});

describe("enduranceForType (More Thrust specialised types)", () => {
  it("gives Long-Range 5 active turns, others 3", () => {
    expect(enduranceForType("long-range")).toBe(5);
    expect(enduranceForType("standard")).toBe(3);
    expect(enduranceForType("heavy")).toBe(3);
  });
});

describe("fighter endurance (More Thrust)", () => {
  it("spends one endurance per active turn, floored at zero", () => {
    expect(enduranceAfterActiveTurn(3)).toBe(2);
    expect(enduranceAfterActiveTurn(0)).toBe(0);
  });
  it("is exhausted at zero endurance", () => {
    expect(enduranceExhausted(0)).toBe(true);
    expect(enduranceExhausted(1)).toBe(false);
  });
});
