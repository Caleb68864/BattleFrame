import { describe, expect, it } from "vitest";
import { createSkirmishRound } from "../src/round/session";
import { performAttack, type AttackUnit } from "../src/combat/attack";
import { checkVictory } from "../src/round/victory";
import { isUnitDestroyed } from "../src/data/unit-state";
import type { DiceApiLike } from "../src/combat/resolve";

/**
 * The pieces of a Simple Skirmish round are each unit-tested; this drives them
 * together the way a played Basic Game round does: activate a unit, resolve its
 * attack, apply the casualties, watch the destroyed enemy drop out of the
 * activation order, and read the deathmatch victory. A "correct pieces, broken
 * whole" gap (a destroyed unit still demanding a turn) surfaced here and is what
 * the round's destroyed-unit skip fixes.
 */

function scriptedDice(faces: readonly number[]): DiceApiLike {
  let i = 0;
  return { async roll() { return { total: faces[i++] ?? 1 }; } };
}

function unit(id: string, playerId: string, system: Record<string, unknown>): AttackUnit {
  const actor = {
    system: { models: 3, ...system },
    async update(data: Record<string, unknown>) {
      const next = data["system.models"];
      if (typeof next === "number") (actor.system as { models: number }).models = next;
    }
  };
  return { id, playerId, token: { id }, actor };
}

describe("a Simple Skirmish Basic round, end to end", () => {
  it("activates, attacks, removes the wiped unit from the round, and wins the deathmatch", async () => {
    const a1 = unit("a1", "a", { attackMelee: 2, models: 3 });
    const b1 = unit("b1", "b", { save: null, models: 2 }); // no save; two models
    const roster = [a1, b1];

    const round = createSkirmishRound(
      roster.map((u) => ({ id: u.id, playerId: u.playerId, isDestroyed: () => isUnitDestroyed(u.actor) })),
      "a"
    );

    // a wins initiative and activates first.
    expect(round.activePlayerId()).toBe("a");

    // a1 attacks b1 in melee (2+). Three dice [2,5,6] -> 3 hits; no save, so 3
    // casualties against b1's 2 models -> destroyed.
    const outcome = await performAttack({ attacker: a1, defender: b1, type: "melee", dice: scriptedDice([2, 5, 6]) });
    expect(outcome).toMatchObject({ hits: 3, casualties: 3, destroyed: true });
    expect(b1.actor.system.models).toBe(0);

    round.activate("a1");

    // b1 is destroyed, so b has nothing to activate -- the round is over, and a
    // is not asked to keep going against an empty board.
    expect(round.activePlayerId()).toBeUndefined();
    expect(round.isComplete()).toBe(true);

    // b has no surviving unit; a wins the deathmatch.
    const victoryUnits = roster.map((u) => ({ playerId: u.playerId, isDestroyed: isUnitDestroyed(u.actor) }));
    expect(checkVictory(victoryUnits)).toEqual({ result: "winner", playerId: "a" });
  });

  it("keeps the round going when an attack wounds but does not destroy", async () => {
    const a1 = unit("a1", "a", { attackMelee: 4, models: 3 });
    const b1 = unit("b1", "b", { save: 5, models: 3 });
    const round = createSkirmishRound(
      [a1, b1].map((u) => ({ id: u.id, playerId: u.playerId, isDestroyed: () => isUnitDestroyed(u.actor) })),
      "a"
    );

    // [4,4,2] -> 2 hits; saves [3,6] -> one below 5 -> 1 casualty. b1: 3 -> 2.
    await performAttack({ attacker: a1, defender: b1, type: "melee", dice: scriptedDice([4, 4, 2, 3, 6]) });
    expect(b1.actor.system.models).toBe(2);

    round.activate("a1");
    // b1 survived, so it is still b's turn to act.
    expect(round.activePlayerId()).toBe("b");
    expect(checkVictory([a1, b1].map((u) => ({ playerId: u.playerId, isDestroyed: isUnitDestroyed(u.actor) })))).toEqual({
      result: "continue"
    });
  });
});
