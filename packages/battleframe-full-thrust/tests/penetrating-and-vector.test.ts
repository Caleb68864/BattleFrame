import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveWeaponFire } from "../src/combat/fire";
import { applyDamageToShip } from "../src/data/ship-state";
import { vectorMoveAction } from "../src/ui/round-control";
import { MODULE_ID, THRUSTED_THIS_TURN_FLAG } from "../src/constants";
import { SCENARIO_RULES, withRules } from "./helpers/world";

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

describe("penetrating damage skips armour, as ship/fleet-book.ts describes", () => {
  const top = SCENARIO_RULES.dieTwoDamage;
  const weapon = { kind: "beam", weaponClass: 1, arcs: ["F"] } as never;

  /** One die rolling the top face, then a reroll scoring one point. */
  function scripted() {
    const pools = [[top], [SCENARIO_RULES.dieOneDamageMin]];
    return { rollPool: async () => pools.shift() ?? [] };
  }

  it("reports the penetrating part separately, inside the total", async () => {
    const fire = await resolveWeaponFire({
      weapons: [weapon],
      distanceMu: 1,
      bearing: 0,
      targetScreenLevel: 0,
      dice: scripted(),
      penetrating: true,
    });

    expect(fire.penetratingDamage).toBeGreaterThan(0);
    expect(fire.penetratingDamage).toBeLessThan(fire.totalDamage);
  });

  it("is zero on the default path", async () => {
    const fire = await resolveWeaponFire({
      weapons: [weapon],
      distanceMu: 1,
      bearing: 0,
      targetScreenLevel: 0,
      dice: scripted(),
    });

    expect(fire.penetratingDamage).toBe(0);
  });

  function ship() {
    return {
      system: { armour: { boxes: 10, damage: 0 }, hull: { boxes: 20, damage: 0, rows: 2 } },
      update: vi.fn(async () => undefined),
      toggleStatusEffect: vi.fn(async () => undefined),
    } as never;
  }

  it("lands on the hull while armour remains; only the rest spends armour", async () => {
    const result = await applyDamageToShip(ship(), 5, [], 3);

    expect(result.armour.damage).toBe(2);
    expect(result.hull.damage).toBe(3);
  });

  it("leaves the plain path alone when nothing penetrates", async () => {
    const result = await applyDamageToShip(ship(), 5);

    expect(result.armour.damage).toBe(5);
    expect(result.hull.damage).toBe(0);
  });
});

describe("vectorMoveAction enforces the budget checkManoeuvres already computes", () => {
  function world(orderText: string, thrust: number) {
    const docUpdate = vi.fn(async () => undefined);
    const actorUpdate = vi.fn(async () => undefined);
    const setFlag = vi.fn(async () => undefined);
    const warn = vi.fn();
    vi.stubGlobal("ui", { notifications: { warn, info: vi.fn(), error: vi.fn() } });
    vi.stubGlobal("foundry", {
      applications: { api: { DialogV2: { prompt: async () => orderText } } },
    });
    vi.stubGlobal("canvas", {
      scene: { grid: { size: 100, distance: 1 } },
      tokens: {
        controlled: [
          {
            document: { x: 0, y: 0, update: docUpdate },
            actor: { system: { thrust, course: 1, vx: 0, vy: 0 }, update: actorUpdate, setFlag },
          },
        ],
      },
    });
    return { docUpdate, actorUpdate, setFlag, warn };
  }

  it("refuses an order over the ship's budget: nothing moves and it says why", async () => {
    const { docUpdate, actorUpdate, setFlag, warn } = world("MD99", 1);

    await vectorMoveAction();

    expect(docUpdate).not.toHaveBeenCalled();
    expect(actorUpdate).not.toHaveBeenCalled();
    expect(setFlag).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("main-drive-budget");
  });

  it("executes a legal burn and records the thrust for conditional aft fire", async () => {
    const { docUpdate, actorUpdate, setFlag } = world("MD1", 1);

    await vectorMoveAction();

    expect(docUpdate).toHaveBeenCalledTimes(1);
    expect(actorUpdate).toHaveBeenCalledTimes(1);
    expect(setFlag).toHaveBeenCalledWith(MODULE_ID, THRUSTED_THIS_TURN_FLAG, true);
  });

  it("a coast spends no thrust and sets no flag", async () => {
    const { docUpdate, setFlag } = world("", 1);

    await vectorMoveAction();

    expect(docUpdate).toHaveBeenCalledTimes(1);
    expect(setFlag).not.toHaveBeenCalled();
  });
});
