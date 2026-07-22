import { afterEach, describe, expect, it, vi } from "vitest";
import { fireShipSplit } from "../src/combat/fire-ship-split";
import type { FireContext } from "../src/combat/fire-ship";

afterEach(() => vi.unstubAllGlobals());

// A dice pool that serves scripted results in order, mirroring fire-ship.test.ts.
function scriptedDice(pools: number[][]): FireContext["dice"] {
  const queue = [...pools];
  return {
    rollPool: async (count: number) => (queue.shift() ?? []).slice(0, count)
  };
}

// The same fake ship builder shape used by fire-ship.test.ts: writes are applied
// back onto `system` so later reads see post-update state, as Foundry does.
function fakeShip(system: Record<string, any>, extra: Record<string, unknown> = {}) {
  const updates: Record<string, unknown>[] = [];
  return {
    token: { id: system.__id ?? "t" },
    system,
    updates,
    update: (data: Record<string, unknown>) => {
      updates.push(data);
      for (const [key, value] of Object.entries(data)) {
        const path = key.replace(/^system\./, "").split(".");
        let node: any = system;
        for (let i = 0; i < path.length - 1; i++) node = node[path[i]] ??= {};
        node[path[path.length - 1]] = value;
      }
      return Promise.resolve();
    },
    toggleStatusEffect: () => Promise.resolve(),
    ...extra
  };
}

// A per-target geometry context: distance/bearing are keyed off the target
// token's id, so one context serves a multi-target split. `centre-to-centre`
// mode is asserted where it matters.
function splitContext(
  geometry: Record<string, { distance: number; bearing: number }>,
  dice: FireContext["dice"]
): FireContext {
  return {
    measure: {
      between: (_a: unknown, b: any) => ({ distance: geometry[b?.id]?.distance ?? 0 })
    },
    facing: { bearingOf: (_a: unknown, b: any) => geometry[b?.id]?.bearing ?? 0 },
    dice
  };
}

// An undamaged target big enough to absorb a few points without a threshold.
function fatTarget(id: string) {
  return fakeShip(
    {
      __id: id,
      screens: 0,
      thrust: 0,
      fcs: 0,
      pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    },
    { name: id }
  );
}

describe("fireShipSplit", () => {
  it("splits weapons across two targets, one FCS each, by arc", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // Weapon 0 bears only fore (target A); weapon 1 bears only aft (target B).
    const attacker = fakeShip({
      screens: 0,
      fcs: 2,
      weapons: [
        { kind: "beam", weaponClass: 3, arcs: ["F"], destroyed: false, spent: false },
        { kind: "beam", weaponClass: 3, arcs: ["A"], destroyed: false, spent: false }
      ]
    });
    const targetA = fatTarget("A");
    const targetB = fatTarget("B");
    // A dead ahead (bearing 0), B dead astern (bearing 180); both at 10mu -> 3 dice.
    const ctx = splitContext(
      { A: { distance: 10, bearing: 0 }, B: { distance: 10, bearing: 180 } },
      // First pool -> target A's weapon 0; second -> target B's weapon 1. 6,4,2 = 3 dmg.
      scriptedDice([[6, 4, 2], [6, 4, 2]])
    );

    const result = await fireShipSplit({
      attacker,
      targets: [targetA, targetB],
      context: ctx
    });

    expect(result.fcsCount).toBe(2);
    expect(result.perTarget).toHaveLength(2);

    const repA = result.perTarget.find((r) => r.targetId === "A")!;
    const repB = result.perTarget.find((r) => r.targetId === "B")!;

    expect(repA.distance).toBe(10);
    expect(repA.bearing).toBe(0);
    expect(repA.totalDamage).toBe(3);
    expect(repA.shots[0].index).toBe(0); // weapon 0 -> target A
    expect(repA.destroyed).toBe(false);

    expect(repB.bearing).toBe(180);
    expect(repB.totalDamage).toBe(3);
    // Weapon 1 fired at B; its shot index must be the REAL mount index 1, not the
    // sub-list index 0.
    expect(repB.shots[0].index).toBe(1);

    // Damage was applied per target.
    expect(targetA.system.hull.damage).toBe(3);
    expect(targetB.system.hull.damage).toBe(3);

    expect(result.unassigned).toHaveLength(0);
  });

  it("refuses to fire when the attacker has lost all fire control", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const attacker = fakeShip({
      screens: 0,
      fcs: 0, // all fire control gone
      weapons: [{ kind: "beam", weaponClass: 3, arcs: ["F"], destroyed: false, spent: false }]
    });
    const target = fatTarget("A");
    const ctx = splitContext({ A: { distance: 10, bearing: 0 } }, scriptedDice([[6, 6, 6]]));

    const result = await fireShipSplit({ attacker, targets: [target], context: ctx });

    expect(result.refused).toBe("no-fcs");
    expect(result.fcsCount).toBe(0);
    expect(result.perTarget).toHaveLength(0);
    expect(result.unassigned).toHaveLength(0);
    expect(target.system.hull.damage).toBe(0); // no damage applied
  });

  it("marks a spent submunition at its REAL mount index, not the sub-list index", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // Weapon 0 (beam) bears fore -> target A; weapon 1 (submunition) bears aft ->
    // target B. In target B's sub-list the submunition is at index 0, but it must
    // be marked spent at real mount index 1.
    const attacker = fakeShip({
      screens: 0,
      fcs: 2,
      weapons: [
        { kind: "beam", weaponClass: 3, arcs: ["F"], destroyed: false, spent: false },
        { kind: "submunition", arcs: ["A"], destroyed: false, spent: false }
      ]
    });
    const targetA = fatTarget("A");
    const targetB = fatTarget("B");
    const ctx = splitContext(
      { A: { distance: 10, bearing: 0 }, B: { distance: 5, bearing: 180 } },
      // A: beam 3 dice; B: submunition at 5mu -> 3 dice ignoring screens.
      scriptedDice([[6, 4, 2], [6, 5, 4]])
    );

    const result = await fireShipSplit({
      attacker,
      targets: [targetA, targetB],
      context: ctx
    });

    // Submunition marked spent at real index 1, beam at index 0 untouched.
    expect(attacker.system.weapons[1].spent).toBe(true);
    expect(attacker.system.weapons[0].spent).toBe(false);
    // Exactly one update carrying the real-index spent path.
    const spentWrites = attacker.updates.filter((u) =>
      Object.keys(u).some((k) => k.endsWith(".spent"))
    );
    expect(spentWrites).toHaveLength(1);
    expect(spentWrites[0]).toHaveProperty("system.weapons.1.spent", true);
    expect(spentWrites[0]).not.toHaveProperty("system.weapons.0.spent");

    const repB = result.perTarget.find((r) => r.targetId === "B")!;
    expect(repB.shots[0].index).toBe(1);
  });

  it("measures range centre-to-centre for each target", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const attacker = fakeShip({
      screens: 0,
      fcs: 1,
      weapons: [{ kind: "beam", weaponClass: 1, arcs: ["F"], destroyed: false, spent: false }]
    });
    const target = fatTarget("A");
    const modes: (string | undefined)[] = [];
    const ctx: FireContext = {
      measure: {
        between: (_a, _b, mode) => {
          modes.push(mode);
          return { distance: 5 };
        }
      },
      facing: { bearingOf: () => 0 },
      dice: scriptedDice([[4]])
    };

    await fireShipSplit({ attacker, targets: [target], context: ctx });

    expect(modes).toContain("centre-to-centre");
  });
});
