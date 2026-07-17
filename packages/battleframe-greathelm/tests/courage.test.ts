import { describe, expect, it } from "vitest";
import {
  courageDifficulty,
  determineCourageTestOrder,
  evaluateCourageRoll,
  knightsRequiringCourageTest,
  runCouragePhase,
  summarizeWarbandDamage,
  type CourageKnight,
  type DiceApiLike,
} from "../src/round/courage";

function fixedDice(rolls: number[]): DiceApiLike {
  let index = 0;
  return {
    async roll() {
      const total = rolls[Math.min(index, rolls.length - 1)];
      index += 1;
      return { total };
    },
  };
}

describe("knightsRequiringCourageTest", () => {
  it("tests a damaged knight in base contact with an enemy", () => {
    const knight: CourageKnight = {
      id: "k1",
      ownerId: "a",
      damage: 1,
      inBaseContactWithEnemy: true,
    };

    expect(knightsRequiringCourageTest([knight])).toEqual([knight]);
  });

  it("does not test a damaged knight standing alone", () => {
    const knight: CourageKnight = {
      id: "k1",
      ownerId: "a",
      damage: 2,
      inBaseContactWithEnemy: false,
    };

    expect(knightsRequiringCourageTest([knight])).toEqual([]);
  });

  it("does not test an undamaged knight in base contact", () => {
    const knight: CourageKnight = {
      id: "k1",
      ownerId: "a",
      damage: 0,
      inBaseContactWithEnemy: true,
    };

    expect(knightsRequiringCourageTest([knight])).toEqual([]);
  });

  it("never tests an undamaged knight standing alone", () => {
    const knight: CourageKnight = {
      id: "k1",
      ownerId: "a",
      damage: 0,
      inBaseContactWithEnemy: false,
    };

    expect(knightsRequiringCourageTest([knight])).toEqual([]);
  });
});

describe("determineCourageTestOrder", () => {
  it("orders by most total damage first", () => {
    const order = determineCourageTestOrder([
      { playerId: "a", totalDamage: 2, knightsRemaining: 3 },
      { playerId: "b", totalDamage: 5, knightsRemaining: 3 },
    ]);

    expect(order).toEqual(["b", "a"]);
  });

  it("tiebreaks equal total damage by fewest remaining knights first", () => {
    const order = determineCourageTestOrder([
      { playerId: "a", totalDamage: 4, knightsRemaining: 3 },
      { playerId: "b", totalDamage: 4, knightsRemaining: 1 },
    ]);

    expect(order).toEqual(["b", "a"]);
  });

  it("keeps a stable order when both damage and remaining knights tie", () => {
    const order = determineCourageTestOrder([
      { playerId: "a", totalDamage: 3, knightsRemaining: 2 },
      { playerId: "b", totalDamage: 3, knightsRemaining: 2 },
    ]);

    expect(order).toEqual(["a", "b"]);
  });
});

describe("summarizeWarbandDamage", () => {
  it("sums total damage across the whole warband, not just testing knights", () => {
    const knights: CourageKnight[] = [
      { id: "k1", ownerId: "a", damage: 1, inBaseContactWithEnemy: true },
      { id: "k2", ownerId: "a", damage: 2, inBaseContactWithEnemy: false },
    ];

    expect(summarizeWarbandDamage("a", knights)).toEqual({
      playerId: "a",
      totalDamage: 3,
      knightsRemaining: 2,
    });
  });
});

describe("courageDifficulty", () => {
  it("sums allied removals and the testing knight's own damage", () => {
    expect(courageDifficulty(2, 1)).toBe(3);
    expect(courageDifficulty(0, 0)).toBe(0);
  });
});

describe("evaluateCourageRoll", () => {
  it("passes when the roll meets or exceeds difficulty", () => {
    expect(evaluateCourageRoll(3, 3).passed).toBe(true);
    expect(evaluateCourageRoll(4, 3).passed).toBe(true);
  });

  it("fails when the roll is below difficulty", () => {
    expect(evaluateCourageRoll(2, 3).passed).toBe(false);
  });

  it("a natural 6 always passes regardless of difficulty", () => {
    expect(evaluateCourageRoll(6, 99).passed).toBe(true);
  });
});

describe("runCouragePhase", () => {
  it("tests the most-damaged player's warband first, in full, before the other player", async () => {
    const rolledFor: string[] = [];
    const dice: DiceApiLike = {
      async roll(_formula: string, _data?: Record<string, unknown>, options?: { flavor?: string }) {
        rolledFor.push(String(options?.flavor));
        return { total: 6 };
      },
    };

    const aKnight: CourageKnight = { id: "kA1", ownerId: "a", damage: 1, inBaseContactWithEnemy: true };
    const bKnight1: CourageKnight = { id: "kB1", ownerId: "b", damage: 2, inBaseContactWithEnemy: true };
    const bKnight2: CourageKnight = { id: "kB2", ownerId: "b", damage: 1, inBaseContactWithEnemy: true };

    const outcomes = await runCouragePhase(
      dice,
      new Map([
        ["a", [aKnight]],
        ["b", [bKnight1, bKnight2]],
      ])
    );

    expect([...outcomes.keys()]).toEqual(["kB1", "kB2", "kA1"]);
  });

  it("cascades: a failed test raises difficulty for that player's remaining tests this phase", async () => {
    const outcomes = await runCouragePhase(
      fixedDice([3, 3]),
      new Map([
        [
          "a",
          [
            { id: "kA1", ownerId: "a", damage: 3, inBaseContactWithEnemy: true },
            { id: "kA2", ownerId: "a", damage: 1, inBaseContactWithEnemy: true },
          ],
        ],
      ])
    );

    // First test: difficulty = 0 removed + 3 damage = 3, roll 3 -> passes.
    expect(outcomes.get("kA1")?.passed).toBe(true);
    expect(outcomes.get("kA1")?.difficulty).toBe(3);

    // Second test on a different knight is unaffected by the first knight's
    // pass -- no removal occurred, so difficulty is still just its own damage.
    expect(outcomes.get("kA2")?.difficulty).toBe(1);
    expect(outcomes.get("kA2")?.passed).toBe(true);
  });

  it("a failed test increases difficulty for the next test in the same phase", async () => {
    const outcomes = await runCouragePhase(
      fixedDice([1, 2]),
      new Map([
        [
          "a",
          [
            { id: "kA1", ownerId: "a", damage: 2, inBaseContactWithEnemy: true },
            { id: "kA2", ownerId: "a", damage: 1, inBaseContactWithEnemy: true },
          ],
        ],
      ])
    );

    // kA1: difficulty 2, rolls 1 -> fails, removed count becomes 1.
    expect(outcomes.get("kA1")?.passed).toBe(false);

    // kA2: difficulty = 1 (removed) + 1 (own damage) = 2, rolls 2 -> passes.
    expect(outcomes.get("kA2")?.difficulty).toBe(2);
    expect(outcomes.get("kA2")?.passed).toBe(true);
  });
});
