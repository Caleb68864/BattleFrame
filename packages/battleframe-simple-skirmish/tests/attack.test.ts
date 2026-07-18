import { describe, expect, it } from "vitest";
import {
  attackTargetFor,
  performAttack,
  saveTargetFor,
  type AttackUnit
} from "../src/combat/attack";
import type { DiceApiLike } from "../src/combat/resolve";

function scriptedDice(faces: readonly number[]): DiceApiLike {
  let i = 0;
  return { async roll() { return { total: faces[i++] ?? 1 }; } };
}

function unit(id: string, system: Record<string, unknown>): AttackUnit {
  const actor = {
    system: { models: 3, ...system },
    async update(data: Record<string, unknown>) {
      const next = data["system.models"];
      if (typeof next === "number") (actor.system as { models: number }).models = next;
    }
  };
  return { id, playerId: id[0], token: { id }, actor };
}

describe("stat readers", () => {
  it("read the per-type attack target and the save, null when absent", () => {
    const u = unit("a1", { attackMelee: 4, attackRanged: null, save: 5 });
    expect(attackTargetFor(u.actor, "melee")).toBe(4);
    expect(attackTargetFor(u.actor, "ranged")).toBeNull();
    expect(saveTargetFor(u.actor)).toBe(5);
  });
});

describe("performAttack", () => {
  it("refuses a type the attacker has no stat for", async () => {
    const attacker = unit("a1", { attackMelee: null });
    const defender = unit("b1", { save: 5 });

    const outcome = await performAttack({
      attacker,
      defender,
      type: "melee",
      dice: scriptedDice([])
    });

    expect(outcome).toEqual({ refused: "no-melee-attack" });
    expect(defender.actor.system.models).toBe(3); // untouched
  });

  it("resolves hits and saves, applies casualties, and reports destruction", async () => {
    // attacker 3 models, melee 4+. rolls [4,4,2] -> 2 hits. defender save 5,
    // rolls [3,3] -> both below 5 -> 2 casualties. defender had 3 -> 1 left.
    const attacker = unit("a1", { attackMelee: 4 });
    const defender = unit("b1", { save: 5 });

    const outcome = await performAttack({
      attacker,
      defender,
      type: "melee",
      dice: scriptedDice([4, 4, 2, 3, 3])
    });

    expect(outcome).toMatchObject({ hits: 2, casualties: 2, destroyed: false });
    expect(defender.actor.system.models).toBe(1);
  });

  it("destroys a unit when casualties meet its model count", async () => {
    const attacker = unit("a1", { attackMelee: 2 });
    const defender = unit("b1", { save: null }); // no save: every hit is a casualty
    defender.actor.system.models = 2;

    // 3 attack dice on 2+: [2,5,6] -> 3 hits, but defender only has 2 models.
    const outcome = await performAttack({
      attacker,
      defender,
      type: "melee",
      dice: scriptedDice([2, 5, 6])
    });

    expect(outcome).toMatchObject({ hits: 3, casualties: 3, destroyed: true });
    expect(defender.actor.system.models).toBe(0);
  });
});
