import { describe, expect, it, vi } from "vitest";
import {
  countHits,
  countUnsaved,
  resolveAttack,
  type DiceApiLike
} from "../src/combat/resolve";

/** A dice API that returns the scripted d6 faces in order, one per roll call. */
function scriptedDice(faces: readonly number[]): DiceApiLike & { rolls: number } {
  let index = 0;
  return {
    rolls: 0,
    async roll() {
      const total = faces[index++] ?? 1;
      return { total };
    }
  };
}

describe("countHits -- a d6 roll >= Attack is a hit", () => {
  it("counts rolls at or above the Attack target", () => {
    expect(countHits([1, 3, 4, 5, 6], 4)).toBe(3); // 4,5,6
  });

  it("is zero when nothing meets the target", () => {
    expect(countHits([1, 2, 3], 4)).toBe(0);
  });

  it("counts every die on a target of 1", () => {
    expect(countHits([1, 1, 6], 1)).toBe(3);
  });
});

describe("countUnsaved -- a d6 save roll < Save is a casualty (lower Save is better)", () => {
  it("counts rolls below the Save target", () => {
    expect(countUnsaved([1, 2, 4, 6], 4)).toBe(2); // 1,2 are below 4
  });

  it("saves everything when every roll meets the target", () => {
    expect(countUnsaved([4, 5, 6], 4)).toBe(0);
  });
});

describe("resolveAttack", () => {
  it("rolls one die per model, then one save per hit, and counts casualties", async () => {
    // 3 models attack on 4+, defender saves on 5. Attacker rolls [4,4,2] -> 2
    // hits. Defender rolls [6,3] -> 3 is below 5 (casualty), 6 is not -> 1 casualty.
    const dice = scriptedDice([4, 4, 2, 6, 3]);

    const result = await resolveAttack({
      dice,
      models: 3,
      attackTarget: 4,
      saveTarget: 5,
      type: "melee"
    });

    expect(result.attackerRolls).toEqual([4, 4, 2]);
    expect(result.hits).toBe(2);
    expect(result.defenderRolls).toEqual([6, 3]);
    expect(result.casualties).toBe(1);
  });

  it("makes every hit a casualty when the defender has no save, rolling no save dice", async () => {
    const dice = scriptedDice([6, 6, 1]); // 2 hits on 4+, third misses
    const result = await resolveAttack({
      dice,
      models: 3,
      attackTarget: 4,
      saveTarget: null,
      type: "ranged"
    });

    expect(result.hits).toBe(2);
    expect(result.defenderRolls).toEqual([]); // no save rolled
    expect(result.casualties).toBe(2);
  });

  it("rolls no save dice when there were no hits", async () => {
    const roll = vi.fn(async () => ({ total: 1 })); // all misses on 4+
    const dice: DiceApiLike = { roll };

    const result = await resolveAttack({
      dice,
      models: 2,
      attackTarget: 4,
      saveTarget: 4,
      type: "melee"
    });

    expect(result.hits).toBe(0);
    expect(result.casualties).toBe(0);
    expect(roll).toHaveBeenCalledTimes(2); // 2 attack dice, 0 save dice
  });
});
