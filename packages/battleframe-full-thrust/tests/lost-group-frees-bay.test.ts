import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { releaseLaunchingBay, sweepFighterEndurance } from "../src/combat/fighter-endurance";
import { advanceTurnCore, launchFightersAction } from "../src/ui/round-control";
import {
  FIGHTER_EXHAUSTED_TURNS_FLAG,
  FIGHTER_GROUP_ACTOR_TYPE,
  LAUNCHED_BY_FLAG,
  LAUNCHED_GROUPS_FLAG,
  MODULE_ID,
  SHIP_ACTOR_TYPE
} from "../src/constants";
import { SCENARIO_RULES, withRules } from "./helpers/world";

/**
 * Roadmap P2 #14: a group lost to endurance used to keep its carrier's bay occupied,
 * because nothing recorded which carrier launched it.
 */

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

function flagged(initial: Record<string, unknown>, extra: Record<string, unknown> = {}) {
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

function carrier(uuid: string, deployed: number, isOwner = true) {
  return flagged({ [LAUNCHED_GROUPS_FLAG]: deployed }, { uuid, isOwner, type: `${MODULE_ID}.${SHIP_ACTOR_TYPE}` });
}

function exhaustedGroup(launchedBy?: string) {
  const initial: Record<string, unknown> = { [FIGHTER_EXHAUSTED_TURNS_FLAG]: SCENARIO_RULES.fighterReturnGraceTurns - 1 };
  if (launchedBy !== undefined) initial[LAUNCHED_BY_FLAG] = launchedBy;
  return flagged(initial, {
    name: "Wing",
    isOwner: true,
    type: `${MODULE_ID}.${FIGHTER_GROUP_ACTOR_TYPE}`,
    system: { size: 1, endurance: 0 },
    update: vi.fn(async () => undefined),
    toggleStatusEffect: vi.fn(async () => undefined)
  });
}

describe("a group lost to endurance frees its carrier's bay", () => {
  it("lowers the launching carrier's count, and only that carrier's", async () => {
    const home = carrier("Actor.home", 2);
    const other = carrier("Actor.other", 2);
    const wing = exhaustedGroup("Actor.home");

    const [result] = await sweepFighterEndurance([wing], { lossRule: true, carriers: [other, home] });

    expect(result.status).toBe("lost");
    expect(home.flags[LAUNCHED_GROUPS_FLAG]).toBe(1);
    expect(other.flags[LAUNCHED_GROUPS_FLAG]).toBe(2);
    expect(wing.flags[LAUNCHED_BY_FLAG]).toBeUndefined();
  });

  it("a group that only has to return keeps its bay", async () => {
    const home = carrier("Actor.home", 2);

    await sweepFighterEndurance([exhaustedGroup("Actor.home")], { lossRule: false, carriers: [home] });

    expect(home.flags[LAUNCHED_GROUPS_FLAG]).toBe(2);
  });

  it("frees nothing for an unrecorded group, an absent carrier or one this client cannot write", async () => {
    const home = carrier("Actor.home", 1, false);

    expect(await releaseLaunchingBay(exhaustedGroup(), [home])).toBe(false);
    expect(await releaseLaunchingBay(exhaustedGroup("Actor.gone"), [home])).toBe(false);
    expect(await releaseLaunchingBay(exhaustedGroup("Actor.home"), [home])).toBe(false);
    expect(home.setFlag).not.toHaveBeenCalled();
  });

  it("never takes the count below zero", async () => {
    const home = carrier("Actor.home", 0);

    expect(await releaseLaunchingBay(exhaustedGroup("Actor.home"), [home])).toBe(true);
    expect(home.flags[LAUNCHED_GROUPS_FLAG]).toBe(0);
  });
});

describe("the turn and the launch tool carry the carrier through", () => {
  it("Launch Fighters records the carrier's uuid on the new group", async () => {
    const create = vi.fn(async () => ({
      getTokenDocument: async () => ({ toObject: () => ({}) })
    }));
    const ship = carrier("Scene.s.Token.t.Actor.home", 0);
    const token = {
      name: "Home",
      w: 0,
      center: { x: 0, y: 0 },
      actor: { ...ship, system: { bays: 2 } },
      document: { disposition: 1, parent: { createEmbeddedDocuments: vi.fn(async () => []) } }
    };
    const game = (globalThis as any).game;
    game.user = { isGM: true };
    vi.stubGlobal("Actor", { create });
    vi.stubGlobal("ui", { notifications: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } });
    vi.stubGlobal("canvas", { tokens: { controlled: [token], placeables: [token] } });

    await launchFightersAction();

    expect(create).toHaveBeenCalledTimes(1);
    const data = (create.mock.calls[0] as unknown[])[0] as any;
    expect(data.flags[MODULE_ID][LAUNCHED_BY_FLAG]).toBe("Scene.s.Token.t.Actor.home");
  });

  it("the end-of-turn sweep hands the scene's ships to the loss rule", async () => {
    const home = carrier("Actor.home", 1);
    const wing = exhaustedGroup("Actor.home");
    const game = (globalThis as any).game;
    const get = game.settings?.get;
    game.settings = { ...(game.settings ?? {}), get: (scope: string, key: string) => (scope === MODULE_ID && key === "fighterLossRule" ? true : get?.(scope, key)) };
    vi.stubGlobal("ChatMessage", { create: vi.fn(async () => undefined) });
    vi.stubGlobal("canvas", { tokens: { controlled: [], placeables: [{ actor: home }, { actor: wing }] } });

    await advanceTurnCore();

    expect(home.flags[LAUNCHED_GROUPS_FLAG]).toBe(0);
  });
});
