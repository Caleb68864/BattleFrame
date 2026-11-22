import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import langEn from "../lang/en.json";
import { withDieSize } from "./helpers/world";
import { createRoundsApi } from "../../battleframe/src/rounds/activation";
import { beginRound, buildAttackReportHtml, resolveActivation, type RoundControlUnit } from "../src/ui/round-control";
import type { AttackFlowResult } from "../src/round/attack-flow";

/**
 * The round's chat cards and toasts were raw English (2026-11-21 audit). Every
 * string now names a `battleframe-incountry.report.*` or `.notify.*` key; the
 * English is the fallback when no translation is loaded. The stub below hands
 * back the key, so any string that skipped localization shows up as English.
 */

const SOURCE = readFileSync(resolve(__dirname, "../src/ui/round-control.ts"), "utf8");

function flatten(node: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(node)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, key));
    else out[key] = String(v);
  }
  return out;
}
const lang = flatten(langEn as Record<string, unknown>);

let restore: () => void;
beforeEach(() => {
  restore = withDieSize();
  (globalThis as any).game.i18n = { localize: (k: string) => `[${k}]`, format: (k: string) => `[${k}]` };
});
afterEach(() => {
  restore();
  vi.unstubAllGlobals();
});

function attack(overrides: Partial<AttackFlowResult> = {}): AttackFlowResult {
  return {
    attack: { attackerFaces: [2], hits: 1, attackTotal: 2, damage: 5, armorFaces: [3], armorTotal: 4, destroyed: true },
    targetModelsAfter: 0,
    targetDestroyed: true,
    suppressed: true,
    suppressionRoll: 7,
    ...overrides
  } as AttackFlowResult;
}

describe("the round localizes what players read", () => {
  it("the attack card: every line is a key", () => {
    const html = buildAttackReportHtml(attack({ targetDestroyed: false, targetModelsAfter: 1 }), { attacker: "A", target: "B" });
    const text = html.replace(/<[^>]+>/g, " ");
    expect(text).not.toMatch(/hit\(s\)|Armor|model holds|model destroyed|Model down|Suppression check|wiped/);
    expect(html).toContain("[battleframe-incountry.report.hits]");
  });

  it("the round-over card and the activation toasts", async () => {
    const posted: { title?: string }[] = [];
    const notes: string[] = [];
    const sys = (extra: Record<string, unknown> = {}) => ({
      modelCount: 1, modelsRemaining: 1, move: 6, morale: 1, attackClear: 9, attackCover: 9,
      armorModifier: 0, armorDice: 0, suppressed: false,
      weapons: [{ name: "Rifle", count: 1, dmg: 1, attackDice: 1, owDice: 0 }], ...extra
    });
    const a1: RoundControlUnit = { id: "a1", name: "a1", sideId: "A", actor: { system: sys() as never } };
    const b1: RoundControlUnit = { id: "b1", name: "b1", sideId: "B", actor: { system: sys() as never } };
    const dice = {
      async roll() { return { total: 1 }; },
      async rollPool(n: number) { return Array(Math.max(0, n)).fill(1); }
    };
    const rolls = [1, 5];
    const initDice = { ...dice, async roll() { return { total: rolls.shift() ?? 1 }; } };
    const { order } = await beginRound({ units: [a1, b1], dice: initDice as never, roundsApi: createRoundsApi(), rng: () => 0 });

    await resolveActivation({
      order, attacker: a1, target: b1, dice: dice as never, units: [a1, b1],
      applyState: async (u, s) => { (u.actor.system as any).modelsRemaining = s.modelsRemaining; },
      notify: (m) => notes.push(m),
      postCard: (spec) => { posted.push(spec); }
    });
    await resolveActivation({ order, attacker: b1, target: null, dice: dice as never, units: [a1, b1], notify: (m) => notes.push(m), postCard: (spec) => { posted.push(spec); } }).catch(() => undefined);

    for (const note of notes) expect(note, note).toMatch(/^\[battleframe-incountry\./);
    expect(posted.some((p) => p.title === "[battleframe-incountry.report.roundOver]")).toBe(true);
  });

  it("every report/notify key the source names is in lang/en.json", () => {
    const used = [...SOURCE.matchAll(/tr\("((?:report|notify)\.[A-Za-z.]+)"/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(10);
    for (const key of used) expect(lang[`battleframe-incountry.${key}`], key).toBeTypeOf("string");
  });

  it("the ready toast's state word is localized", () => {
    expect(SOURCE).not.toMatch(/"READY"\s*:\s*"not ready"/);
  });
});
