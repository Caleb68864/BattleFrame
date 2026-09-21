import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveMissileAttack, type MissileContext } from "../src/combat/missile";
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

/**
 * Independent (More Thrust) missile EMP and Needle warhead variants.
 * Source: user's notes "Missile Warheads.md" (More Thrust).
 *
 *   EMP  — roll ONE die minus 1 per level of target screens, then:
 *            1-2 no effect; 3-4 every system rolls threshold, knocked out on 5-6;
 *            5-6 every system rolls threshold, knocked out on 4-6. No hull damage.
 *   Needle — owner nominates a system and rolls a die:
 *            1-3 misses that system but does ONE die-score of normal damage;
 *            4-6 knocks out that specific system AND does 1 die of normal damage.
 */

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
    screens: 0, screensLost: 0, pds: 0, pdsLost: 0, fcs: 0, fcsLost: 0, thrust: 0,
    armour: { boxes: 0, damage: 0 },
    hull: { boxes: 18, damage: 0, rows: 3 }, // row size 6
    weapons: [],
    ...extra
  });
}

function ctx(distance: number, bearing: number, dice: MissileContext["dice"]): MissileContext {
  return { measure: { between: () => ({ distance }) }, facing: { bearingOf: () => bearing }, dice };
}

describe("resolveMissileAttack — EMP warhead", () => {
  it("no effect when the (screen-modified) effect die is 1-2", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // screens 3, effect die 3 -> 3-3 = 0 (<=2) -> no effect. No hull damage.
    const t = target({ screens: 3, weapons: [{}, {}] });
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, warhead: "emp",
      context: ctx(4, 0, scriptedDice([[3]]))
    });
    expect(report.attacked).toBe(true);
    expect(report.warhead).toBe("emp");
    expect(report.totalDamage).toBe(0);
    expect(report.systemsKnockedOut).toBe(0);
    expect(t.system.weapons[0].destroyed).toBeFalsy();
    expect(t.system.hull.damage).toBe(0);
  });

  it("weak band (3-4): every system rolls threshold, knocked out on 5-6", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // screens 0, effect die 3 -> 3 (weak) -> killOn 5.
    // systems: weapon0, weapon1, fcs  (3). Threshold faces 5,3,6 -> idx 0 & 2 lost.
    const t = target({ weapons: [{}, {}], fcs: 1 });
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, warhead: "emp",
      context: ctx(4, 0, scriptedDice([[3], [5, 3, 6]]))
    });
    expect(report.systemsKnockedOut).toBe(2);
    expect(t.system.weapons[0].destroyed).toBe(true);  // face 5 >= 5
    expect(t.system.weapons[1].destroyed).toBeFalsy(); // face 3 survives
    expect(t.system.fcsLost).toBe(1);                  // face 6 >= 5
    expect(report.totalDamage).toBe(0);                // EMP does no hull damage
    expect(t.system.hull.damage).toBe(0);
  });

  it("strong band (5-6): every system rolls threshold, knocked out on 4-6", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // screens 0, effect die 5 -> 5 (strong) -> killOn 4.
    // systems: weapon0, weapon1. Threshold faces 4,3 -> only idx 0 lost.
    const t = target({ weapons: [{}, {}] });
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, warhead: "emp",
      context: ctx(4, 0, scriptedDice([[5], [4, 3]]))
    });
    expect(report.systemsKnockedOut).toBe(1);
    expect(t.system.weapons[0].destroyed).toBe(true);  // face 4 >= 4
    expect(t.system.weapons[1].destroyed).toBeFalsy(); // face 3 survives
  });

  it("target screens subtract from the effect die (pushes 5 down into the weak band)", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // screens 2, effect die 5 -> 5-2 = 3 (weak, killOn 5), NOT strong (killOn 4).
    // systems: weapon0 + 2 screens = 3 refs. Threshold faces 4,4,4:
    //   weak (killOn 5): none lost. If it were strong (killOn 4) all 3 would be lost.
    const t = target({ screens: 2, weapons: [{}] });
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, warhead: "emp",
      context: ctx(4, 0, scriptedDice([[5], [4, 4, 4]]))
    });
    expect(report.systemsKnockedOut).toBe(0);
    expect(t.system.weapons[0].destroyed).toBeFalsy();
    expect(t.system.screensLost).toBe(0);
  });
});

describe("resolveMissileAttack — Needle warhead", () => {
  it("4-6 knocks out the nominated system AND does that die of normal damage", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // die 5 (>=4): knock out nominated FCS + 5 normal damage (no hull row completed).
    const t = target({ weapons: [{}, {}], fcs: 1 });
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, warhead: "needle", systemType: "fcs",
      context: ctx(4, 0, scriptedDice([[5]]))
    });
    expect(report.attacked).toBe(true);
    expect(report.warhead).toBe("needle");
    expect(report.nominatedSystemKnockedOut).toBe(true);
    expect(report.totalDamage).toBe(5);
    expect(t.system.hull.damage).toBe(5);
    expect(t.system.fcsLost).toBe(1);
    expect(report.systemsKnockedOut).toBe(1);
  });

  it("1-3 misses the nominated system but still does that die of normal damage", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // die 3 (<4): system survives, 3 normal damage.
    const t = target({ fcs: 1 });
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, warhead: "needle", systemType: "fcs",
      context: ctx(4, 0, scriptedDice([[3]]))
    });
    expect(report.nominatedSystemKnockedOut).toBe(false);
    expect(report.totalDamage).toBe(3);
    expect(t.system.hull.damage).toBe(3);
    expect(t.system.fcsLost).toBe(0);
    expect(report.systemsKnockedOut).toBe(0);
  });

  it("hit roll with no such system present: no knockout, still does normal damage", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // die 4 (>=4) but target has no PDS to snipe -> nothing knocked out, 4 damage.
    const t = target({ pds: 0, fcs: 1 });
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, warhead: "needle", systemType: "pds",
      context: ctx(4, 0, scriptedDice([[4]]))
    });
    expect(report.nominatedSystemKnockedOut).toBe(false);
    expect(report.totalDamage).toBe(4);
    expect(t.system.hull.damage).toBe(4);
    expect(report.systemsKnockedOut).toBe(0);
  });

  it("target PDS still intercepts a Needle-warhead missile on a 6 (shared step)", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const t = target({ pds: 1, fcs: 1 });
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, warhead: "needle", systemType: "fcs",
      context: ctx(4, 0, scriptedDice([[6]])) // PDS rolls a 6 -> kill
    });
    expect(report.intercepted).toBe(true);
    expect(report.attacked).toBe(false);
    expect(t.system.fcsLost).toBe(0);
    expect(t.system.hull.damage).toBe(0);
  });
});

describe("resolveMissileAttack — explicit Normal warhead unchanged", () => {
  it("warhead:'normal' matches the default 2-dice-summed behavior", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const t = target({ screens: 3 });
    const report = await resolveMissileAttack({
      missile: { token: {} }, target: t, warhead: "normal",
      context: ctx(4, 0, scriptedDice([[5, 4]]))
    });
    expect(report.attacked).toBe(true);
    expect(report.warhead).toBe("normal");
    expect(report.totalDamage).toBe(9);
    expect(t.system.hull.damage).toBe(9);
  });
});
