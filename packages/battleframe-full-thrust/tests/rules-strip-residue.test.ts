import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as design from "../src/ship/design";
import { shipClass, thresholdRows, warshipDamagePoints } from "../src/ship/hull";
import { damageControlRepairs, standardDamageControlParties } from "../src/combat/damage-control";
import { enduranceForType } from "../src/combat/fighters";
import { thresholdKillOn } from "../src/ship/threshold";
import { previewTargeting } from "../src/combat/targeting";
import { RulesProfileNotSetError } from "../src/rules-profile";
import { SCENARIO_RULES, withNoRules, withRules } from "./helpers/world";

/**
 * The 2026-09-21 strip moved what lived in `constants.ts`. These tables never
 * lived there: they sat as literals inside the functions that used them, so the
 * strip's guard test (constants.ts exports no numbers) could not see them.
 *
 * Every value below is arbitrary. Each test proves the answer comes from the world
 * by giving two worlds different answers; none of them states a published number.
 */
let restore: () => void = () => undefined;
afterEach(() => restore());

function world(overrides: Partial<typeof SCENARIO_RULES>): void {
  restore();
  restore = withRules({ ...SCENARIO_RULES, ...overrides });
}

describe("ship design points come from the world", () => {
  it("exports no points table", () => {
    expect((design as Record<string, unknown>).SYSTEM_POINTS).toBeUndefined();
  });

  it("prices each system from the profile", () => {
    world({ pointsPdaf: 101 });
    const a = design.designPoints({ mass: 0, shipClass: "cruiser", thrust: 0, pdaf: 1 });
    world({ pointsPdaf: 202 });
    const b = design.designPoints({ mass: 0, shipClass: "cruiser", thrust: 0, pdaf: 1 });
    expect(b - a).toBe(101);
  });

  it("prices hull and drives from the profile", () => {
    world({ hullCostPerMass: 7 });
    expect(design.hullCost(10)).toBe(70);
    world({ driveCostDivisorEscort: 5 });
    expect(design.mainDriveCost("escort", 10, 10)).toBe(20);
    world({ freeFcsCapital: 9 });
    expect(design.freeFcs("capital")).toBe(9);
    world({ systemsMassDivisor: 5 });
    expect(design.systemsMassBudget(10)).toBe(2);
  });

  it("a world that left a divisor empty gets zero, not Infinity", () => {
    world({ driveCostDivisorEscort: 0, systemsMassDivisor: 0 });
    expect(design.mainDriveCost("escort", 10, 10)).toBe(0);
    expect(design.systemsMassBudget(10)).toBe(0);
  });
});

describe("hull tables come from the world", () => {
  it("classes a ship by the profile's mass cut-offs", () => {
    world({ shipClassEscortMaxMass: 5, shipClassCruiserMaxMass: 9 });
    expect([shipClass(5), shipClass(6), shipClass(9), shipClass(10)]).toEqual([
      "escort",
      "cruiser",
      "cruiser",
      "capital",
    ]);
  });

  it("reads threshold rows and damage points from the profile", () => {
    world({ thresholdRowsCruiser: 8, warshipDamageMassDivisor: 4 });
    expect(thresholdRows("cruiser")).toBe(8);
    expect(warshipDamagePoints(9)).toBe(3);
  });
});

describe("the remaining literals come from the world", () => {
  it("damage control repairs on the profile's face", () => {
    world({ damageControlRepairOn: 3 });
    expect(damageControlRepairs([3, 2, 1])).toBe(1);
  });

  it("an empty repair face repairs nothing rather than everything", () => {
    world({ damageControlRepairOn: 0 });
    expect(damageControlRepairs([3, 2, 1])).toBe(0);
  });

  it("damage control parties by class come from the profile", () => {
    world({ damageControlPartiesEscort: 8 });
    expect(standardDamageControlParties("escort")).toBe(8);
  });

  it("fighter endurance comes from the profile", () => {
    world({ fighterEndurance: 11, fighterEnduranceLongRange: 13 });
    expect(enduranceForType("standard")).toBe(11);
    expect(enduranceForType("long-range")).toBe(13);
  });

  it("the threshold floor comes from the profile", () => {
    world({ thresholdKillOn: [9], thresholdMinKillOn: 7 });
    expect(thresholdKillOn(1, 5)).toBe(7);
  });

  it("the targeting preview states the world's die, not a printed one", () => {
    world({ dieSize: 8, needleMaxRangeMu: 100, needleKillOn: 8 });
    const [row] = previewTargeting({
      weapons: [{ kind: "needle", arcs: ["F"] }] as never,
      distanceMu: 1,
      bearing: 0,
    });
    expect(row.effect).toContain("8");
    expect(row.effect).not.toContain("6");
  });
});

describe("a world with no profile refuses instead of answering", () => {
  it("throws rather than classing a ship", () => {
    restore();
    restore = withNoRules();
    expect(() => shipClass(5)).toThrow(RulesProfileNotSetError);
    expect(() => enduranceForType()).toThrow(RulesProfileNotSetError);
  });
});

describe("source guard", () => {
  it("the fighter schema does not seed a literal endurance", () => {
    const src = readFileSync(resolve(__dirname, "../src/data/fighter-group.ts"), "utf8");
    expect(src).not.toMatch(/schema\.endurance = .*initial: \d/);
  });

  it("the settings hint does not print a damage value", () => {
    const src = readFileSync(resolve(__dirname, "../src/main.ts"), "utf8");
    expect(src).not.toMatch(/hint: .*\d = \d/);
  });
});
