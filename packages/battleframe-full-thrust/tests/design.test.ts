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


describe("hull / drive costs (the scenario world's invented prices)", () => {
  it("hull cost is the world's per-MASS price", () => {
    expect(hullCost(36)).toBe(108);
  });
  it("systems mass budget is the world's share of the mass", () => {
    expect(systemsMassBudget(36)).toBe(12);
  });
  it("main drive cost scales by the world's per-class divisor", () => {
    expect(mainDriveCost("cruiser", 36, 4)).toBe(48);
    expect(mainDriveCost("escort", 15, 4)).toBe(12);
    expect(mainDriveCost("capital", 40, 2)).toBe(40);
  });
  it("FTL drive costs its mass in points", () => {
    expect(ftlDriveCost(36)).toBe(36);
  });
  it("free FCS comes from the world's per-class allowance", () => {
    expect(freeFcs("escort")).toBe(2);
    expect(freeFcs("cruiser")).toBe(3);
    expect(freeFcs("capital")).toBe(4);
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

describe("designPoints", () => {
  // hull 108 + drive 48 + ftl 36 + screen 29 + pdaf 21 + batteries 53, in the
  // scenario world's invented prices. Not a published worked example.
  it("totals a design from every fitted system", () => {
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
    expect(total).toBe(295);
  });
});

describe("shipPointsFromSystem (points from a ship's live systems)", () => {
  it("reaches the same total from an in-play ship system", () => {
    const points = shipPointsFromSystem({
      mass: 36,
      thrust: 4,
      ftl: true,
      screens: 1,
      pds: 3,
      fcs: 3, // the cruiser's free allowance -> no extra FCS cost
      weapons: [
        { kind: "beam", weaponClass: 3, arcs: ["F", "FS", "FP"] },
        { kind: "beam", weaponClass: 3, arcs: ["F", "AS", "AP"] },
        { kind: "beam", weaponClass: 2, arcs: ["F", "FS", "FP"] },
        { kind: "beam", weaponClass: 2, arcs: ["F", "AS", "AP"] },
        { kind: "beam", weaponClass: 2, arcs: ["A", "AS", "AP"] }
      ]
    });
    expect(points).toBe(295);
  });

  it("charges extra FCS beyond the free allowance and non-beam weapons", () => {
    const points = shipPointsFromSystem({
      mass: 10,
      thrust: 4,
      ftl: false,
      screens: 0,
      pds: 0,
      fcs: 3, // one beyond the escort's free allowance
      weapons: [
        { kind: "torpedo", arcs: ["F"] },
        { kind: "submunition", arcs: ["F"] },
        { kind: "needle", arcs: ["F"] }
      ]
    });
    // hull 30 + drive 8 + extra FCS 23 + torpedo 17 + submunition 19 + needle 13
    expect(points).toBe(110);
  });
});
