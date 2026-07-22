import { describe, expect, it } from "vitest";
import { armourByFace, type ArmourValue } from "../src/combat/armour";

/**
 * A7 — armour of the struck face. Front uses the stored front value; every other
 * face is one less (min 0). An open-topped vehicle has 0 armour against
 * artillery and SLAM regardless of face.
 */
const armour = (front: number, openTop = false): ArmourValue => ({ front, openTop });

describe("armourByFace", () => {
  it("uses the front value for a front hit", () => {
    expect(armourByFace(armour(4), "front", false)).toBe(4);
  });

  it("uses front-1 (min 0) for side, top and rear hits", () => {
    expect(armourByFace(armour(4), "side", false)).toBe(3);
    expect(armourByFace(armour(4), "top", false)).toBe(3);
    expect(armourByFace(armour(4), "rear", false)).toBe(3);
  });

  it("never drops below zero for a zero-front vehicle", () => {
    expect(armourByFace(armour(0), "rear", false)).toBe(0);
  });

  it("open-top vs artillery or SLAM is 0 on any face", () => {
    expect(armourByFace(armour(4, true), "front", true)).toBe(0);
    expect(armourByFace(armour(4, true), "side", true)).toBe(0);
  });

  it("open-top still armours normally against non-arty/SLAM weapons", () => {
    expect(armourByFace(armour(4, true), "front", false)).toBe(4);
  });
});
