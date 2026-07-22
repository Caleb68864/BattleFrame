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

function fakeGroup(system: Record<string, any>) {
  return {
    token: {},
    system,
    update: (data: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(data)) {
        system[k.replace(/^system\./, "")] = v;
      }
      return Promise.resolve();
    }
  };
}

function targetHull() {
  return fakeTarget({
    screens: 0, thrust: 0, fcs: 0, pds: 0,
    armour: { boxes: 0, damage: 0 },
    hull: { boxes: 18, damage: 0, rows: 3 },
    weapons: []
  });
}

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

  it("cannot attack from a non-finite range (degenerate geometry)", async () => {
    const target = targetHull();
    const ctx = context(NaN, 0, scriptedDice([[6, 6, 6, 6, 6, 6]]));
    const report = await fireFighterGroupAtTarget({ group, target, context: ctx });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("out-of-range");
  });

  it("a depleted group aborts when its morale die exceeds the fighters remaining", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const depleted = fakeGroup({ size: 3 });
    const target = targetHull();
    // First pool = morale die (5 > size 3 -> abort); attack dice never rolled.
    const ctx = context(4, 0, scriptedDice([[5], [6, 6, 6]]));
    const report = await fireFighterGroupAtTarget({ group: depleted, target, context: ctx });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("morale");
    expect(target.system.hull.damage).toBe(0);
  });

  it("a depleted group that passes morale attacks, then spends an endurance", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const depleted = fakeGroup({ size: 3, endurance: 3 });
    const target = targetHull();
    // morale die 2 (<= 3 -> pass); attack dice 6,5,4 -> 2+1+1 = 4.
    const ctx = context(4, 0, scriptedDice([[2], [6, 5, 4]]));
    const report = await fireFighterGroupAtTarget({ group: depleted, target, context: ctx });
    expect(report.fired).toBe(true);
    expect(report.totalDamage).toBe(4);
    expect(depleted.system.endurance).toBe(2); // one active turn spent
  });

  it("an Attack-type group adds +1 to each attack die (vs ships)", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const attackWing = fakeGroup({ size: 6, fighterType: "attack" });
    const target = targetHull();
    // Faces 3,3,3,3,3,3: unscreened score 0 each, but +1 -> all 4s -> 1 each = 6.
    const ctx = context(4, 0, scriptedDice([[3, 3, 3, 3, 3, 3]]));
    const report = await fireFighterGroupAtTarget({ group: attackWing, target, context: ctx });
    expect(report.totalDamage).toBe(6);
  });

  it("the target's PDS thins the group before it strikes, and casualties persist", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const wing = fakeGroup({ size: 6 });
    const target = fakeTarget({
      screens: 0, thrust: 0, fcs: 0, pds: 2,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    });
    // PDS 2 dice: 6,4 -> 2+1 = 3 kills -> 3 fighters left (now depleted).
    // Morale die 1 (<= 3 pass). Attack 3 dice 6,6,6 -> 6 damage.
    const ctx = context(4, 0, scriptedDice([[6, 4], [1], [6, 6, 6]]));
    const report = await fireFighterGroupAtTarget({ group: wing, target, context: ctx });

    expect(report.pdsKills).toBe(3);
    expect(wing.system.size).toBe(3); // casualties applied
    expect(report.fired).toBe(true);
    expect(report.totalDamage).toBe(6);
  });

  it("a morale-broken group cannot attack", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const broken = fakeGroup({ size: 3, moraleBroken: true });
    const report = await fireFighterGroupAtTarget({ group: broken, target: targetHull(), context: context(4, 0, scriptedDice([[6, 6, 6]])) });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("morale-broken");
  });

  it("an out-of-fuel group (endurance 0) cannot attack", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const spent = fakeGroup({ size: 6, endurance: 0 });
    const report = await fireFighterGroupAtTarget({ group: spent, target: targetHull(), context: context(4, 0, scriptedDice([[6, 6, 6, 6, 6, 6]])) });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("exhausted");
  });

  it("breaks morale after a third consecutive failed check", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const shaky = fakeGroup({ size: 2, moraleFails: 2 }); // two prior fails
    // Morale die 3 > size 2 -> fail; that is the third -> broken.
    const report = await fireFighterGroupAtTarget({ group: shaky, target: targetHull(), context: context(4, 0, scriptedDice([[3]])) });
    expect(report.reason).toBe("morale");
    expect(shaky.system.moraleFails).toBe(3);
    expect(shaky.system.moraleBroken).toBe(true);
  });

  it("a group shot down entirely by PDS makes no attack", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const wing = fakeGroup({ size: 2 });
    const target = fakeTarget({
      screens: 0, thrust: 0, fcs: 0, pds: 2,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    });
    // PDS 2 dice: 6,6 -> 4 kills, capped at 2 -> all fighters gone.
    const ctx = context(4, 0, scriptedDice([[6, 6]]));
    const report = await fireFighterGroupAtTarget({ group: wing, target, context: ctx });

    expect(report.fired).toBe(false);
    expect(report.reason).toBe("shot-down");
    expect(wing.system.size).toBe(0);
    expect(target.system.hull.damage).toBe(0);
  });
});
