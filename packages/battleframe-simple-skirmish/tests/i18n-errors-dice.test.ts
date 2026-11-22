import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAttack } from "../src/combat/resolve";
import { beginRound, resolveActivation, type RoundControlUnit } from "../src/ui/round-control";
import { registerSimpleSkirmishRuleset } from "../src/main";

/**
 * Text that reached players unlocalized (2026-11-21 audit): dice-roll flavors on
 * chat rolls, activation errors shown as toasts, and the registration-failure
 * toast. The stub hands back `[key]`, so anything that skipped localization
 * shows up as English.
 */

beforeEach(() => {
  vi.stubGlobal("game", {
    i18n: { localize: (k: string) => `[${k}]`, format: (k: string) => `[${k}]` }
  });
});
afterEach(() => vi.unstubAllGlobals());

function recordingDice() {
  const flavors: string[] = [];
  return {
    flavors,
    async roll(_f: string, _d: unknown, options?: { flavor?: string }) {
      flavors.push(options?.flavor ?? "");
      return { total: flavors.length % 2 ? 6 : 1 };
    }
  };
}

function unit(id: string, playerId: string, system: Record<string, unknown>): RoundControlUnit {
  return { id, playerId, token: { id }, actor: { system: { models: 1, move: 6, ...system }, async update() {} } };
}

describe("Simple Skirmish localizes its dice labels and error toasts", () => {
  it("attack and save rolls", async () => {
    const dice = recordingDice();
    await resolveAttack({ dice: dice as never, models: 2, attackTarget: 1, saveTarget: 7, type: "melee", flavorPrefix: "A" });
    expect(dice.flavors.length).toBeGreaterThan(1);
    for (const f of dice.flavors) expect(f, f).toMatch(/^\[battleframe-simple-skirmish\.dice\./);
  });

  it("initiative rolls", async () => {
    const dice = recordingDice();
    await beginRound({ units: [unit("a1", "a", {}), unit("b1", "b", {})], dice: dice as never });
    for (const f of dice.flavors) expect(f, f).toBe("[battleframe-simple-skirmish.dice.initiative]");
  });

  it("an out-of-turn activation's message", async () => {
    const a1 = unit("a1", "a", {});
    const b1 = unit("b1", "b", {});
    const dice = recordingDice(); // a rolls 6, b rolls 1: a first
    const { round } = await beginRound({ units: [a1, b1], dice: dice as never });
    await expect(
      resolveActivation({ round, attacker: b1, target: null, type: null, dice: dice as never, units: [a1, b1] })
    ).rejects.toThrow("[battleframe-simple-skirmish.errors.notYourTurn]");
  });

  it("the registration-failure toast", () => {
    const error = vi.fn();
    vi.stubGlobal("ui", { notifications: { error } });
    expect(() => registerSimpleSkirmishRuleset()).toThrow();
    expect(error.mock.calls[0][0]).toContain("[battleframe-simple-skirmish.errors.registrationFailed]");
  });
});

describe("every tr() key in the source is in lang/en.json", () => {
  it("has a translation for each literal key", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const lang = JSON.parse(readFileSync(join(__dirname, "..", "lang", "en.json"), "utf8"));
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((e) => (statSync(join(dir, e)).isDirectory() ? walk(join(dir, e)) : e.endsWith(".ts") ? [join(dir, e)] : []));
    const keys = walk(join(__dirname, "..", "src")).flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/\btr\(\s*"([A-Za-z.]+)"/g)].map((m) => m[1])
    );
    expect(keys.length).toBeGreaterThan(10);
    for (const key of keys) {
      const value = key.split(".").reduce((node: any, part) => node?.[part], lang["battleframe-simple-skirmish"]);
      expect(value, key).toBeTypeOf("string");
    }
  });
});
