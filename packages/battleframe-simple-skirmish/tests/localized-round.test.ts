import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import langEn from "../lang/en.json";
import { beginRound, buildCombatReportHtml, buildVictoryHtml, resolveActivation, type RoundControlUnit } from "../src/ui/round-control";

/**
 * The round's chat cards and toasts were raw English (2026-11-21 audit), and the
 * card title printed the raw attack type ("melee") though `attackTypes.*` keys
 * exist. Every string now names a key; English is the fallback when no
 * translation is loaded. The stub hands back the key, so a string that skipped
 * localization shows up as English.
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

beforeEach(() => {
  vi.stubGlobal("game", { i18n: { localize: (k: string) => `[${k}]`, format: (k: string) => `[${k}]` } });
});
afterEach(() => vi.unstubAllGlobals());

function unit(id: string, playerId: string, system: Record<string, unknown>): RoundControlUnit {
  const actor = {
    system: { models: 1, move: 6, ...system },
    async update(data: Record<string, unknown>) {
      const next = data["system.models"];
      if (typeof next === "number") (actor.system as { models: number }).models = next;
    }
  };
  return { id, playerId, token: { id }, actor };
}

describe("the round localizes what players read", () => {
  it("the combat card, including the attack type", () => {
    const html = buildCombatReportHtml({ hits: 2, modelsRemoved: 1, destroyed: true } as never, {
      attacker: "A",
      defender: "B",
      type: "melee"
    });
    const text = html.replace(/<[^>]+>/g, " ");
    expect(text).not.toMatch(/hit\(s\)|removed|destroyed\.|\bmelee\b/);
    expect(html).toContain("[battleframe-simple-skirmish.report.title]");

    // With interpolation, the type in the title is its display name, not the raw id.
    vi.stubGlobal("game", {
      i18n: {
        localize: (k: string) => (k.endsWith("attackTypes.melee") ? "Melee" : `[${k}]`),
        format: (_k: string, d: Record<string, unknown>) => `${d.attacker} ${d.type} ${d.defender ?? ""}`
      }
    });
    const titled = buildCombatReportHtml({ hits: 1, modelsRemoved: 0, destroyed: false } as never, {
      attacker: "A",
      defender: "B",
      type: "melee"
    });
    expect(titled).toContain("A Melee B");
  });

  it("the round-over card", () => {
    for (const victory of [{ result: "winner", playerId: "a" }, { result: "draw" }, { result: "continue" }] as const) {
      const text = buildVictoryHtml(victory as never).replace(/<[^>]+>/g, " ").replace(/\[[^\]]+\]/g, " ");
      expect(text).not.toMatch(/Round over|wins|draw|still hold/);
    }
  });

  it("the activation toasts and a refusal's reason", async () => {
    const notes: string[] = [];
    let i = 0;
    const faces = [6, 2, 1, 1, 1];
    const dice = { async roll() { return { total: faces[i++] ?? 1 }; } };
    const a1 = unit("a1", "a", { attackMelee: null, attackRanged: null, attackMagic: null });
    const b1 = unit("b1", "b", { save: null });
    const units = [a1, b1];
    const { round } = await beginRound({ units, dice });

    await resolveActivation({ round, attacker: a1, target: b1, type: "melee", dice, units, notify: (m) => notes.push(m) });

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) expect(note, note).toMatch(/^\[battleframe-simple-skirmish\./);
  });

  it("every report/notify key the source names is in lang/en.json, and the ready word is localized", () => {
    const used = [...SOURCE.matchAll(/tr\("((?:report|notify|refused)\.[A-Za-z.]+)"/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(8);
    for (const key of used) expect(lang[`battleframe-simple-skirmish.${key}`], key).toBeTypeOf("string");
    expect(SOURCE).not.toMatch(/"READY"\s*:\s*"not ready"/);
  });
});
