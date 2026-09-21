import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { missileCanAttack, resolveMissileAttack, type MissileContext } from "../src/combat/missile";
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

function scriptedDice(pools: number[][]): MissileContext["dice"] {
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

function target(extra: Record<string, any> = {}) {
  return fakeTarget({
    screens: 3, pds: 0, pdsLost: 0, fcs: 0, thrust: 0,
    armour: { boxes: 0, damage: 0 },
    hull: { boxes: 18, damage: 0, rows: 3 },
    weapons: [],
    ...extra
  });
}

function ctx(distance: number, bearing: number, dice: MissileContext["dice"]): MissileContext {
  return { measure: { between: () => ({ distance }) }, facing: { bearingOf: () => bearing }, dice };
}

describe("missileCanAttack", () => {
  it("attacks a target within 6mu that is not in its rear arc", () => {
    expect(missileCanAttack(6, 0)).toBe(true); // dead ahead, on the range edge
    expect(missileCanAttack(3, 90)).toBe(true); // abeam (starboard AS arc)
  });

  it("cannot attack a target beyond 6mu", () => {
    expect(missileCanAttack(6.1, 0)).toBe(false);
  });

  it("cannot attack a target in its rear ('A') arc", () => {
    expect(missileCanAttack(3, 180)).toBe(false); // dead astern
    expect(missileCanAttack(3, 160)).toBe(false); // still within the 60° rear arc
  });
});

describe("resolveMissileAttack", () => {
  it("hits with a Normal warhead: 2 dice summed, screens do NOT reduce", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const t = target(); // screens 3 must NOT reduce warhead damage
    // No PDS; warhead dice 5,4 -> 9 damage.
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, context: ctx(4, 0, scriptedDice([[5, 4]]))
    });
    expect(report.attacked).toBe(true);
    expect(report.intercepted).toBe(false);
    expect(report.totalDamage).toBe(9);
    expect(t.system.hull.damage).toBe(9);
  });

  it("lets the target's PDS kill the missile on a 6 (no attack)", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const t = target({ pds: 2 });
    // PDS 2 dice 4,6 -> a 6 kills the missile; no warhead roll happens.
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, context: ctx(4, 0, scriptedDice([[4, 6]]))
    });
    expect(report.intercepted).toBe(true);
    expect(report.attacked).toBe(false);
    expect(report.totalDamage).toBe(0);
    expect(t.system.hull.damage).toBe(0);
  });

  it("survives PDS that rolls no 6 and then strikes", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const t = target({ pds: 3 });
    // PDS 3 dice 5,4,2 -> no 6, missile survives; warhead 6,6 -> 12 damage.
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, context: ctx(4, 0, scriptedDice([[5, 4, 2], [6, 6]]))
    });
    expect(report.intercepted).toBe(false);
    expect(report.attacked).toBe(true);
    expect(report.totalDamage).toBe(12);
  });

  it("armour absorbs warhead damage before hull", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const t = target({ armour: { boxes: 5, damage: 0 } });
    // Warhead 6,6 -> 12; armour 5 absorbs -> 7 to hull.
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, context: ctx(4, 0, scriptedDice([[6, 6]]))
    });
    expect(t.system.armour.damage).toBe(5);
    expect(t.system.hull.damage).toBe(7);
  });

  it("refuses when the ship finished beyond 6mu", async () => {
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: target(), context: ctx(7, 0, scriptedDice([[6, 6]]))
    });
    expect(report.attacked).toBe(false);
    expect(report.reason).toBe("out-of-range");
  });

  it("refuses when the ship finished in the missile's rear arc", async () => {
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: target(), context: ctx(3, 180, scriptedDice([[6, 6]]))
    });
    expect(report.attacked).toBe(false);
    expect(report.reason).toBe("in-rear-arc");
  });
});
