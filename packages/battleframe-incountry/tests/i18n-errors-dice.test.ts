import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODULE_ID, SETTING_DIE_SIZE } from "../src/constants";
import { resolveAttack } from "../src/combat/resolve";
import { resolveUnitAttack } from "../src/round/attack-flow";
import { DieSizeNotSetError } from "../src/settings";
import { createRoundsApi } from "../../battleframe/src/rounds/activation";
import { beginRound, resolveActivation, type RoundControlUnit } from "../src/ui/round-control";
import { registerInCountryRuleset } from "../src/main";

/**
 * Text that reached players unlocalized (2026-11-21 audit): dice-roll flavors on
 * chat rolls, activation and setup errors shown as toasts, and the
 * registration-failure toast. The stub hands back `[key]`.
 */

const i18n = { localize: (k: string) => `[${k}]`, format: (k: string) => `[${k}]` };
beforeEach(() => {
  vi.stubGlobal("game", {
    i18n,
    settings: { register: () => {}, get: (ns: string, key: string) => (ns === MODULE_ID && key === SETTING_DIE_SIZE ? 10 : undefined) }
  });
});
afterEach(() => vi.unstubAllGlobals());

function recordingDice(faces: number[] = []) {
  const flavors: string[] = [];
  return {
    flavors,
    async roll(_f: string, _d: unknown, options?: { flavor?: string }) {
      flavors.push(options?.flavor ?? "");
      return { total: faces.shift() ?? 1 };
    },
    async rollPool(count: number, _size: number, options?: { flavor?: string }) {
      flavors.push(options?.flavor ?? "");
      return Array(Math.max(0, count)).fill(1);
    }
  };
}

const system = (extra: Record<string, unknown> = {}) => ({
  modelCount: 2, modelsRemaining: 2, move: 6, morale: 1, attackClear: 9, attackCover: 9,
  armorModifier: 0, armorDice: 1, suppressed: false,
  weapons: [{ name: "Rifle", count: 1, dmg: 5, attackDice: 1, owDice: 0 }], ...extra
});

describe("InCountry localizes its dice labels and error toasts", () => {
  it("attack, armor and suppression rolls", async () => {
    const dice = recordingDice();
    await resolveAttack({ dice: dice as never, attackDice: 1, attackValue: 9, weaponDmg: 5, armorDice: 1, armorModifier: 0, flavorPrefix: "A" });
    await resolveUnitAttack({
      dice: dice as never,
      attacker: system() as never,
      weapon: system().weapons[0] as never,
      target: system() as never,
      inCover: false
    });
    expect(dice.flavors.length).toBeGreaterThan(3);
    for (const f of dice.flavors) expect(f, f).toMatch(/^\[battleframe-incountry\.dice\./);
  });

  it("initiative rolls and an out-of-turn activation", async () => {
    const dice = recordingDice([1, 5]);
    const a1: RoundControlUnit = { id: "a1", name: "a1", sideId: "A", actor: { system: system() as never } };
    const b1: RoundControlUnit = { id: "b1", name: "b1", sideId: "B", actor: { system: system() as never } };
    const { order } = await beginRound({ units: [a1, b1], dice: dice as never, roundsApi: createRoundsApi(), rng: () => 0 });
    for (const f of dice.flavors) expect(f).toBe("[battleframe-incountry.dice.initiative]");
    await expect(
      resolveActivation({ order, attacker: b1, target: null, dice: dice as never, units: [a1, b1] })
    ).rejects.toThrow("[battleframe-incountry.errors.notYourTurn]");
  });

  it("the die-size error and the registration-failure toast", () => {
    expect(new DieSizeNotSetError().message).toContain("[battleframe-incountry.errors.dieSizeNotSet]");
    const error = vi.fn();
    vi.stubGlobal("ui", { notifications: { error } });
    expect(() => registerInCountryRuleset()).toThrow();
    expect(error.mock.calls[0][0]).toContain("[battleframe-incountry.errors.registrationFailed]");
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
      const value = key.split(".").reduce((node: any, part) => node?.[part], lang["battleframe-incountry"]);
      expect(value, key).toBeTypeOf("string");
    }
  });
});
