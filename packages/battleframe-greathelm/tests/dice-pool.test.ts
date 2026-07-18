import { describe, expect, it } from "vitest";
import {
  computeDicePoolSize,
  countFaces,
  determineInitiative,
  type RolledDie,
} from "../src/round/dice-pool";
import { actionForFace, requiresClashTest } from "../src/round/actions";
import { DIE_FACE_TO_ACTION, MIN_DICE_POOL_FLOOR } from "../src/constants";

function dice(faces: number[]): RolledDie[] {
  return faces.map((face) => ({ face }));
}

describe("computeDicePoolSize", () => {
  it("is models + 1 with the floor disabled, at 1 model", () => {
    expect(computeDicePoolSize(1, false)).toBe(2);
  });

  it("is models + 1 with the floor disabled, at 5 models", () => {
    expect(computeDicePoolSize(5, false)).toBe(6);
  });

  it("is models + 1 with the floor disabled, at 6 models (opening pool of 7)", () => {
    expect(computeDicePoolSize(6, false)).toBe(7);
  });

  it("floors at 3 when the setting is enabled and the natural pool is smaller", () => {
    expect(computeDicePoolSize(1, true)).toBe(MIN_DICE_POOL_FLOOR);
  });

  it("does not reduce the pool below its natural size when the floor is enabled but unnecessary", () => {
    expect(computeDicePoolSize(5, true)).toBe(6);
  });

  it("floor does not apply when disabled, even at 0 knights", () => {
    expect(computeDicePoolSize(0, false)).toBe(1);
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
  it("maps every face to its QSR action, via the single exported constant", () => {
    expect(DIE_FACE_TO_ACTION[6]).toBe("sprint");
    expect(DIE_FACE_TO_ACTION[5]).toBe("encircle");
    expect(DIE_FACE_TO_ACTION[4]).toBe("bash");
    expect(DIE_FACE_TO_ACTION[3]).toBe("shift");
    expect(DIE_FACE_TO_ACTION[2]).toBe("light");
    expect(DIE_FACE_TO_ACTION[1]).toBe("heavy");
  });

  it("actionForFace agrees with the constant for all six faces", () => {
    for (let face = 1; face <= 6; face += 1) {
      expect(actionForFace(face as 1 | 2 | 3 | 4 | 5 | 6)).toBe(
        DIE_FACE_TO_ACTION[face as 1 | 2 | 3 | 4 | 5 | 6]
      );
    }
  });

  it("only bash, light, and heavy require a clash test", () => {
    expect(requiresClashTest("sprint")).toBe(false);
    expect(requiresClashTest("encircle")).toBe(false);
    expect(requiresClashTest("shift")).toBe(false);
    expect(requiresClashTest("bash")).toBe(true);
    expect(requiresClashTest("light")).toBe(true);
    expect(requiresClashTest("heavy")).toBe(true);
  });
});

describe("determineInitiative", () => {
  it("gives choice to the player with more 6s (both have some)", () => {
    const outcome = determineInitiative(
      "a",
      dice([6, 6, 5, 4]),
      "b",
      dice([6, 5, 5, 4])
    );
    expect(outcome).toEqual({ result: "choose", playerId: "a" });
  });

  it("forces first when only one player has any 6s", () => {
    const outcome = determineInitiative(
      "a",
      dice([6, 5, 4]),
      "b",
      dice([5, 5, 4])
    );
    expect(outcome).toEqual({ result: "forced-first", playerId: "a" });
  });

  it("falls through to 5s when neither player has 6s", () => {
    const outcome = determineInitiative(
      "a",
      dice([5, 5, 3]),
      "b",
      dice([5, 4, 4])
    );
    expect(outcome).toEqual({ result: "choose", playerId: "a" });
  });

  it("descends past equal nonzero 6s and decides on the next differing face", () => {
    // Both hold two 6s -- equal at the top face, so it settles nothing and the
    // choice falls to the 5s, where a leads. Both holding 6s also makes this a
    // choice, never a forced-first: that needs the loser to have zero 6s.
    const outcome = determineInitiative(
      "a",
      dice([6, 6, 5]),
      "b",
      dice([6, 6, 4])
    );
    expect(outcome).toEqual({ result: "choose", playerId: "a" });
  });

  it("reports a tie when both pools match at every face", () => {
    const outcome = determineInitiative(
      "a",
      dice([6, 5, 4, 3]),
      "b",
      dice([6, 5, 4, 3])
    );
    expect(outcome).toEqual({ result: "tie" });
  });

  it("reports a tie when both players hold zero dice at every face", () => {
    const outcome = determineInitiative("a", dice([]), "b", dice([]));
    expect(outcome).toEqual({ result: "tie" });
  });
});
