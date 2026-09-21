import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSalvoAtTarget, type SalvoContext } from "../src/combat/salvo";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


afterEach(() => vi.unstubAllGlobals());

function scriptedDice(pools: number[][]): SalvoContext["dice"] {
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

function attacker(arcs: string[] = ["F"], opts: { destroyed?: boolean; spent?: boolean } = {}) {
  return {
    token: {},
    system: { weapons: [{ kind: "salvo", arcs, destroyed: opts.destroyed, spent: opts.spent }] }
  };
}

function target(extra: Record<string, any> = {}) {
  return fakeTarget({
    screens: 3, pds: 0, pdsLost: 0, fcs: 0, thrust: 0,
    armour: { boxes: 0, damage: 0 },
    hull: { boxes: 18, damage: 0, rows: 3 },
    weapons: [],
    ...extra
  });
}

function ctx(distance: number, bearing: number, dice: SalvoContext["dice"]): SalvoContext {
  return { measure: { between: () => ({ distance }) }, facing: { bearingOf: () => bearing }, dice };
}

describe("resolveSalvoAtTarget", () => {
  it("rolls missiles-on-target, then survivors each roll damage (screens ignored)", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const t = target(); // screens 3 must NOT reduce salvo damage
    // on-target die 4 -> 4 missiles; no PDS; 4 damage dice 6,3,2,1 -> 12.
    const report = await resolveSalvoAtTarget({
      attacker: attacker(), target: t, context: ctx(10, 0, scriptedDice([[4], [6, 3, 2, 1]]))
    });
    expect(report.fired).toBe(true);
    expect(report.onTarget).toBe(4);
    expect(report.survivors).toBe(4);
    expect(report.totalDamage).toBe(12);
    expect(t.system.hull.damage).toBe(12);
  });

  it("lets the target's PDS intercept before damage", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const t = target({ pds: 2 });
    // on-target 6; PDS 2 dice 6,4 -> 2+1 = 3 intercepted; 3 survive; damage 5,5,5 -> 15.
    const report = await resolveSalvoAtTarget({
      attacker: attacker(), target: t, context: ctx(10, 0, scriptedDice([[6], [6, 4], [5, 5, 5]]))
    });
    expect(report.intercepted).toBe(3);
    expect(report.survivors).toBe(3);
    expect(report.totalDamage).toBe(15);
  });

  it("armour absorbs salvo missiles", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const t = target({ armour: { boxes: 5, damage: 0 } });
    // on-target 2; 2 survivors damage 6,6 -> 12, armour 5 absorbs -> 7 to hull.
    const report = await resolveSalvoAtTarget({
      attacker: attacker(), target: t, context: ctx(10, 0, scriptedDice([[2], [6, 6]]))
    });
    expect(t.system.armour.damage).toBe(5);
    expect(t.system.hull.damage).toBe(7);
  });

  it("marks the launcher spent", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const a = attacker();
    const report = await resolveSalvoAtTarget({
      attacker: a, target: target(), context: ctx(10, 0, scriptedDice([[1], [3]]))
    });
    expect(report.spentIndex).toBe(0);
  });

  it("refuses beyond salvo range", async () => {
    const report = await resolveSalvoAtTarget({
      attacker: attacker(), target: target(), context: ctx(25, 0, scriptedDice([[6]]))
    });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("out-of-range");
  });

  it("refuses without a working salvo launcher", async () => {
    const report = await resolveSalvoAtTarget({
      attacker: attacker(["F"], { spent: true }), target: target(), context: ctx(10, 0, scriptedDice([[6]]))
    });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("no-salvo");
  });
});
