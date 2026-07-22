import { afterEach, describe, expect, it, vi } from "vitest";
import { fireNeedleAtSystem, type NeedleContext } from "../src/combat/needle";

afterEach(() => vi.unstubAllGlobals());

function scriptedDice(pools: number[][]): NeedleContext["dice"] {
  const queue = [...pools];
  return { rollPool: async (count: number) => (queue.shift() ?? []).slice(0, count) };
}

function fakeTarget(system: Record<string, any>) {
  return {
    token: {},
    system,
    update: (data: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(data)) {
        system[k.replace(/^system\./, "")] = v;
      }
      return Promise.resolve();
    },
    toggleStatusEffect: () => Promise.resolve()
  };
}

function attacker(arcs: string[] = ["F"], destroyed = false) {
  return { token: {}, system: { weapons: [{ kind: "needle", arcs, destroyed }] } };
}

function ctx(distance: number, bearing: number, dice: NeedleContext["dice"]): NeedleContext {
  return {
    measure: { between: () => ({ distance }) },
    facing: { bearingOf: () => bearing },
    dice
  };
}

describe("fireNeedleAtSystem", () => {
  it("knocks out the nominated system on a 6", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const target = fakeTarget({ thrust: 4, fcs: 2, pds: 0, screens: 0, weapons: [] });
    const report = await fireNeedleAtSystem({
      attacker: attacker(), target, systemType: "fcs", context: ctx(8, 0, scriptedDice([[6]]))
    });
    expect(report.hit).toBe(true);
    expect(target.system.fcsLost).toBe(1); // one FCS knocked out (design stays 2)
  });

  it("does nothing on a miss (1-5)", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const target = fakeTarget({ thrust: 4, fcs: 2, pds: 0, screens: 0, weapons: [] });
    const report = await fireNeedleAtSystem({
      attacker: attacker(), target, systemType: "fcs", context: ctx(8, 0, scriptedDice([[5]]))
    });
    expect(report.hit).toBe(false);
    expect(target.system.fcs).toBe(2);
  });

  it("refuses beyond 9mu", async () => {
    const target = fakeTarget({ fcs: 2, thrust: 0, pds: 0, screens: 0, weapons: [] });
    const report = await fireNeedleAtSystem({
      attacker: attacker(), target, systemType: "fcs", context: ctx(10, 0, scriptedDice([[6]]))
    });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("out-of-range");
  });

  it("refuses when the needle cannot bear on the target's arc", async () => {
    const target = fakeTarget({ fcs: 2, thrust: 0, pds: 0, screens: 0, weapons: [] });
    const report = await fireNeedleAtSystem({
      attacker: attacker(["F"]), target, systemType: "fcs", context: ctx(8, 180, scriptedDice([[6]]))
    });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("out-of-arc");
  });

  it("refuses when the ship has no working needle beam", async () => {
    const target = fakeTarget({ fcs: 2, thrust: 0, pds: 0, screens: 0, weapons: [] });
    const report = await fireNeedleAtSystem({
      attacker: attacker(["F"], true), target, systemType: "fcs", context: ctx(8, 0, scriptedDice([[6]]))
    });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("no-needle");
  });

  it("refuses when the target has no such surviving system", async () => {
    const target = fakeTarget({ fcs: 0, thrust: 0, pds: 0, screens: 0, weapons: [] });
    const report = await fireNeedleAtSystem({
      attacker: attacker(), target, systemType: "fcs", context: ctx(8, 0, scriptedDice([[6]]))
    });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("no-such-system");
  });
});
