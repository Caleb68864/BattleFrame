import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveWeaponFire } from "../src/combat/fire";
import { previewTargeting } from "../src/combat/targeting";
import { allocateFcsFire } from "../src/combat/fcs-allocation";
import { fireFighterGroupAtTarget } from "../src/combat/fire-fighters";
import { sweepFighterEndurance } from "../src/combat/fighter-endurance";
import { buildFighterReportHtml, buildEnduranceReportHtml, conditionalAftFire } from "../src/ui/round-control";
import { FIGHTER_EXHAUSTED_TURNS_FLAG, MODULE_ID, THRUSTED_THIS_TURN_FLAG } from "../src/constants";
import { SCENARIO_RULES, withRules } from "./helpers/world";

let restore: () => void;
beforeEach(() => {
  restore = withRules();
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

const TURRET = ["F", "FS", "AS", "AP", "FP"];
const AFT_BEARING = 180;

describe("conditional aft fire reaches the fire path", () => {
  const dice = { rollPool: async (n: number) => Array(n).fill(1) };
  const weapons = [{ kind: "beam", weaponClass: 1, arcs: TURRET }] as never;

  async function shotReason(aftFire?: { thrusted: boolean }) {
    const fire = await resolveWeaponFire({
      weapons,
      distanceMu: 1,
      bearing: AFT_BEARING,
      targetScreenLevel: 0,
      dice,
      aftFire,
    });
    return fire.shots[0].reason ?? "fired";
  }

  it("is off by default: the aft arc stays blind", async () => {
    expect(await shotReason()).toBe("out-of-arc");
  });

  it("lets an all-round turret fire aft on a no-thrust turn", async () => {
    expect(await shotReason({ thrusted: false })).toBe("fired");
  });

  it("any main-drive thrust closes it again", async () => {
    expect(await shotReason({ thrusted: true })).toBe("out-of-arc");
  });

  it("the targeting preview agrees with the shot", () => {
    const preview = (aftFire?: { thrusted: boolean }) =>
      previewTargeting({ weapons, distanceMu: 1, bearing: AFT_BEARING, aftFire })[0].status;

    expect(preview()).toBe("out-of-arc");
    expect(preview({ thrusted: false })).toBe("will-fire");
    expect(preview({ thrusted: true })).toBe("out-of-arc");
  });

  it("split fire can assign the turret to an aft target too", () => {
    const allocate = (aftFire?: { thrusted: boolean }) =>
      allocateFcsFire({
        fcsCount: 1,
        weapons,
        targets: [{ id: "t", distanceMu: 1, bearing: AFT_BEARING }],
        aftFire,
      }).assignments.length;

    expect(allocate()).toBe(0);
    expect(allocate({ thrusted: false })).toBe(1);
  });
});

describe("conditionalAftFire reads the world setting and the ship's own flag", () => {
  function firingShip(thrusted: boolean) {
    return {
      token: {
        actor: {
          getFlag: (scope: string, key: string) =>
            scope === MODULE_ID && key === THRUSTED_THIS_TURN_FLAG && thrusted ? true : undefined,
        },
      },
    };
  }
  function setting(on: boolean): void {
    const game = (globalThis as any).game;
    const get = game.settings.get;
    game.settings = {
      ...game.settings,
      get: (ns: string, key: string) => (key === "conditionalAftFire" ? on : get(ns, key)),
    };
  }

  it("is absent while the rule is off, whatever the ship did", () => {
    setting(false);
    expect(conditionalAftFire(firingShip(false))).toBeUndefined();
  });

  it("reports a ship with no thrust flag as not having thrusted", () => {
    setting(true);
    expect(conditionalAftFire(firingShip(false))).toEqual({ thrusted: false });
  });

  it("sees the flag through the wrapper's token Actor", () => {
    setting(true);
    expect(conditionalAftFire(firingShip(true))).toEqual({ thrusted: true });
  });
});

describe("pilot and type effects show on the fighter card", () => {
  const context = {
    measure: { between: () => ({ distance: 1 }) },
    facing: { bearingOf: () => 0 },
    dice: { rollPool: async (n: number) => Array(n).fill(1) },
  } as never;

  function group(system: Record<string, unknown>) {
    return { token: {}, system: { size: SCENARIO_RULES.fighterGroupMax, endurance: 1, ...system } } as never;
  }
  const target = { token: {}, system: {}, update: async () => undefined, toggleStatusEffect: async () => undefined } as never;

  it("the report carries the group's quality and type", async () => {
    const report = await fireFighterGroupAtTarget({
      group: group({ pilotQuality: "ace", fighterType: "attack" }),
      target,
      context,
    });

    expect(report.pilotQuality).toBe("ace");
    expect(report.fighterType).toBe("attack");
  });

  it("the card names a notable quality and type", () => {
    const html = buildFighterReportHtml(
      {
        fired: true,
        distance: 1,
        totalDamage: 0,
        destroyed: false,
        thresholdsCrossed: [],
        systemsKnockedOut: 0,
        pdsKills: 0,
        pilotQuality: "ace",
        fighterType: "attack",
      },
      { attacker: "A", target: "B" }
    );

    expect(html).toContain("ace");
    expect(html).toContain("attack");
  });

  it("an ordinary group's card adds no such line", () => {
    const html = buildFighterReportHtml(
      {
        fired: true,
        distance: 1,
        totalDamage: 0,
        destroyed: false,
        thresholdsCrossed: [],
        systemsKnockedOut: 0,
        pdsKills: 0,
        pilotQuality: "standard",
        fighterType: "standard",
      },
      { attacker: "A", target: "B" }
    );

    expect(html).not.toContain("standard");
  });
});

describe("sweepFighterEndurance", () => {
  function actor(system: Record<string, unknown>, turns?: number, isOwner = true) {
    const flags: Record<string, unknown> = turns === undefined ? {} : { [FIGHTER_EXHAUSTED_TURNS_FLAG]: turns };
    return {
      name: "Wing",
      isOwner,
      system,
      getFlag: (scope: string, key: string) => (scope === MODULE_ID ? flags[key] : undefined),
      setFlag: vi.fn(async (_s: string, key: string, value: unknown) => {
        flags[key] = value;
      }),
      unsetFlag: vi.fn(async (_s: string, key: string) => {
        delete flags[key];
      }),
      update: vi.fn(async () => undefined),
      toggleStatusEffect: vi.fn(async () => undefined),
    };
  }

  it("leaves a group with fuel alone and clears any stale count", async () => {
    const wing = actor({ size: 1, endurance: 1 }, 2);

    expect(await sweepFighterEndurance([wing], { lossRule: true })).toEqual([]);
    expect(wing.unsetFlag).toHaveBeenCalledWith(MODULE_ID, FIGHTER_EXHAUSTED_TURNS_FLAG);
  });

  it("orders an exhausted group home and counts the turn", async () => {
    const wing = actor({ size: 1, endurance: 0 });

    expect(await sweepFighterEndurance([wing], { lossRule: false })).toEqual([
      { name: "Wing", status: "must-return", turns: 1 },
    ]);
    expect(wing.setFlag).toHaveBeenCalledWith(MODULE_ID, FIGHTER_EXHAUSTED_TURNS_FLAG, 1);
  });

  it("without the optional rule a group is never lost, however long it drifts", async () => {
    const wing = actor({ size: 1, endurance: 0 }, 999);

    const [result] = await sweepFighterEndurance([wing], { lossRule: false });

    expect(result.status).toBe("must-return");
    expect(wing.update).not.toHaveBeenCalled();
  });

  it("with the optional rule it is lost after the world's grace, visibly and natively", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "defeated-id" } });
    const grace = SCENARIO_RULES.fighterReturnGraceTurns;
    const wing = actor({ size: 1, endurance: 0 }, grace - 1);

    const [result] = await sweepFighterEndurance([wing], { lossRule: true });

    expect(result.status).toBe("lost");
    expect(wing.update).toHaveBeenCalledWith({ "system.size": 0 });
    expect(wing.toggleStatusEffect).toHaveBeenCalledWith("defeated-id", { active: true });
  });

  it("does not report a group already gone", async () => {
    expect(await sweepFighterEndurance([actor({ size: 0, endurance: 0 })], { lossRule: true })).toEqual([]);
  });

  it("skips what this client may not write, so a player's advance cannot fail on it", async () => {
    const wing = actor({ size: 1, endurance: 0 }, undefined, false);

    expect(await sweepFighterEndurance([wing], { lossRule: true })).toEqual([]);
    expect(wing.setFlag).not.toHaveBeenCalled();
  });

  it("the card escapes the group's name", () => {
    const html = buildEnduranceReportHtml([{ name: "<b>Wing</b>", status: "lost", turns: 1 }]);

    expect(html).toContain("&lt;b&gt;Wing");
    expect(html).not.toContain("<b>Wing");
  });
});
