import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseFleet } from "../src/data/fleet-import";
import { designPoints, shipPointsFromSystem } from "../src/ship/design";
import { hullBoxesForGrade, hullPointsForGrade } from "../src/ship/variable-hull";
import { recoverFightersAction } from "../src/ui/round-control";
import { FIGHTER_GROUP_ACTOR_TYPE, LAUNCHED_GROUPS_FLAG, MODULE_ID, RECOVERED_THIS_TURN_FLAG } from "../src/constants";
import { SCENARIO_RULES, withRules } from "./helpers/world";

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

describe("a ship can use the variable-hull system through import", () => {
  it("derives its damage track from the grade", () => {
    const result = parseFleet({ ships: [{ name: "V", mass: 50, hullGrade: "strong" }] });
    const system = result.ships[0].system as any;

    expect(system.hullGrade).toBe("strong");
    expect(system.hull).toMatchObject({
      boxes: hullBoxesForGrade(50, "strong"),
      rows: SCENARIO_RULES.variableHullRows,
      damage: 0,
    });
  });

  it("an explicit hull still wins, and an unknown grade is ignored", () => {
    const explicit = parseFleet({ ships: [{ name: "X", mass: 50, hullGrade: "strong", hull: { boxes: 3, rows: 1 } }] });
    const unknown = parseFleet({ ships: [{ name: "Y", mass: 50, hullGrade: "nonsense" }] });

    expect((explicit.ships[0].system as any).hull).toMatchObject({ boxes: 3, rows: 1 });
    expect((unknown.ships[0].system as any).hullGrade).toBe("");
  });

  it("prices the graded hull instead of the fixed one", () => {
    const base = { mass: 50, shipClass: "capital" as const, thrust: 0 };
    const fixed = designPoints(base);
    const graded = designPoints({ ...base, hullGrade: "strong" });

    expect(fixed).not.toBe(graded);
    expect(graded).toBe(hullPointsForGrade(50, "strong"));
  });

  it("carries the grade from a live ship into its points", () => {
    expect(shipPointsFromSystem({ mass: 50, thrust: 0, fcs: 0, hullGrade: "strong" })).toBe(
      hullPointsForGrade(50, "strong")
    );
  });
});

describe("recoverFightersAction applies the carrier core's own limits", () => {
  function world(distance: number, opts: { recovered?: number; deployed?: number; bays?: number } = {}) {
    const flags: Record<string, unknown> = {
      [LAUNCHED_GROUPS_FLAG]: opts.deployed ?? 1,
      [RECOVERED_THIS_TURN_FLAG]: opts.recovered,
    };
    const setFlag = vi.fn(async (_s: string, key: string, value: unknown) => {
      flags[key] = value;
    });
    const carrier = {
      document: { disposition: 1 },
      actor: {
        system: { bays: opts.bays ?? 2 },
        getFlag: (scope: string, key: string) => (scope === MODULE_ID ? flags[key] : undefined),
        setFlag,
      },
    };
    const removeToken = vi.fn(async () => undefined);
    const group = {
      document: { disposition: 1, delete: removeToken },
      actor: { type: `${MODULE_ID}.${FIGHTER_GROUP_ACTOR_TYPE}`, system: { fighterType: "standard" }, delete: vi.fn(async () => undefined) },
    };
    const warn = vi.fn();
    const game = (globalThis as any).game;
    game.user = { isGM: true };
    game.battleframe = { measure: { between: () => ({ distance }) } };
    vi.stubGlobal("ui", { notifications: { warn, info: vi.fn(), error: vi.fn() } });
    vi.stubGlobal("canvas", { tokens: { controlled: [carrier], placeables: [group] } });
    return { removeToken, setFlag, warn };
  }

  it("recovers a group within its own move, past the old attack-range limit", async () => {
    const { removeToken, setFlag } = world(SCENARIO_RULES.fighterAttackRangeMu + 1);

    await recoverFightersAction();

    expect(removeToken).toHaveBeenCalledTimes(1);
    expect(setFlag).toHaveBeenCalledWith(MODULE_ID, RECOVERED_THIS_TURN_FLAG, 1);
  });

  it("refuses a group beyond its move", async () => {
    const { removeToken, warn } = world(SCENARIO_RULES.fighterMoveMu + 1);

    await recoverFightersAction();

    expect(removeToken).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("refuses once the turn's recoveries are used", async () => {
    const { removeToken, warn } = world(1, { recovered: SCENARIO_RULES.fighterRecoverPerTurn });

    await recoverFightersAction();

    expect(removeToken).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
