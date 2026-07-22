import { afterEach, describe, expect, it, vi } from "vitest";
import { applyDamageAndThreshold } from "../src/combat/apply-damage";

afterEach(() => vi.unstubAllGlobals());

function scriptedDice(pools: number[][]) {
  const queue = [...pools];
  return { rollPool: async (count: number) => (queue.shift() ?? []).slice(0, count) };
}

function fakeTarget(system: Record<string, any>) {
  return {
    system,
    update: (data: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(data)) {
        const path = key.replace(/^system\./, "").split(".");
        let node: any = system;
        for (let i = 0; i < path.length - 1; i++) node = node[path[i]] ??= {};
        node[path[path.length - 1]] = value;
      }
      return Promise.resolve();
    },
    toggleStatusEffect: () => Promise.resolve()
  };
}

describe("applyDamageAndThreshold", () => {
  it("applies damage and runs no threshold when no row completes", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const target = fakeTarget({
      screens: 0, thrust: 4, fcs: 1, pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    });
    const result = await applyDamageAndThreshold(target, 3, scriptedDice([]));
    expect(result.destroyed).toBe(false);
    expect(result.thresholdsCrossed).toEqual([]);
    expect(result.systemsKnockedOut).toBe(0);
    expect(target.system.hull.damage).toBe(3);
  });

  it("runs a threshold check and knocks out systems when a row completes", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const target = fakeTarget({
      screens: 0, thrust: 4, fcs: 1, pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: [{ kind: "beam", destroyed: false }]
    });
    // 6 damage completes row 1 -> 1st threshold, killOn 6; 3 systems, faces 6,1,1.
    const result = await applyDamageAndThreshold(target, 6, scriptedDice([[6, 1, 1]]));
    expect(result.thresholdsCrossed).toEqual([1]);
    expect(result.systemsKnockedOut).toBe(1);
  });

  it("applies K-gun piercing hits per-hit: 1 DP to armour, remainder to hull", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const target = fakeTarget({
      screens: 0, thrust: 4, fcs: 1, pds: 0,
      armour: { boxes: 3, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    });
    // Two K-gun hits of 6 DP each. Per-hit pierce: each spends exactly 1 on armour,
    // 5 to hull. Armour -> 2 damage, hull -> 10. (A single pooled 12 would instead
    // spend all 3 armour and put only 9 on hull -- the pierce is why we keep hits.)
    const result = await applyDamageAndThreshold(target, 0, scriptedDice([]), [6, 6]);
    expect(target.system.armour.damage).toBe(2);
    expect(target.system.hull.damage).toBe(10);
    expect(result.destroyed).toBe(false);
  });

  it("combines an armour-eligible beam pool with K-gun piercing hits in one pass", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const target = fakeTarget({
      screens: 0, thrust: 4, fcs: 1, pds: 0,
      armour: { boxes: 3, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    });
    // Beam pool 4 spends armour normally (3 armour + 1 hull). Then one K-gun hit of
    // 6: armour already exhausted, so all 6 pierce to hull. Hull = 1 + 6 = 7.
    await applyDamageAndThreshold(target, 4, scriptedDice([]), [6]);
    expect(target.system.armour.damage).toBe(3);
    expect(target.system.hull.damage).toBe(7);
  });

  it("skips the threshold check when the ship is destroyed outright", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const target = fakeTarget({
      screens: 0, thrust: 4, fcs: 1, pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 4, damage: 0, rows: 2 },
      weapons: []
    });
    const result = await applyDamageAndThreshold(target, 4, scriptedDice([[6, 6, 6]]));
    expect(result.destroyed).toBe(true);
    expect(result.systemsKnockedOut).toBe(0);
  });
});
