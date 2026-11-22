import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withDieSize } from "./helpers/world";
import { createRoundsApi } from "../../battleframe/src/rounds/activation";
import {
  advanceRoundCore,
  beginRound,
  gatherUnitsFromCanvas,
  resolveActivation,
  type RoundControlUnit
} from "../src/ui/round-control";
import type { DiceApiLike } from "../src/combat/resolve";
import type { UnitSystemData } from "../src/data/unit-state";

/**
 * Round-flow defects found in the 2026-11-21 audit:
 *  1. an attack resolved (and its damage saved) before the order checked that the
 *     attacker may activate at all, so an already-activated or wiped unit could fire;
 *  2. two unlinked tokens of one actor shared the actor's id, so they were one unit;
 *  3. a wiped side still rolled initiative, and Run Round opened rounds after the
 *     battle was won.
 */

const roundsApi = createRoundsApi();

let restore: () => void;
beforeEach(() => {
  restore = withDieSize();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

function recordingDice(faces: number[]): DiceApiLike & { calls: string[] } {
  const queue = [...faces];
  const calls: string[] = [];
  return {
    calls,
    async roll(_formula: string, _data: unknown, options?: { flavor?: string }) {
      calls.push(options?.flavor ?? "roll");
      return { total: queue.shift() ?? 1 };
    },
    async rollPool(count: number) {
      calls.push(`pool ${count}`);
      return count <= 0 ? [] : queue.splice(0, count).concat(Array(Math.max(0, count - queue.length)).fill(1)).slice(0, count);
    }
  } as never;
}

function system(extra: Partial<UnitSystemData> = {}): UnitSystemData {
  return {
    modelCount: 2,
    modelsRemaining: 2,
    move: 6,
    morale: 6,
    attackClear: 7,
    attackCover: 5,
    armorModifier: 3,
    armorDice: 1,
    suppressed: false,
    weapons: [{ name: "Carbine", count: 1, dmg: 2, attackDice: 2, owDice: 1 }],
    ...extra
  };
}

function unit(id: string, sideId: string, sys: UnitSystemData): RoundControlUnit {
  return { id, name: id, sideId, actor: { system: sys } };
}

describe("an attack waits for the order to allow the activation", () => {
  it("a wiped unit on the active side cannot fire", async () => {
    const wiped = unit("a1", "A", system({ modelsRemaining: 0 }));
    const fresh = unit("a2", "A", system());
    const enemy = unit("b1", "B", system());
    const units = [wiped, fresh, enemy];
    const { order } = await beginRound({ units, dice: recordingDice([1, 5]), roundsApi, rng: () => 0 });
    expect(order.activeSideId()).toBe("A");

    const dice = recordingDice([]);
    const applyState = vi.fn();
    const postCard = vi.fn();
    await expect(
      resolveActivation({ order, attacker: wiped, target: enemy, dice, units, applyState, postCard })
    ).rejects.toThrow();

    expect(dice.calls).toEqual([]);
    expect(applyState).not.toHaveBeenCalled();
    expect(postCard).not.toHaveBeenCalled();
  });

  it("a unit that already activated cannot fire again on its side's next turn", async () => {
    const a1 = unit("a1", "A", system());
    const a2 = unit("a2", "A", system());
    const b1 = unit("b1", "B", system({ modelsRemaining: 0 }));
    // B is wiped, so A activates back to back.
    const units = [a1, a2, b1];
    const { order } = await beginRound({ units, dice: recordingDice([1]), roundsApi, rng: () => 0 });
    await resolveActivation({ order, attacker: a1, target: null, dice: recordingDice([]), units });
    expect(order.activeSideId()).toBe("A");

    const dice = recordingDice([]);
    const applyState = vi.fn();
    await expect(
      resolveActivation({ order, attacker: a1, target: b1, dice, units, applyState })
    ).rejects.toThrow();
    expect(dice.calls).toEqual([]);
    expect(applyState).not.toHaveBeenCalled();
  });
});

describe("units are keyed by token, not actor", () => {
  it("two unlinked tokens of the same actor are two units", () => {
    const actor = { id: "actor-1", name: "Rifle Squad", type: "battleframe-incountry.unit", system: system() };
    vi.stubGlobal("canvas", {
      tokens: {
        placeables: [
          { id: "tok-1", document: { id: "tok-1", disposition: 1 }, actor },
          { id: "tok-2", document: { id: "tok-2", disposition: 1 }, actor }
        ]
      }
    });

    const ids = gatherUnitsFromCanvas().map((u) => u.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe("a wiped side is out of the battle", () => {
  it("does not roll initiative", async () => {
    const dice = recordingDice([3]);
    const units = [unit("a1", "A", system()), unit("b1", "B", system({ modelsRemaining: 0 }))];

    const { firstSideId } = await beginRound({ units, dice, roundsApi, rng: () => 0 });

    expect(firstSideId).toBe("A");
    expect(dice.calls.filter((c) => c.includes("initiative"))).toEqual(["initiative (A)"]);
  });

  it("Run Round does not open a round once one side holds the field", async () => {
    const create = vi.fn();
    const info = vi.fn();
    const warn = vi.fn();
    const g = (globalThis as any).game;
    g.battleframe = { dice: recordingDice([3, 4]), rounds: roundsApi };
    g.combats = { contents: [] };
    g.i18n = { localize: (k: string) => `[${k}]`, format: (k: string) => `[${k}]` };
    vi.stubGlobal("Combat", { create });
    vi.stubGlobal("ui", { notifications: { info, warn, error: vi.fn() } });
    const live = { id: "a", name: "A", type: "battleframe-incountry.unit", system: system() };
    const dead = { id: "b", name: "B", type: "battleframe-incountry.unit", system: system({ modelsRemaining: 0 }) };
    vi.stubGlobal("canvas", {
      scene: { id: "s" },
      tokens: {
        placeables: [
          { id: "t1", document: { id: "t1", disposition: 1 }, actor: live },
          { id: "t2", document: { id: "t2", disposition: -1 }, actor: dead }
        ]
      }
    });

    const outcome = await advanceRoundCore();

    expect(create).not.toHaveBeenCalled();
    expect(outcome).toEqual({ message: "[battleframe-incountry.controls.round.battleOver]", level: "warn" });
    // The advance reports its outcome; the engine shows it to every player.
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("the combat a round creates", () => {
  it("is made active, so the next round finds it", async () => {
    const flags: Record<string, unknown> = {};
    const created = {
      activate: vi.fn(async () => undefined),
      getFlag: (_s: string, k: string) => flags[k],
      setFlag: vi.fn(async (_s: string, k: string, v: unknown) => (flags[k] = v)),
      unsetFlag: vi.fn(),
      createEmbeddedDocuments: vi.fn(async () => []),
      combatants: [],
      startCombat: vi.fn(async () => undefined)
    };
    const create = vi.fn(async () => created);
    const g = (globalThis as any).game;
    g.battleframe = { dice: recordingDice([3, 4]), rounds: roundsApi };
    g.combats = { contents: [] };
    g.i18n = { localize: (k: string) => k, format: (k: string) => k };
    vi.stubGlobal("Combat", { create });
    vi.stubGlobal("ui", { notifications: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    const a = { id: "a", name: "A", type: "battleframe-incountry.unit", system: system() };
    const b = { id: "b", name: "B", type: "battleframe-incountry.unit", system: system() };
    vi.stubGlobal("canvas", {
      scene: { id: "s" },
      tokens: {
        placeables: [
          { id: "t1", document: { id: "t1", disposition: 1 }, actor: a },
          { id: "t2", document: { id: "t2", disposition: -1 }, actor: b }
        ]
      }
    });

    const outcome = await advanceRoundCore();

    expect(outcome.level).toBe("info");
    expect(create).toHaveBeenCalledTimes(1);
    expect(created.activate).toHaveBeenCalledTimes(1);
  });
});
