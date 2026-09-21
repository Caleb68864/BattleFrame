import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  enumerateSurvivingSystems,
  applySystemKnockouts,
  applySystemRepairs,
  usableThrust,
  remainingFcs,
  remainingPds,
  remainingScreens,
  type SystemRef
} from "../src/ship/systems";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


describe("remaining-system helpers (design minus damage)", () => {
  it("computes usable thrust from driveHits (0 = full, 1 = half, 2 = dead)", () => {
    expect(usableThrust({ thrust: 6, driveHits: 0 })).toBe(6);
    expect(usableThrust({ thrust: 6, driveHits: 1 })).toBe(3);
    expect(usableThrust({ thrust: 6, driveHits: 2 })).toBe(0);
    expect(usableThrust({ thrust: 5, driveHits: 1 })).toBe(2); // floor
  });
  it("computes remaining FCS/PDS/screens as design minus lost", () => {
    expect(remainingFcs({ fcs: 2, fcsLost: 1 })).toBe(1);
    expect(remainingPds({ pds: 3, pdsLost: 3 })).toBe(0);
    expect(remainingScreens({ screens: 2, screensLost: 3 })).toBe(0); // never negative
  });
});

describe("enumerateSurvivingSystems (one entry per surviving system icon)", () => {
  it("counts remaining (design minus lost) FCS/PDS/screens, live weapons, and live drives", () => {
    const system = {
      thrust: 4, driveHits: 0,
      fcs: 2, fcsLost: 1, // 1 remaining
      pds: 1, pdsLost: 0,
      screens: 2, screensLost: 0,
      weapons: [{ kind: "beam", destroyed: false }, { kind: "beam", destroyed: true }, { kind: "torpedo" }]
    };
    const refs = enumerateSurvivingSystems(system);
    const types = refs.map((r) => r.type);
    // 2 live weapons + 1 fcs + 1 pds + 2 screen + 1 drive = 7
    expect(refs).toHaveLength(7);
    expect(types.filter((t) => t === "fcs")).toHaveLength(1);
    expect(types.filter((t) => t === "drive")).toHaveLength(1);
  });

  it("lists no drive entry when the drives are dead (driveHits 2)", () => {
    const refs = enumerateSurvivingSystems({ thrust: 4, driveHits: 2, fcs: 1, weapons: [] });
    expect(refs.some((r) => r.type === "drive")).toBe(false);
  });
});

describe("applySystemKnockouts (increments damage counters, never the design)", () => {
  const system = {
    thrust: 4, driveHits: 0,
    fcs: 2, fcsLost: 0,
    pds: 1, pdsLost: 0,
    screens: 2, screensLost: 0,
    weapons: [{ kind: "beam", destroyed: false }, { kind: "beam", destroyed: false }]
  };

  it("marks a knocked-out weapon destroyed by index", () => {
    const update = applySystemKnockouts(system, [{ type: "weapon", index: 1 }]);
    expect(update["system.weapons"][1].destroyed).toBe(true);
    expect(update["system.weapons"][0].destroyed).toBe(false);
  });

  it("increments the lost counters, leaving the design counts intact", () => {
    const update = applySystemKnockouts(system, [{ type: "fcs" }, { type: "pds" }, { type: "screen" }]);
    expect(update["system.fcsLost"]).toBe(1);
    expect(update["system.pdsLost"]).toBe(1);
    expect(update["system.screensLost"]).toBe(1);
  });

  it("advances driveHits (half then dead), capped at 2", () => {
    expect(applySystemKnockouts(system, [{ type: "drive" }])["system.driveHits"]).toBe(1);
    const crippled = { ...system, driveHits: 1 };
    expect(applySystemKnockouts(crippled, [{ type: "drive" }])["system.driveHits"]).toBe(2);
    const dead = { ...system, driveHits: 2 };
    expect(applySystemKnockouts(dead, [{ type: "drive" }])["system.driveHits"]).toBe(2);
  });
});

describe("applySystemRepairs (damage control brings systems back)", () => {
  it("reduces a lost counter, never below zero", () => {
    const system = { fcs: 2, fcsLost: 2, pds: 1, pdsLost: 0, screens: 0, screensLost: 0, driveHits: 0 };
    const update = applySystemRepairs(system, [{ type: "fcs" }]);
    expect(update["system.fcsLost"]).toBe(1);
  });

  it("steps driveHits back toward full", () => {
    const system = { fcs: 0, fcsLost: 0, pds: 0, pdsLost: 0, screens: 0, screensLost: 0, driveHits: 2 };
    const update = applySystemRepairs(system, [{ type: "drive" }]);
    expect(update["system.driveHits"]).toBe(1);
  });

  it("does not over-repair beyond the design", () => {
    const system = { fcs: 2, fcsLost: 0, pds: 0, pdsLost: 0, screens: 0, screensLost: 0, driveHits: 0 };
    const update = applySystemRepairs(system, [{ type: "fcs" }]);
    expect(update["system.fcsLost"]).toBe(0);
  });
});
