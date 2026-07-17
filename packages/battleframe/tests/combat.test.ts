import { describe, expect, it } from "vitest";
import {
  MissingCombatBaseError,
  createBattleframeCombatClass,
  getOrder,
  orderedCombatants,
} from "../src/combat/battleframe-combat";
import {
  MissingCombatTrackerBaseError,
  createBattleframeCombatTrackerClass,
  registerBattleframeCombatTracker,
} from "../src/combat/tracker";
import type { CombatLike, CombatantLike } from "../src/combat/types";

class FakeCombat {
  combatants: CombatantLike[];
  flags?: CombatLike["flags"];

  constructor(data: { combatants: CombatantLike[]; flags?: CombatLike["flags"] }) {
    this.combatants = data.combatants;
    this.flags = data.flags;
  }
}

class FakeCombatTrackerBase {
  viewed?: CombatLike;
}

function makeCombatant(id: string): CombatantLike {
  return { id, initiative: null };
}

describe("getOrder / orderedCombatants", () => {
  it("reads order from combat.flags.battleframe.order", () => {
    const combat: CombatLike = {
      combatants: [makeCombatant("a"), makeCombatant("b")],
      flags: { battleframe: { order: ["b", "a"] } },
    };

    expect(getOrder(combat)).toEqual(["b", "a"]);
    expect(orderedCombatants(combat).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("defaults to an empty order when the flag is absent", () => {
    const combat: CombatLike = { combatants: [makeCombatant("a")] };

    expect(getOrder(combat)).toEqual([]);
    expect(orderedCombatants(combat)).toEqual([]);
  });

  it("renders an empty tracker for an empty order array, even with combatants present", () => {
    const combat: CombatLike = {
      combatants: [makeCombatant("a"), makeCombatant("b")],
      flags: { battleframe: { order: [] } },
    };

    expect(orderedCombatants(combat)).toEqual([]);
  });

  it("drops order ids that no longer resolve to a combatant", () => {
    const combat: CombatLike = {
      combatants: [makeCombatant("a")],
      flags: { battleframe: { order: ["a", "ghost"] } },
    };

    expect(orderedCombatants(combat).map((c) => c.id)).toEqual(["a"]);
  });

  it("re-derives order from the flag on every call, reflecting mid-round changes", () => {
    const combat: CombatLike = {
      combatants: [makeCombatant("a"), makeCombatant("b")],
      flags: { battleframe: { order: ["a", "b"] } },
    };

    expect(orderedCombatants(combat).map((c) => c.id)).toEqual(["a", "b"]);

    combat.flags = { battleframe: { order: ["b", "a"] } };

    expect(orderedCombatants(combat).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("survives a world reload (JSON round-trip) with order and state intact", () => {
    const combat: CombatLike = {
      combatants: [makeCombatant("a"), makeCombatant("b")],
      flags: { battleframe: { order: ["b", "a"] } },
    };

    const reloaded: CombatLike = JSON.parse(JSON.stringify(combat));

    expect(getOrder(reloaded)).toEqual(["b", "a"]);
    expect(orderedCombatants(reloaded).map((c) => c.id)).toEqual(["b", "a"]);
    expect(reloaded.combatants.every((c) => c.initiative === null)).toBe(true);
  });
});

describe("createBattleframeCombatClass", () => {
  it("throws MissingCombatBaseError when no Combat global or base is available", () => {
    expect(() => createBattleframeCombatClass()).toThrow(MissingCombatBaseError);
  });

  it("never writes a number to combatant.initiative via setInitiative", async () => {
    const BattleframeCombat = createBattleframeCombatClass(FakeCombat as any);
    const combat = new (BattleframeCombat as any)({
      combatants: [makeCombatant("c1")],
    }) as InstanceType<typeof FakeCombat> & { setInitiative: (...args: unknown[]) => Promise<void> };

    await combat.setInitiative("c1", 99);

    expect(combat.combatants[0].initiative).toBeNull();
  });

  it("exposes the order flag via getBattleframeOrder, reading only", () => {
    const BattleframeCombat = createBattleframeCombatClass(FakeCombat as any);
    const combat = new (BattleframeCombat as any)({
      combatants: [makeCombatant("c1")],
      flags: { battleframe: { order: ["c1"] } },
    }) as InstanceType<typeof FakeCombat> & { getBattleframeOrder: () => string[] };

    expect(combat.getBattleframeOrder()).toEqual(["c1"]);
    expect(typeof (combat as unknown as { setOrder?: unknown }).setOrder).toBe(
      "undefined"
    );
  });
});

describe("createBattleframeCombatTrackerClass", () => {
  it("throws MissingCombatTrackerBaseError when no base is available", () => {
    expect(() => createBattleframeCombatTrackerClass()).toThrow(
      MissingCombatTrackerBaseError
    );
  });

  it("renders combatants in the order given by the flag", async () => {
    const Tracker = createBattleframeCombatTrackerClass(
      FakeCombatTrackerBase as any
    );
    const tracker = new (Tracker as any)() as InstanceType<
      typeof FakeCombatTrackerBase
    > & {
      _prepareTrackerContext: (
        context: { combatants: CombatantLike[] },
        options: unknown
      ) => Promise<{ combatants: CombatantLike[] }>;
    };

    tracker.viewed = {
      combatants: [makeCombatant("a"), makeCombatant("b")],
      flags: { battleframe: { order: ["b", "a"] } },
    };

    const context = await tracker._prepareTrackerContext(
      { combatants: [] },
      {}
    );

    expect(context.combatants.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("reflects an order change mid-round on the next render", async () => {
    const Tracker = createBattleframeCombatTrackerClass(
      FakeCombatTrackerBase as any
    );
    const tracker = new (Tracker as any)() as InstanceType<
      typeof FakeCombatTrackerBase
    > & {
      _prepareTrackerContext: (
        context: { combatants: CombatantLike[] },
        options: unknown
      ) => Promise<{ combatants: CombatantLike[] }>;
    };

    const combat: CombatLike = {
      combatants: [makeCombatant("a"), makeCombatant("b")],
      flags: { battleframe: { order: ["a", "b"] } },
    };
    tracker.viewed = combat;

    const first = await tracker._prepareTrackerContext({ combatants: [] }, {});
    expect(first.combatants.map((c) => c.id)).toEqual(["a", "b"]);

    combat.flags = { battleframe: { order: ["b", "a"] } };

    const second = await tracker._prepareTrackerContext({ combatants: [] }, {});
    expect(second.combatants.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("renders an empty tracker without error when the order array is empty", async () => {
    const Tracker = createBattleframeCombatTrackerClass(
      FakeCombatTrackerBase as any
    );
    const tracker = new (Tracker as any)() as InstanceType<
      typeof FakeCombatTrackerBase
    > & {
      _prepareTrackerContext: (
        context: { combatants: CombatantLike[] },
        options: unknown
      ) => Promise<{ combatants: CombatantLike[] }>;
    };

    tracker.viewed = {
      combatants: [makeCombatant("a")],
      flags: { battleframe: { order: [] } },
    };

    const context = await tracker._prepareTrackerContext(
      { combatants: [] },
      {}
    );

    expect(context.combatants).toEqual([]);
  });

  it("renders an empty tracker without error when there is no viewed combat", async () => {
    const Tracker = createBattleframeCombatTrackerClass(
      FakeCombatTrackerBase as any
    );
    const tracker = new (Tracker as any)() as InstanceType<
      typeof FakeCombatTrackerBase
    > & {
      _prepareTrackerContext: (
        context: { combatants: CombatantLike[] },
        options: unknown
      ) => Promise<{ combatants: CombatantLike[] }>;
    };

    const context = await tracker._prepareTrackerContext(
      { combatants: [] },
      {}
    );

    expect(context.combatants).toEqual([]);
  });
});

describe("registerBattleframeCombatTracker", () => {
  it("registers the tracker class via CONFIG.ui.combat", () => {
    const fakeConfig: { ui?: { combat?: unknown } } = {};
    (globalThis as unknown as { CONFIG?: unknown }).CONFIG = fakeConfig;
    (globalThis as unknown as { CombatTracker?: unknown }).CombatTracker =
      FakeCombatTrackerBase;

    try {
      registerBattleframeCombatTracker();

      expect(typeof fakeConfig.ui?.combat).toBe("function");
    } finally {
      delete (globalThis as unknown as { CONFIG?: unknown }).CONFIG;
      delete (globalThis as unknown as { CombatTracker?: unknown }).CombatTracker;
    }
  });
});
