import { afterEach, describe, expect, it, vi } from "vitest";
import { fireShipAtTarget, type FireContext } from "../src/combat/fire-ship";

afterEach(() => vi.unstubAllGlobals());

function scriptedDice(pools: number[][]): FireContext["dice"] {
  const queue = [...pools];
  return {
    rollPool: async (count: number) => (queue.shift() ?? []).slice(0, count)
  };
}

function fakeShip(system: Record<string, any>) {
  const updates: Record<string, unknown>[] = [];
  return {
    token: { id: system.__id ?? "t" },
    system,
    updates,
    update: (data: Record<string, unknown>) => {
      updates.push(data);
      // Reflect the write so a later read sees post-update state, as Foundry does.
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

function context(distance: number, bearing: number, dice: FireContext["dice"]): FireContext {
  return {
    measure: { between: () => ({ distance }) },
    facing: { bearingOf: () => bearing },
    dice
  };
}

describe("fireShipAtTarget", () => {
  it("measures range and bearing, resolves fire, and applies damage to the target", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const attacker = fakeShip({
      screens: 0,
      weapons: [{ kind: "beam", weaponClass: 3, arcs: ["F"], destroyed: false, spent: false }]
    });
    const target = fakeShip({
      screens: 0,
      thrust: 0,
      fcs: 0,
      pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    });
    // Class 3 at 10mu -> 3 dice: 6,4,2 -> 3 damage. No threshold at 3 dmg.
    const ctx = context(10, 0, scriptedDice([[6, 4, 2]]));

    const report = await fireShipAtTarget({ attacker, target, context: ctx });

    expect(report.totalDamage).toBe(3);
    expect(target.system.hull.damage).toBe(3);
    expect(report.destroyed).toBe(false);
  });

  it("runs a threshold check when the attack completes a hull row", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const attacker = fakeShip({
      screens: 0,
      weapons: [{ kind: "beam", weaponClass: 3, arcs: ["F"], destroyed: false, spent: false }]
    });
    const target = fakeShip({
      screens: 0,
      thrust: 4,
      fcs: 1,
      pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: [{ kind: "beam", weaponClass: 2, arcs: ["F"], destroyed: false }]
    });
    // Beam pool 6,6,6 = 6 damage -> completes 1st row (boundary 6) -> 1st threshold.
    // Then a threshold die per surviving system (weapon, fcs, drive = 3 systems),
    // killOn 6: faces 6,1,1 -> the weapon is knocked out.
    const ctx = context(6, 0, scriptedDice([[6, 6, 6], [6, 1, 1]]));

    const report = await fireShipAtTarget({ attacker, target, context: ctx });

    expect(report.totalDamage).toBe(6);
    expect(report.thresholdsCrossed).toEqual([1]);
    expect(report.systemsKnockedOut).toBe(1);
    expect(target.system.weapons[0].destroyed).toBe(true);
  });

  it("marks one-shot weapons spent on the attacker", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const attacker = fakeShip({
      screens: 0,
      weapons: [{ kind: "submunition", arcs: ["F"], destroyed: false, spent: false }]
    });
    const target = fakeShip({
      screens: 0,
      thrust: 0,
      fcs: 0,
      pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    });
    // Submunition at 5mu -> 3 dice 6,5,4 ignoring screens -> 4 damage.
    const ctx = context(5, 0, scriptedDice([[6, 5, 4]]));

    await fireShipAtTarget({ attacker, target, context: ctx });

    expect(attacker.system.weapons[0].spent).toBe(true);
  });

  it("does no threshold check when the attack destroys the ship outright", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const attacker = fakeShip({
      screens: 0,
      weapons: [{ kind: "beam", weaponClass: 3, arcs: ["F"], destroyed: false, spent: false }]
    });
    const target = fakeShip({
      screens: 0,
      thrust: 4,
      fcs: 1,
      pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 4, damage: 0, rows: 2 },
      weapons: []
    });
    const ctx = context(6, 0, scriptedDice([[6, 6, 6]]));

    const report = await fireShipAtTarget({ attacker, target, context: ctx });

    expect(report.destroyed).toBe(true);
    expect(report.systemsKnockedOut).toBe(0);
  });
});
