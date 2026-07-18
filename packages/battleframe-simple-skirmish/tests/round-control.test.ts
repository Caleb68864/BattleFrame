import { describe, expect, it } from "vitest";
import { afterEach, vi } from "vitest";
import {
  addSceneControl,
  beginRound,
  InitiativeUnresolvedError,
  legalAttackTypes,
  resolveActivation,
  rollInitiative,
  selectAttackTarget,
  sideFromDisposition,
  type RoundControlUnit
} from "../src/ui/round-control";
import type { DiceApiLike } from "../src/combat/resolve";
import { MODULE_ID } from "../src/constants";

afterEach(() => {
  vi.unstubAllGlobals();
});

function scriptedDice(faces: readonly number[]): DiceApiLike {
  let i = 0;
  return { async roll() { return { total: faces[i++] ?? 1 }; } };
}

function unit(id: string, playerId: string, system: Record<string, unknown>): RoundControlUnit {
  const actor = {
    system: { models: 3, move: 6, ...system },
    async update(data: Record<string, unknown>) {
      const next = data["system.models"];
      if (typeof next === "number") (actor.system as { models: number }).models = next;
    }
  };
  return { id, playerId, token: { id }, actor };
}

describe("rollInitiative", () => {
  it("returns the higher roller as first, with zero re-rolls", async () => {
    const { firstPlayerId, rerolls } = await rollInitiative(["a", "b"], scriptedDice([5, 3]));
    expect(firstPlayerId).toBe("a");
    expect(rerolls).toBe(0);
  });

  it("re-rolls on a tie until it breaks", async () => {
    // a,b tie at 4, then a=6 b=2.
    const { firstPlayerId, rerolls } = await rollInitiative(["a", "b"], scriptedDice([4, 4, 6, 2]));
    expect(firstPlayerId).toBe("a");
    expect(rerolls).toBe(1);
  });

  it("throws when ties never break within the bound", async () => {
    await expect(rollInitiative(["a", "b"], scriptedDice([3, 3, 3, 3]), 1)).rejects.toThrow(
      InitiativeUnresolvedError
    );
  });
});

describe("beginRound", () => {
  it("rolls initiative and builds a round on the first player", async () => {
    const units = [unit("a1", "a", {}), unit("b1", "b", {})];
    const { round, firstPlayerId } = await beginRound({ units, dice: scriptedDice([6, 2]) });

    expect(firstPlayerId).toBe("a");
    expect(round.activePlayerId()).toBe("a");
  });
});

describe("legalAttackTypes -- has the stat AND the target is in range", () => {
  it("offers melee within Move, ranged/magic within 12", () => {
    const attacker = unit("a1", "a", { move: 6, attackMelee: 4, attackRanged: 3, attackMagic: null });

    expect(legalAttackTypes(attacker, 5)).toEqual(["melee", "ranged"]); // within charge and 12"
    expect(legalAttackTypes(attacker, 8)).toEqual(["ranged"]); // beyond a 6" charge, within 12"
    expect(legalAttackTypes(attacker, 20)).toEqual([]); // out of every range
  });

  it("never offers a type the unit has no stat for", () => {
    const attacker = unit("a1", "a", { attackMelee: null, attackRanged: 4, attackMagic: null });
    expect(legalAttackTypes(attacker, 1)).toEqual(["ranged"]);
  });
});

describe("resolveActivation", () => {
  it("resolves an attack, advances the turn, and does not end a round that is not over", async () => {
    const a1 = unit("a1", "a", { attackMelee: 4 });
    const b1 = unit("b1", "b", { save: 5 });
    const units = [a1, b1];
    const { round } = await beginRound({ units, dice: scriptedDice([6, 2]) }); // a first

    // a1 attacks b1: [4,4,2] -> 2 hits; saves [3,6] -> 1 casualty.
    const result = await resolveActivation({
      round,
      attacker: a1,
      target: b1,
      type: "melee",
      dice: scriptedDice([4, 4, 2, 3, 6]),
      units
    });

    expect(result.roundComplete).toBe(false);
    expect(b1.actor.system.models).toBe(2);
    expect(round.activePlayerId()).toBe("b"); // turn advanced
  });

  it("reads the deathmatch victory when the last unit activates", async () => {
    const a1 = unit("a1", "a", { attackMelee: 2 });
    const b1 = unit("b1", "b", { save: null, models: 2 });
    const units = [a1, b1];
    const { round } = await beginRound({ units, dice: scriptedDice([6, 2]) }); // a first

    // a1 wipes b1 (no save, 3 hits on 2 models).
    const result = await resolveActivation({
      round,
      attacker: a1,
      target: b1,
      type: "melee",
      dice: scriptedDice([2, 5, 6]),
      units
    });

    // b1 destroyed -> b has nothing to activate -> round complete -> a wins.
    expect(result.roundComplete).toBe(true);
    expect(result.victory).toEqual({ result: "winner", playerId: "a" });
  });

  it("refuses to activate a unit out of turn", async () => {
    const a1 = unit("a1", "a", {});
    const b1 = unit("b1", "b", {});
    const units = [a1, b1];
    const { round } = await beginRound({ units, dice: scriptedDice([6, 2]) }); // a first

    await expect(
      resolveActivation({ round, attacker: b1, target: null, type: null, dice: scriptedDice([]), units })
    ).rejects.toThrow(/turn to activate/);
  });
});

