import { describe, expect, it } from "vitest";
import {
  hullCost,
  systemsMassBudget,
  mainDriveCost,
  ftlDriveCost,
  freeFcs,
  beamBatteryCost,
  beamBatteryMass,
  designPoints
} from "../src/ship/design";

describe("FT2 hull / drive costs", () => {
  it("hull cost is 2 x mass (warship)", () => {
    expect(hullCost(36)).toBe(72);
  });
  it("systems mass budget is half the mass", () => {
    expect(systemsMassBudget(36)).toBe(18);
  });
  it("main drive cost scales by class: cruiser mass 36 thrust 4 = 72", () => {
    expect(mainDriveCost("cruiser", 36, 4)).toBe(72);
    expect(mainDriveCost("escort", 16, 4)).toBe(16); // 16*4/4
    expect(mainDriveCost("capital", 40, 2)).toBe(80); // 40*2/1
  });
  it("FTL drive costs its mass in points", () => {
    expect(ftlDriveCost(36)).toBe(36);
  });
  it("free FCS by class: escort 1, cruiser 2, capital 3", () => {
    expect(freeFcs("escort")).toBe(1);
    expect(freeFcs("cruiser")).toBe(2);
    expect(freeFcs("capital")).toBe(3);
  });
});

describe("beam battery costs (FT2 A/B/C = class 3/2/1)", () => {
  it("costs base + per-arc x arcs", () => {
    expect(beamBatteryCost(3, 3)).toBe(13); // A, 3 arcs
    expect(beamBatteryCost(2, 3)).toBe(9); // B, 3 arcs
    expect(beamBatteryCost(1, 3)).toBe(5); // C, 3 arcs
    expect(beamBatteryCost(3, 1)).toBe(7); // A, 1 arc
  });
  it("battery mass equals the class number (FT2 range)", () => {
    expect(beamBatteryMass(3)).toBe(3);
    expect(beamBatteryMass(1)).toBe(1);
  });
});

describe("designPoints (worked FT2 example -> 267)", () => {
  it("totals the MASS 36 superheavy cruiser at 267 points", () => {
    const total = designPoints({
      mass: 36,
      shipClass: "cruiser",
      thrust: 4,
      ftl: true,
      screens: 1,
      pdaf: 3,
      batteries: [
        { cls: 3, arcs: 3, count: 2 },
        { cls: 2, arcs: 3, count: 3 }
      ]
    });
    expect(total).toBe(267);
  });
});
