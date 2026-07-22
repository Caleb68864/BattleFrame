import { describe, expect, it } from "vitest";
import {
  damageControlRepairs,
  standardDamageControlParties,
  resolveDamageControl
} from "../src/combat/damage-control";

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

describe("resolveDamageControl (restore knocked-out systems in priority order)", () => {
  const damaged = {
    fcs: 2, fcsLost: 1,
    pds: 1, pdsLost: 1,
    screens: 2, screensLost: 1,
    thrust: 4, driveHits: 1,
    weapons: [{ kind: "beam", destroyed: true }, { kind: "beam", destroyed: false }]
  };

  it("repairs fire control first", () => {
    const update = resolveDamageControl(damaged, 1);
    expect(update["system.fcsLost"]).toBe(0);
    // nothing else repaired this round
    expect(update["system.driveHits"]).toBe(1);
  });

  it("repairs fcs then drives with two successes", () => {
    const update = resolveDamageControl(damaged, 2);
    expect(update["system.fcsLost"]).toBe(0);
    expect(update["system.driveHits"]).toBe(0);
  });

  it("un-destroys a weapon when repairs reach it (after fcs + drive)", () => {
    const update = resolveDamageControl(damaged, 3);
    expect(update["system.weapons"][0].destroyed).toBe(false);
  });

  it("repairs nothing on zero successes", () => {
    const update = resolveDamageControl(damaged, 0);
    expect(update["system.fcsLost"]).toBe(1);
    expect(update["system.driveHits"]).toBe(1);
  });

  it("stops when there is nothing left to repair", () => {
    const healthy = { fcs: 2, fcsLost: 0, pds: 0, pdsLost: 0, screens: 0, screensLost: 0, thrust: 4, driveHits: 0, weapons: [] };
    const update = resolveDamageControl(healthy, 5);
    expect(update["system.fcsLost"]).toBe(0);
  });
});