describe("selectAttackTarget -- never yourself or a friend; prefer the explicit enemy, else the nearest", () => {
  const enemyDist = (distances: Record<string, number>) => ({
    between(_a: unknown, b: unknown, mode?: string) {
      if (mode !== "centre-to-centre") throw new Error("range must be centre-to-centre");
      return { distance: distances[(b as { id: string }).id] };
    }
  });

  it("uses an explicit enemy target", () => {
    const a1 = unit("a1", "a", {}), b1 = unit("b1", "b", {});
    expect(selectAttackTarget(a1, [b1], [a1, b1], enemyDist({ b1: 5 }))?.id).toBe("b1");
  });

  it("never targets the attacker itself, even if it is the explicit target", () => {
    const a1 = unit("a1", "a", {}), b1 = unit("b1", "b", {});
    // a1 explicitly targeted (a stale self-target, the live bug) -> falls through to the enemy.
    expect(selectAttackTarget(a1, [a1], [a1, b1], enemyDist({ b1: 9 }))?.id).toBe("b1");
  });

  it("never targets a friendly unit", () => {
    const a1 = unit("a1", "a", {}), a2 = unit("a2", "a", {}), b1 = unit("b1", "b", {});
    expect(selectAttackTarget(a1, [a2], [a1, a2, b1], enemyDist({ b1: 3 }))?.id).toBe("b1");
  });

  it("skips a destroyed enemy and finds a living one", () => {
    const a1 = unit("a1", "a", {}), b1 = unit("b1", "b", { models: 0 }), b2 = unit("b2", "b", {});
    expect(selectAttackTarget(a1, [b1], [a1, b1, b2], enemyDist({ b1: 1, b2: 7 }))?.id).toBe("b2");
  });

  it("falls to the nearest enemy when no explicit target is set", () => {
    const a1 = unit("a1", "a", {}), b1 = unit("b1", "b", {}), b2 = unit("b2", "b", {});
    expect(selectAttackTarget(a1, [], [a1, b1, b2], enemyDist({ b1: 8, b2: 4 }))?.id).toBe("b2");
  });

  it("returns null when there is no living enemy", () => {
    const a1 = unit("a1", "a", {}), b1 = unit("b1", "b", { models: 0 });
    expect(selectAttackTarget(a1, [b1], [a1, b1], enemyDist({ b1: 2 }))).toBeNull();
  });
});

describe("sideFromDisposition", () => {
  it("splits the two sides on Foundry's own hostile/friendly disposition", () => {
    expect(sideFromDisposition(-1)).toBe("hostile");
    expect(sideFromDisposition(1)).toBe("friendly");
    expect(sideFromDisposition(undefined)).toBe("friendly");
  });
});

describe("addSceneControl -- GM-only, both payload shapes, both tools", () => {
  it("appends a control with the run + activate tools to an array payload", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: Array<{ name: string; tools: Array<{ name: string }>; visible: boolean }> = [];

    addSceneControl(controls);

    expect(controls).toHaveLength(1);
    expect(controls[0].visible).toBe(true);
    expect(controls[0].tools.map((t) => t.name)).toEqual([
      "simple-skirmish-run-round",
      "simple-skirmish-activate"
    ]);
  });

  it("keys the control and its tools into a record payload", () => {
    vi.stubGlobal("game", { user: { isGM: true } });
    const controls: Record<string, { tools?: Record<string, unknown>; visible?: boolean }> = {};

    addSceneControl(controls);

    expect(controls[MODULE_ID].tools).toHaveProperty("simple-skirmish-run-round");
    expect(controls[MODULE_ID].tools).toHaveProperty("simple-skirmish-activate");
  });

  it("marks the control invisible to a non-GM and never throws on odd payloads", () => {
    vi.stubGlobal("game", { user: { isGM: false } });
    const controls: Record<string, { visible?: boolean }> = {};
    addSceneControl(controls);
    expect(controls[MODULE_ID].visible).toBe(false);

    expect(() => addSceneControl(undefined)).not.toThrow();
  });
});
