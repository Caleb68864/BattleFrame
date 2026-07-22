import { describe, expect, it } from "vitest";
import {
  enumerateSurvivingSystems,
  applySystemKnockouts,
  type SystemRef
} from "../src/ship/systems";

describe("enumerateSurvivingSystems (one entry per surviving system icon)", () => {
  it("lists each live weapon, each FCS, each PDS, each screen level, and drives", () => {
    const system = {
      thrust: 4,
      fcs: 2,
      pds: 1,
      screens: 2,
      weapons: [
        { kind: "beam", destroyed: false },
        { kind: "beam", destroyed: true }, // dead -- excluded
        { kind: "torpedo", spent: false }
      ]
    };

    const refs = enumerateSurvivingSystems(system);
    const types = refs.map((r) => r.type);

    // 2 live weapons + 2 fcs + 1 pds + 2 screen + 1 drive = 8
    expect(refs).toHaveLength(8);
    expect(types.filter((t) => t === "weapon")).toHaveLength(2);
    expect(types.filter((t) => t === "fcs")).toHaveLength(2);
    expect(types.filter((t) => t === "pds")).toHaveLength(1);
    expect(types.filter((t) => t === "screen")).toHaveLength(2);
    expect(types.filter((t) => t === "drive")).toHaveLength(1);
  });

  it("lists no drive entry when the ship has no thrust left", () => {
    const refs = enumerateSurvivingSystems({ thrust: 0, fcs: 1, pds: 0, screens: 0, weapons: [] });
    expect(refs.some((r) => r.type === "drive")).toBe(false);
  });

  it("references live weapons by their index in the weapons array", () => {
    const refs = enumerateSurvivingSystems({
      thrust: 0,
      fcs: 0,
      pds: 0,
      screens: 0,
      weapons: [{ destroyed: true }, { destroyed: false }]
    });
    const weaponRefs = refs.filter((r) => r.type === "weapon");
    expect(weaponRefs).toHaveLength(1);
    expect(weaponRefs[0].index).toBe(1);
  });
});

describe("applySystemKnockouts (produces the actor update for lost systems)", () => {
  const system = {
    thrust: 4,
    fcs: 2,
    pds: 1,
    screens: 2,
    weapons: [{ kind: "beam", destroyed: false }, { kind: "beam", destroyed: false }]
  };

  it("marks a knocked-out weapon destroyed by index", () => {
    const knocked: SystemRef[] = [{ type: "weapon", index: 1 }];
    const update = applySystemKnockouts(system, knocked);
    expect(update["system.weapons"][1].destroyed).toBe(true);
    expect(update["system.weapons"][0].destroyed).toBe(false);
  });

  it("decrements fcs, pds and screens per knockout", () => {
    const knocked: SystemRef[] = [
      { type: "fcs" },
      { type: "pds" },
      { type: "screen" }
    ];
    const update = applySystemKnockouts(system, knocked);
    expect(update["system.fcs"]).toBe(1);
    expect(update["system.pds"]).toBe(0);
    expect(update["system.screens"]).toBe(1);
  });

  it("halves thrust and flags the drive crippled on the first knockout (FT2)", () => {
    const update = applySystemKnockouts(system, [{ type: "drive" }]);
    expect(update["system.thrust"]).toBe(2);
    expect(update["system.driveCrippled"]).toBe(true);
  });

  it("kills the drive outright on the second knockout (already crippled)", () => {
    const crippled = { ...system, thrust: 2, driveCrippled: true };
    const update = applySystemKnockouts(crippled, [{ type: "drive" }]);
    expect(update["system.thrust"]).toBe(0);
    expect(update["system.driveCrippled"]).toBe(true);
  });

  it("never drops a count below zero", () => {
    const bare = { thrust: 1, fcs: 0, pds: 0, screens: 0, weapons: [] };
    const update = applySystemKnockouts(bare, [{ type: "fcs" }, { type: "drive" }]);
    expect(update["system.fcs"]).toBe(0);
    expect(update["system.thrust"]).toBe(0);
  });
});
