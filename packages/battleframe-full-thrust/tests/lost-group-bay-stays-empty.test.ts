import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sweepFighterEndurance } from "../src/combat/fighter-endurance";
import { launchFightersAction } from "../src/ui/round-control";
import {
  FIGHTER_EXHAUSTED_TURNS_FLAG,
  FIGHTER_GROUP_ACTOR_TYPE,
  LAUNCHED_GROUPS_FLAG,
  MODULE_ID,
  SHIP_ACTOR_TYPE
} from "../src/constants";
import { SCENARIO_RULES, withRules } from "./helpers/world";

/**
 * The carrier's launch count is the number of its bays that are EMPTY: launching
 * empties one, recovering fills one. A group lost to endurance never comes back, so
 * its bay stays empty and the carrier must not launch a replacement out of it. (A
 * 2026-11-21 change briefly lowered the count on a loss, which did exactly that.)
 */

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

function flagged(initial: Record<string, unknown>, extra: Record<string, unknown>) {
  const flags: Record<string, unknown> = { ...initial };
  return {
    flags,
    getFlag: (scope: string, key: string) => (scope === MODULE_ID ? flags[key] : undefined),
    setFlag: vi.fn(async (_s: string, key: string, value: unknown) => {
      flags[key] = value;
    }),
    unsetFlag: vi.fn(async (_s: string, key: string) => {
      delete flags[key];
    }),
    ...extra
  };
}

describe("a lost fighter group's bay stays empty", () => {
  it("a one-bay carrier cannot launch again after its only group is lost", async () => {
    const create = vi.fn(async (data: any) => {
      const group = flagged(data.flags?.[MODULE_ID] ?? {}, {
        name: data.name,
        isOwner: true,
        type: `${MODULE_ID}.${FIGHTER_GROUP_ACTOR_TYPE}`,
        system: { size: 1, endurance: 0 },
        update: vi.fn(async () => undefined),
        toggleStatusEffect: vi.fn(async () => undefined),
        getTokenDocument: async () => ({ toObject: () => ({}) })
      });
      launched.push(group);
      return group;
    });
    const launched: any[] = [];
    const ship = flagged({}, { uuid: "Actor.home", isOwner: true, type: `${MODULE_ID}.${SHIP_ACTOR_TYPE}`, system: { bays: 1 } });
    const token = {
      name: "Home",
      w: 0,
      center: { x: 0, y: 0 },
      actor: ship,
      document: { disposition: 1, parent: { createEmbeddedDocuments: vi.fn(async () => []) } }
    };
    (globalThis as any).game.user = { isGM: true };
    vi.stubGlobal("Actor", { create });
    vi.stubGlobal("ui", { notifications: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } });
    vi.stubGlobal("canvas", { tokens: { controlled: [token], placeables: [token] } });

    await launchFightersAction();
    expect(create).toHaveBeenCalledTimes(1);

    const wing = launched[0];
    wing.flags[FIGHTER_EXHAUSTED_TURNS_FLAG] = SCENARIO_RULES.fighterReturnGraceTurns - 1;
    const [result] = await sweepFighterEndurance([wing], { lossRule: true, carriers: [ship] } as any);
    expect(result.status).toBe("lost");
    expect(ship.flags[LAUNCHED_GROUPS_FLAG]).toBe(1);

    await launchFightersAction();
    expect(create).toHaveBeenCalledTimes(1);
  });
});
