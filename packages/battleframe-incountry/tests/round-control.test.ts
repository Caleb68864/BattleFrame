import { describe, expect, it } from "vitest";
import {
  createRoundsApi,
  type RoundsApi
} from "../../battleframe/src/rounds/activation";
import {
  beginRound,
  checkVictoryInx,
  resolveActivation,
  rollInitiativeInx,
  type RoundControlUnit
} from "../src/ui/round-control";
import type { DiceApiLike } from "../src/combat/resolve";
import type { UnitSystemData } from "../src/data/unit-state";

/**
 * The activation control's testable core, exercised end to end through the real
 * engine rounds API. The Foundry glue below the core in the module is not
 * covered here (it needs a canvas) -- these tests guard the round flow: roll
 * initiative, build the order, resolve an attack, apply casualties, and read the
 * victory.
 */

const roundsApi: RoundsApi = createRoundsApi();

function fakeDice(faces: number[]): DiceApiLike {
  const queue = [...faces];
  return {
    async roll() {
      const value = queue.shift();
      if (value === undefined) {
        throw new Error("fakeDice ran out of faces");
      }
      return { total: value };
    },
    async rollPool(count: number) {
      if (count <= 0) {
        return [];
      }
      const out = queue.splice(0, count);
      if (out.length < count) {
        throw new Error("fakeDice ran out of faces");
      }
      return out;
    }
  };
}

function system(extra: Partial<UnitSystemData> = {}): UnitSystemData {
  return {
    modelCount: 2,
    modelsRemaining: 2,
    move: 6,
    morale: 6,
    attackClear: 7,
    attackCover: 5,
    armorType: "unarmored",
    suppressed: false,
    weapons: [{ name: "Rifle", count: 1, dmg: 2, attackDice: 2, owDice: 1 }],
    ...extra
  };
}

function unit(id: string, sideId: string, sys: UnitSystemData): RoundControlUnit {
  return { id, name: id, sideId, actor: { system: sys } };
}

describe("rollInitiativeInx — low wins, reroll ties", () => {
  it("the lower d10 takes initiative", async () => {
    const dice = fakeDice([2, 8]); // A rolls 2, B rolls 8 -> A first
    const { firstSideId } = await rollInitiativeInx(["A", "B"], dice);
    expect(firstSideId).toBe("A");
  });

  it("rerolls a tie then resolves", async () => {
    const dice = fakeDice([5, 5, 3, 9]); // tie, then A=3 B=9 -> A
    const { firstSideId, rerolls } = await rollInitiativeInx(["A", "B"], dice);
    expect(firstSideId).toBe("A");
    expect(rerolls).toBe(1);
  });
});

describe("checkVictoryInx", () => {
  it("declares the side with survivors the winner when the other is wiped", () => {
    const a = unit("a1", "A", system({ modelsRemaining: 2 }));
    const b = unit("b1", "B", system({ modelsRemaining: 0 }));
    expect(checkVictoryInx([a, b])).toEqual({ result: "winner", sideId: "A" });
  });

  it("continues while both sides hold models", () => {
    const a = unit("a1", "A", system({ modelsRemaining: 1 }));
    const b = unit("b1", "B", system({ modelsRemaining: 1 }));
    expect(checkVictoryInx([a, b])).toEqual({ result: "continue" });
  });
});

describe("beginRound + resolveActivation — a played round to victory", () => {
  it("A activates, wipes B's last model, and the round reads A as winner", async () => {
    const a1 = unit("a1", "A", system({ modelsRemaining: 2 }));
    const b1 = unit("b1", "B", system({ modelsRemaining: 1 }));
    const units = [a1, b1];

    // initiative A=2,B=8 -> A; attack faces 3,4 (both hit vs 7, total 7 +2 = 9);
    // armor roll 1 -> 5 <= 9 -> B's last model dies (unit wiped, no suppression).
    const dice = fakeDice([2, 8, 3, 4, 1]);
    const applied: Array<{ id: string; modelsRemaining: number; suppressed: boolean }> = [];

    const { order, firstSideId } = await beginRound({
      units,
      dice,
      roundsApi,
      rng: () => 0
    });
    expect(firstSideId).toBe("A");

    const result = await resolveActivation({
      order,
      attacker: a1,
      target: b1,
      dice,
      units,
      applyState: (u, state) => {
        applied.push({ id: u.id, ...state });
        u.actor.system.modelsRemaining = state.modelsRemaining;
        u.actor.system.suppressed = state.suppressed;
      }
    });

    expect(result.attack?.targetDestroyed).toBe(true);
    expect(applied).toEqual([{ id: "b1", modelsRemaining: 0, suppressed: false }]);
    expect(result.roundComplete).toBe(true);
    expect(result.victory).toEqual({ result: "winner", sideId: "A" });
  });

  it("an attack that kills one of two models suppresses the survivor; the round continues", async () => {
    const a1 = unit("a1", "A", system({ modelsRemaining: 2, attackClear: 6 }));
    const b1 = unit(
      "b1",
      "B",
      system({ modelsRemaining: 2, morale: 4, armorType: "unarmored", attackClear: 6 })
    );
    const units = [a1, b1];
    const apply = (
      u: RoundControlUnit,
      s: { modelsRemaining: number; suppressed: boolean }
    ) => {
      u.actor.system.modelsRemaining = s.modelsRemaining;
      u.actor.system.suppressed = s.suppressed;
    };

    // init A=2,B=8 -> A first.
    // a1 -> b1: faces 3,4 hit vs 6 -> total 7 +2 = 9; armor 1 -> 5 <= 9 -> one model
    //   dies (b1 -> 1, survives); suppression 7 > morale 4 -> suppressed.
    // b1 -> a1: faces 6,5 hit vs 6 -> total 11 +2 = 13; armor 2 -> 6 <= 13 -> a1 -> 1;
    //   suppression 8 > morale 6 -> suppressed. Both sides keep a model -> continue.
    const dice = fakeDice([2, 8, 3, 4, 1, 7, 6, 5, 2, 8]);

    const { order } = await beginRound({ units, dice, roundsApi, rng: () => 0 });

    const r1 = await resolveActivation({ order, attacker: a1, target: b1, dice, units, applyState: apply });
    expect(r1.attack?.targetDestroyed).toBe(false);
    expect(b1.actor.system.modelsRemaining).toBe(1);
    expect(b1.actor.system.suppressed).toBe(true);
    expect(r1.roundComplete).toBe(false);

    const r2 = await resolveActivation({ order, attacker: b1, target: a1, dice, units, applyState: apply });
    expect(a1.actor.system.modelsRemaining).toBe(1);
    expect(r2.roundComplete).toBe(true);
    expect(r2.victory).toEqual({ result: "continue" });
  });

  it("throws when a side activates out of turn", async () => {
    const a1 = unit("a1", "A", system());
    const b1 = unit("b1", "B", system());
    const dice = fakeDice([2, 8]); // A first
    const { order } = await beginRound({ units: [a1, b1], dice, roundsApi, rng: () => 0 });

    await expect(
      resolveActivation({ order, attacker: b1, target: a1, dice, units: [a1, b1] })
    ).rejects.toThrow();
  });
});
