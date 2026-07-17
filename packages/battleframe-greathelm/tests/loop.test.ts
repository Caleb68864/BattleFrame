import { describe, expect, it } from "vitest";
import {
  resolveBattlePhaseOrder,
  writeRoundOrderToCombatFlags,
  runRound,
  type CombatLike,
  type RoundDie,
} from "../src/round/loop";
import type { DiceApiLike } from "../src/combat/clash";
import type { CourageKnight } from "../src/round/courage";

function die(id: string, playerId: string, knightId: string, face: number): RoundDie {
  return { id, playerId, knightId, face: face as RoundDie["face"] };
}

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

describe("resolveBattlePhaseOrder", () => {
  it("resolves strictly 6 -> 1, so movement always precedes violence", () => {
    const dice = [
      die("d1", "a", "kA1", 3),
      die("d2", "a", "kA2", 6),
      die("d3", "b", "kB1", 1),
      die("d4", "b", "kB2", 4),
    ];

    const order = resolveBattlePhaseOrder(dice, "a", ["a", "b"]);
    const faces = order.map((d) => d.face);

    expect(faces).toEqual([6, 4, 3, 1]);
    expect(order.map((d) => d.action)).toEqual(["sprint", "bash", "shift", "heavy"]);
  });

  it("returns an empty order for an empty pool without throwing", () => {
    expect(resolveBattlePhaseOrder([], "a", ["a", "b"])).toEqual([]);
  });

  it("alternates one action at a time within a shared step, starting with the initiative winner", () => {
    const dice = [
      die("d1", "a", "kA1", 6),
      die("d2", "b", "kB1", 6),
      die("d3", "a", "kA2", 6),
      die("d4", "b", "kB2", 6),
    ];

    const order = resolveBattlePhaseOrder(dice, "a", ["a", "b"]);
    expect(order.map((d) => d.playerId)).toEqual(["a", "b", "a", "b"]);
  });

  it("skips a player with no legal action at a step without stalling the other player", () => {
    const dice = [
      die("d1", "a", "kA1", 6),
      die("d2", "a", "kA2", 6),
      // player "b" has no die at face 6 at all -- no legal action there.
      die("d3", "b", "kB1", 5),
    ];

    const order = resolveBattlePhaseOrder(dice, "a", ["a", "b"]);

    expect(order.map((d) => d.id)).toEqual(["d1", "d2", "d3"]);
  });

  it("a knight with zero dice does not appear in, or break, the resolution order", () => {
    const dice = [die("d1", "a", "kA1", 6), die("d2", "b", "kB1", 5)];
    // "kA2" has no models/dice this round -- simply absent from the pool.
    const order = resolveBattlePhaseOrder(dice, "a", ["a", "b"]);

    expect(order.map((d) => d.knightId)).toEqual(["kA1", "kB1"]);
    expect(order.some((d) => d.knightId === "kA2")).toBe(false);
  });
});

describe("writeRoundOrderToCombatFlags", () => {
  it("writes the resolved knight order to combat.flags.battleframe.order", () => {
    const combat: CombatLike = {};
    const resolved = resolveBattlePhaseOrder(
      [die("d1", "a", "kA1", 6), die("d2", "b", "kB1", 5)],
      "a",
      ["a", "b"]
    );

    const order = writeRoundOrderToCombatFlags(combat, resolved);

    expect(order).toEqual(["kA1", "kB1"]);
    expect(combat.flags?.battleframe?.order).toEqual(["kA1", "kB1"]);
  });
});

describe("runRound", () => {
  it("activates every spent die in 6 -> 1 order, then runs the courage phase after all dice are spent", async () => {
    const activated: string[] = [];
    const combat: CombatLike = {};

    const damagedInContact: CourageKnight = {
      id: "kB1",
      ownerId: "b",
      damage: 1,
      inBaseContactWithEnemy: true,
    };

    const result = await runRound({
      dice: [die("d1", "a", "kA1", 6), die("d2", "b", "kB1", 1)],
      firstPlayerId: "a",
      playerIds: ["a", "b"],
      combat,
      onActivate: (resolvedDie) => {
        activated.push(resolvedDie.id);
      },
      courage: {
        dice: fixedDice([6]),
        warbandsKnights: new Map([
          ["a", []],
          ["b", [damagedInContact]],
        ]),
      },
    });

    expect(activated).toEqual(["d1", "d2"]);
    expect(result.order.map((d) => d.id)).toEqual(["d1", "d2"]);
    expect(result.courageOutcomes.get("kB1")?.passed).toBe(true);
    expect(combat.flags?.battleframe?.order).toEqual(["kA1", "kB1"]);
  });

  it("does not break when one side has no legal action at all (zero dice)", async () => {
    const combat: CombatLike = {};

    const result = await runRound({
      dice: [die("d1", "a", "kA1", 6)],
      firstPlayerId: "a",
      playerIds: ["a", "b"],
      combat,
      courage: {
        dice: fixedDice([6]),
        warbandsKnights: new Map([
          ["a", []],
          ["b", []],
        ]),
      },
    });

    expect(result.order.map((d) => d.id)).toEqual(["d1"]);
    expect(result.courageOutcomes.size).toBe(0);
  });
});
