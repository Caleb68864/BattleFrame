import { describe, expect, it } from "vitest";
import { resolveDogfight, type DogfightContext } from "../src/combat/dogfight";

function scriptedDice(pools: number[][]): DogfightContext["dice"] {
  const queue = [...pools];
  return { rollPool: async (count: number) => (queue.shift() ?? []).slice(0, count) };
}

function group(size: number) {
  const system = { size };
  return {
    token: {},
    system,
    update: (data: Record<string, unknown>) => {
      if (typeof data["system.size"] === "number") system.size = data["system.size"] as number;
      return Promise.resolve();
    }
  };
}

function ctx(distance: number, aToB: number, bToA: number, dice: DogfightContext["dice"]): DogfightContext {
  return {
    measure: { between: () => ({ distance }) },
    facing: { bearingOf: (o: any) => (o.__id === "b" ? bToA : aToB) },
    dice
  };
}

describe("resolveDogfight", () => {
  it("both groups fire simultaneously when each bears on the other", async () => {
    const a = group(6);
    const b = group(6);
    (a as any).__id = "a";
    (b as any).__id = "b";
    (a.token as any).__id = "a";
    (b.token as any).__id = "b";
    // a rolls 6,5,4,1,1,1 -> 2+1+1 = 4 kills on b; b rolls 6,6,1,1,1,1 -> 4 kills on a.
    const c = ctx(4, 0, 0, scriptedDice([[6, 5, 4, 1, 1, 1], [6, 6, 1, 1, 1, 1]]));
    const report = await resolveDogfight({ attacker: a, defender: b, context: c });

    expect(report.fired).toBe(true);
    expect(report.attackerKills).toBe(4);
    expect(report.defenderKills).toBe(4);
    expect(b.system.size).toBe(2); // 6 - 4
    expect(a.system.size).toBe(2); // 6 - 4
  });

  it("the defender does not return fire if the attacker is not in its fore arc", async () => {
    const a = group(6);
    const b = group(3);
    (a.token as any).__id = "a";
    (b.token as any).__id = "b";
    // a bears on b (0); b's bearing to a is 180 (not fore) -> no return fire.
    const c = ctx(4, 0, 180, scriptedDice([[6, 6, 6, 1, 1, 1]]));
    const report = await resolveDogfight({ attacker: a, defender: b, context: c });

    expect(report.defenderReturned).toBe(false);
    expect(report.defenderKills).toBe(0);
    expect(a.system.size).toBe(6); // untouched
  });

  it("refuses beyond 6mu", async () => {
    const a = group(6);
    const b = group(6);
    const report = await resolveDogfight({ attacker: a, defender: b, context: ctx(7, 0, 0, scriptedDice([])) });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("out-of-range");
  });

  it("refuses when the attacker cannot bring the target into its fore arc", async () => {
    const a = group(6);
    const b = group(6);
    const report = await resolveDogfight({ attacker: a, defender: b, context: ctx(4, 120, 0, scriptedDice([])) });
    expect(report.fired).toBe(false);
    expect(report.reason).toBe("out-of-arc");
  });

  it("a Turkey attacker subtracts 1 from each of its dogfight dice", async () => {
    const a = group(6);
    (a.system as any).pilotQuality = "turkey";
    const b = group(6);
    (a.token as any).__id = "a";
    (b.token as any).__id = "b";
    // Defender bears 180 -> no return fire. Attacker faces 6,5,5,1,1,1: a standard
    // group scores 2+1+1 = 4 kills; the Turkey's -1/die makes them 5,4,4,0,0,0 ->
    // 1+1+1 = 3 kills.
    const c = ctx(4, 0, 180, scriptedDice([[6, 5, 5, 1, 1, 1]]));
    const report = await resolveDogfight({ attacker: a, defender: b, context: c });
    expect(report.attackerKills).toBe(3);
    expect(report.defenderReturned).toBe(false);
    expect(b.system.size).toBe(3); // 6 - 3
  });
});
