import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireFighterGroupAtTarget, type FighterFireContext } from "../src/combat/fire-fighters";
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

  it("scores against the target's REMAINING screen level, not its design level", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    // Screen level 2 designed but both generators knocked out -> defends unscreened.
    const target = fakeTarget({
      screens: 2, screensLost: 2, thrust: 0, fcs: 0, pds: 0,
      armour: { boxes: 0, damage: 0 },
      hull: { boxes: 18, damage: 0, rows: 3 },
      weapons: []
    });
    // Size 6 faces all 6: unscreened 2 each = 12; at level 2 each 6 = 1 -> 6.
    const ctx = context(4, 0, scriptedDice([[6, 6, 6, 6, 6, 6]]));

    const report = await fireFighterGroupAtTarget({ group, target, context: ctx });
    expect(report.totalDamage).toBe(12); // unscreened, not the level-2 value of 6
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

  it("an Ace group rolls one extra attack die", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const ace = fakeGroup({ size: 6, pilotQuality: "ace" });
    const target = targetHull();
    // A full-strength Ace throws 7 dice (6 fighters + 1); seven 4s -> 1 damage each = 7.
    // A standard size-6 group would only roll 6 -> 6 damage.
    const ctx = context(4, 0, scriptedDice([[4, 4, 4, 4, 4, 4, 4]]));
    const report = await fireFighterGroupAtTarget({ group: ace, target, context: ctx });
    expect(report.fired).toBe(true);
    expect(report.totalDamage).toBe(7);
  });

  it("an Ace group gets -1 on its morale roll", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const ace = fakeGroup({ size: 4, pilotQuality: "ace", endurance: 3 });
    const target = targetHull();
    // Morale die 5: a standard group at size 4 would FAIL (5 > 4); the Ace's -1
    // makes it 4 <= 4 -> pass. Then it throws 5 dice (4 + Ace extra): four 4s + a 1
    // -> 1+1+1+1+0 = 4 damage. (Only 5 attack faces are supplied, proving 5 dice.)
    const ctx = context(4, 0, scriptedDice([[5], [4, 4, 4, 4, 1]]));
    const report = await fireFighterGroupAtTarget({ group: ace, target, context: ctx });
    expect(report.fired).toBe(true);
    expect(report.totalDamage).toBe(4);
  });

  it("a Turkey group adds +1 to its morale roll (and must roll even at full strength)", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const turkey = fakeGroup({ size: 6, pilotQuality: "turkey", endurance: 3 });
    const target = targetHull();
    // A full-strength Turkey still rolls morale. Die 6: standard would pass (6 <= 6),
    // but the Turkey's +1 makes it 7 > 6 -> fail. No attack dice are rolled.
    const ctx = context(4, 0, scriptedDice([[6], [4, 4, 4, 4, 4, 4]]));
    const report = await fireFighterGroupAtTarget({ group: turkey, target, context: ctx });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("morale");
    expect(target.system.hull.damage).toBe(0);
  });

  it("a Turkey group breaks after only TWO consecutive failed checks", async () => {
    vi.stubGlobal("CONFIG", { specialStatusEffects: { DEFEATED: "dead" } });
    const turkey = fakeGroup({ size: 2, pilotQuality: "turkey", moraleFails: 1 }); // one prior fail
    // Morale die 3: +1 -> 4 > size 2 -> fail; that is the SECOND consecutive fail,
    // which breaks a Turkey (vs three for average).
    const report = await fireFighterGroupAtTarget({ group: turkey, target: targetHull(), context: context(4, 0, scriptedDice([[3]])) });
    expect(report.reason).toBe("morale");
    expect(turkey.system.moraleFails).toBe(2);
    expect(turkey.system.moraleBroken).toBe(true);
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
