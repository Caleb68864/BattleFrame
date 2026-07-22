import { afterEach, describe, expect, it, vi } from "vitest";
import { fireFighterGroupAtTarget, type FighterFireContext } from "../src/combat/fire-fighters";

afterEach(() => vi.unstubAllGlobals());

function scriptedDice(pools: number[][]): FighterFireContext["dice"] {
  const queue = [...pools];
  return { rollPool: async (count: number) => (queue.shift() ?? []).slice(0, count) };
}

function fakeTarget(system: Record<string, any>) {
  return {
    token: {},
    system,
    update: (data: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(data)) {
        const path = k.replace(/^system\./, "").split(".");
        let node: any = system;
        for (let i = 0; i < path.length - 1; i++) node = node[path[i]] ??= {};
        node[path[path.length - 1]] = v;
      }
      return Promise.resolve();
    },
    toggleStatusEffect: () => Promise.resolve()
  };
}

function context(distance: number, bearing: number, dice: FighterFireContext["dice"]): FighterFireContext {
  return {
    measure: { between: () => ({ distance }) },
    facing: { bearingOf: () => bearing },
    dice
  };
}

const group = { token: {}, system: { size: 6 } };

describe("fireFighterGroupAtTarget", () => {
  it("rolls one die per fighter and applies damage (screens apply)", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const target = fakeTarget({
      screens: 0, thrust: 0, fcs: 0, pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    });
    // Size 6, faces 6,5,4,3,2,1 unscreened -> 2+1+1+0+0+0 = 4 damage.
    const ctx = context(4, 0, scriptedDice([[6, 5, 4, 3, 2, 1]]));

    const report = await fireFighterGroupAtTarget({ group, target, context: ctx });
    expect(report.fired).toBe(true);
    expect(report.totalDamage).toBe(4);
    expect(target.system.hull.damage).toBe(4);
  });

  it("cannot attack a target beyond 6mu", async () => {
    const target = fakeTarget({ screens: 0, hull: { boxes: 18, damage: 0, rows: 3 } });
    const ctx = context(7, 0, scriptedDice([[6, 6, 6, 6, 6, 6]]));
    const report = await fireFighterGroupAtTarget({ group, target, context: ctx });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("out-of-range");
  });

  it("cannot attack a target outside the group's fore arc", async () => {
    const target = fakeTarget({ screens: 0, hull: { boxes: 18, damage: 0, rows: 3 } });
    const ctx = context(4, 180, scriptedDice([[6, 6, 6, 6, 6, 6]]));
    const report = await fireFighterGroupAtTarget({ group, target, context: ctx });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("out-of-arc");
  });

  it("does nothing when the group has no fighters left", async () => {
    const empty = { token: {}, system: { size: 0 } };
    const target = fakeTarget({ screens: 0, hull: { boxes: 18, damage: 0, rows: 3 } });
    const ctx = context(4, 0, scriptedDice([[]]));
    const report = await fireFighterGroupAtTarget({ group: empty, target, context: ctx });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("no-fighters");
  });
});
