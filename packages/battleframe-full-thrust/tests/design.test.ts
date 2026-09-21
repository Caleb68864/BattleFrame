import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hullCost,
  systemsMassBudget,
  mainDriveCost,
  ftlDriveCost,
  freeFcs,
  beamBatteryCost,
  beamBatteryMass,
  designPoints,
  shipPointsFromSystem
} from "../src/ship/design";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


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

describe("shipPointsFromSystem (points from a ship's live systems)", () => {
  it("reproduces the worked example from an in-play ship system", () => {
    const points = shipPointsFromSystem({
      mass: 36,
      thrust: 4,
      ftl: true,
      screens: 1,
      pds: 3,
      fcs: 2, // cruiser free allowance -> no extra FCS cost
      weapons: [
        { kind: "beam", weaponClass: 3, arcs: ["F", "FS", "FP"] },
        { kind: "beam", weaponClass: 3, arcs: ["F", "AS", "AP"] },
        { kind: "beam", weaponClass: 2, arcs: ["F", "FS", "FP"] },
        { kind: "beam", weaponClass: 2, arcs: ["F", "AS", "AP"] },
        { kind: "beam", weaponClass: 2, arcs: ["A", "AS", "AP"] }
      ]
    });
    expect(points).toBe(267);
  });

  it("charges extra FCS beyond the free allowance and non-beam weapons", () => {
    const points = shipPointsFromSystem({
      mass: 10,
      thrust: 4,
      ftl: false,
      screens: 0,
      pds: 0,
      fcs: 2, // escort free 1 -> 1 extra FCS at 10
      weapons: [
        { kind: "torpedo", arcs: ["F"] },
        { kind: "submunition", arcs: ["F"] },
        { kind: "needle", arcs: ["F"] }
      ]
    });
    // hull 20 + drive (10*4/4=10) + extraFcs 10 + torpedo 15 + submunition 3 + needle 6 = 64
    expect(points).toBe(64);
  });
});
