import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeDicePoolSize,
  countFaces,
  determineInitiative,
  type RolledDie,
} from "../src/round/dice-pool";
import { actionForFace, requiresClashTest } from "../src/round/actions";
import { DIE_FACES } from "../src/constants";
import { RulesProfileNotSetError } from "../src/rules-profile";
import { TEST_PROFILE, withBlankProfile, withProfile } from "./helpers/world";

// This module ships no rules numbers. A test that needs them installs a world
// carrying an invented profile, the way a user fills one in.
let restoreWorld: () => void;
beforeEach(() => {
  restoreWorld = withProfile();
});
afterEach(() => {
  restoreWorld();
});

function dice(faces: number[]): RolledDie[] {
  return faces.map((face) => ({ face }));
}

describe("computeDicePoolSize", () => {
  const bonus = TEST_PROFILE.dicePoolPerKnightBonus;
  const floor = TEST_PROFILE.minDicePoolFloor;

  it("is knights plus the profile's per-knight bonus, floor disabled", () => {
    expect(computeDicePoolSize(1, false)).toBe(1 + bonus);
    expect(computeDicePoolSize(5, false)).toBe(5 + bonus);
  });

  it("applies the profile's floor when the setting is enabled and the pool is smaller", () => {
    // 0 knights + bonus is below the floor, so the floor wins.
    expect(computeDicePoolSize(0, true)).toBe(floor);
  });

  it("does not reduce a pool that is already above the floor", () => {
    expect(computeDicePoolSize(5, true)).toBe(5 + bonus);
  });

  it("ignores the floor entirely when the setting is off", () => {
    expect(computeDicePoolSize(0, false)).toBe(bonus);
  });

  /**
   * The guard on the strip. A fallback anywhere on this path would mean the
   * published pool numbers still shipped, one indirection further away.
   */
  it("refuses to size a pool in a world that has entered no profile", () => {
    restoreWorld();
    restoreWorld = withBlankProfile();
    expect(() => computeDicePoolSize(3, false)).toThrow(RulesProfileNotSetError);
  });
});

describe("countFaces", () => {
  it("tallies rolled dice by face", () => {
    const counts = countFaces(dice([6, 6, 5, 4, 4, 4, 1]));
    expect(counts[6]).toBe(2);
    expect(counts[5]).toBe(1);
    expect(counts[4]).toBe(3);
    expect(counts[1]).toBe(1);
    expect(counts[2]).toBe(0);
  });
});

describe("die face to action mapping", () => {
  /**
   * These used to assert GREATHELM's own table -- "maps every face to its QSR
   * action" -- which meant the suite published the table whatever
   * `constants.ts` did. They now assert that the mapping is *the world's*, by
   * running against a profile whose mapping is deliberately not the rulebook's.
   */
  it("reads each face's action from the world's profile", () => {
    for (const face of DIE_FACES) {
      expect(actionForFace(face)).toBe(TEST_PROFILE.faceToAction[face]);
    }
  });

  it("reports no action for a face the profile leaves unmapped", () => {
    restoreWorld();
    restoreWorld = withProfile({
      ...TEST_PROFILE,
      faceToAction: { 1: "sprint" }
    });

    expect(actionForFace(1)).toBe("sprint");
    expect(actionForFace(4)).toBeUndefined();
  });

  it("requires a clash test for exactly the actions the profile names", () => {
    for (const action of TEST_PROFILE.clashTestActions) {
      expect(requiresClashTest(action)).toBe(true);
    }
    expect(requiresClashTest("sprint")).toBe(false);
    expect(requiresClashTest("shift")).toBe(false);
  });

  it("treats an unmapped face as needing no clash test rather than throwing", () => {
    expect(requiresClashTest(undefined)).toBe(false);
  });
});
