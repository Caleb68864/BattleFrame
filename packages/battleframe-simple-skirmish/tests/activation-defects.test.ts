import { afterEach, describe, expect, it, vi } from "vitest";
import { beginRound, gatherUnitsFromCanvas, resolveActivation, type RoundControlUnit } from "../src/ui/round-control";
import { createUnitDataClass } from "../src/data/unit";
import type { DiceApiLike } from "../src/combat/resolve";
import { MODULE_ID } from "../src/constants";

/**
 * Defects found in the 2026-11-21 audit:
 *  1. an attack rolled and saved its casualties before the round checked the
 *     attacker could activate, so an already-activated or destroyed unit could fire;
 *  2. two unlinked tokens of one actor shared the actor's id, so they were one unit;
 *  3. the defeated status was only ever turned on; restoring a unit's models on the
 *     sheet left the skull on its token.
 */

afterEach(() => vi.unstubAllGlobals());

function countingDice(faces: readonly number[]): DiceApiLike & { rolls: number } {
  let i = 0;
  const dice = {
    rolls: 0,
    async roll() {
      dice.rolls += 1;
      return { total: faces[i++] ?? 1 };
    }
  };
  return dice;
}

function unit(id: string, playerId: string, system: Record<string, unknown>): RoundControlUnit & { actor: { update: ReturnType<typeof vi.fn> } } {
  const actor = {
    system: { models: 3, move: 6, ...system },
    update: vi.fn(async (data: Record<string, unknown>) => {
      const next = data["system.models"];
      if (typeof next === "number") (actor.system as { models: number }).models = next;
    })
  };
  return { id, playerId, token: { id }, actor } as never;
}

describe("an attack waits for the round to allow the activation", () => {
  it("a unit that already activated cannot attack again on its side's next turn", async () => {
    const a1 = unit("a1", "a", { attackMelee: 4 });
    const a2 = unit("a2", "a", { attackMelee: 4 });
    const b1 = unit("b1", "b", { save: 5, models: 0 });
    const b2 = unit("b2", "b", { save: 5 });
    const units = [a1, a2, b1, b2];
    const { round } = await beginRound({ units, dice: countingDice([6, 2]) }); // a first
    await resolveActivation({ round, attacker: a1, target: null, type: null, dice: countingDice([]), units });
    await resolveActivation({ round, attacker: b2, target: null, type: null, dice: countingDice([]), units });
    expect(round.activePlayerId()).toBe("a");

    const dice = countingDice([4, 4, 4, 1, 1, 1]);
    const postCard = vi.fn();
    await expect(
      resolveActivation({ round, attacker: a1, target: b2, type: "melee", dice, units, postCard })
    ).rejects.toThrow();

    expect(dice.rolls).toBe(0);
    expect(b2.actor.update).not.toHaveBeenCalled();
    expect(postCard).not.toHaveBeenCalled();
  });

  it("a destroyed unit on the active side cannot attack", async () => {
    const dead = unit("a1", "a", { attackMelee: 4, models: 0 });
    const live = unit("a2", "a", { attackMelee: 4 });
    const b1 = unit("b1", "b", { save: 5 });
    const units = [dead, live, b1];
    const { round } = await beginRound({ units, dice: countingDice([6, 2]) });

    const dice = countingDice([4, 4, 4]);
    const postCard = vi.fn();
    await expect(
      resolveActivation({ round, attacker: dead, target: b1, type: "melee", dice, units, postCard })
    ).rejects.toThrow();
    expect(dice.rolls).toBe(0);
    expect(postCard).not.toHaveBeenCalled();
  });
});

describe("units are keyed by token, not actor", () => {
  it("two unlinked tokens of the same actor are two units", () => {
    const actor = { id: "actor-1", name: "Orc Warband", type: `${MODULE_ID}.unit`, system: { models: 3 } };
    vi.stubGlobal("canvas", {
      tokens: {
        placeables: [
          { id: "tok-1", document: { id: "tok-1", disposition: 1 }, actor, center: { x: 0, y: 0 } },
          { id: "tok-2", document: { id: "tok-2", disposition: 1 }, actor, center: { x: 0, y: 0 } }
        ]
      }
    });

    expect(new Set(gatherUnitsFromCanvas().map((u) => u.id)).size).toBe(2);
  });
});

describe("the defeated status follows the model count both ways", () => {
  class Base {}

  function unitData(models: number, userId = "me") {
    vi.stubGlobal("game", { ...(globalThis as any).game, user: { id: userId } });
    const Data = createUnitDataClass(Base as never) as any;
    const data = new Data();
    data.models = models;
    const toggleStatusEffect = vi.fn(async () => undefined);
    data.parent = { system: data, toggleStatusEffect };
    return { data, toggleStatusEffect };
  }

  it("restoring models clears it, for the user who made the change", async () => {
    const { data, toggleStatusEffect } = unitData(2);

    await data._onUpdate({ system: { models: 2 } }, {}, "me");

    expect(toggleStatusEffect).toHaveBeenCalledWith(expect.any(String), { active: false });
  });

  it("other clients do not write, and an unrelated change does nothing", async () => {
    const { data, toggleStatusEffect } = unitData(2);

    await data._onUpdate({ system: { models: 2 } }, {}, "someone-else");
    await data._onUpdate({ name: "Renamed" }, {}, "me");

    expect(toggleStatusEffect).not.toHaveBeenCalled();
  });
});
