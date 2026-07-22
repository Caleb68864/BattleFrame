import { describe, expect, it } from "vitest";
import { effectiveSignature, armourFace } from "../src/data/vehicle-state";
import { elementsOf, type ElementActorLike } from "../src/data/unit-state";
import { MODULE_ID, UNIT_ID_FLAG } from "../src/constants";

/**
 * Pure readers over the data models (G1). The schemas store raw stats; these
 * interpret them and are testable without any Foundry globals.
 */

describe("effectiveSignature — basic signature minus stealth, floored at 0", () => {
  it("subtracts stealth levels", () => {
    expect(effectiveSignature({ signatureBasic: 4, stealthLevels: 1 })).toBe(3);
  });
  it("never goes below zero", () => {
    expect(effectiveSignature({ signatureBasic: 2, stealthLevels: 5 })).toBe(0);
  });
});

describe("armourFace — struck-face armour off the vehicle's armour block", () => {
  const armour = { front: 4, openTop: false };
  it("returns the front value for a front hit", () => {
    expect(armourFace(armour, "front", false)).toBe(4);
  });
  it("returns front-1 for a side/top/rear hit", () => {
    expect(armourFace(armour, "rear", false)).toBe(3);
  });
  it("is 0 for an open-top vehicle vs artillery/SLAM", () => {
    expect(armourFace({ front: 4, openTop: true }, "top", true)).toBe(0);
  });
});

describe("elementsOf — the unitId flag is the single join", () => {
  const el = (id: string, unitId?: string): ElementActorLike => ({
    id,
    flags: unitId ? { [MODULE_ID]: { [UNIT_ID_FLAG]: unitId } } : {},
  });

  it("collects the elements whose flag points at the unit", () => {
    const actors = [el("v1", "U"), el("v2", "U"), el("v3", "OTHER"), el("v4")];
    expect(elementsOf("U", actors).map((a) => a.id)).toEqual(["v1", "v2"]);
  });

  it("reads the flag via getFlag when the actor exposes it", () => {
    const actors: ElementActorLike[] = [
      { id: "x", getFlag: (scope, key) => (scope === MODULE_ID && key === UNIT_ID_FLAG ? "U" : undefined) },
      { id: "y", getFlag: () => "OTHER" },
    ];
    expect(elementsOf("U", actors).map((a) => a.id)).toEqual(["x"]);
  });

  it("returns nothing for a unit with no elements", () => {
    expect(elementsOf("EMPTY", [el("v1", "U")])).toEqual([]);
  });
});
