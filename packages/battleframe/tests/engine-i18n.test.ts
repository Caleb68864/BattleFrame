import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import langEn from "../lang/en.json";
import { offerOrphanConversion, warnAboutOrphans, findOrphanedActors } from "../src/rulesets/orphan-check";
import { createReadyAdvanceApi, registerReadyAdvance } from "../src/rounds/ready-advance";
import { rulesetRegistry } from "../src/rulesets/registry";

/**
 * The engine's user-facing text that skipped i18n (2026-11-21 audit): the orphan
 * warning and conversion prompt, the ready-advance toasts, the countdown
 * setting's name and hint, and the ruleset-activation refusals the wizard shows.
 * The stub hands back the key, so a string that skipped localization shows up as
 * English.
 */

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
const i18n = { localize: (k: string) => `[${k}]`, format: (k: string) => `[${k}]` };

beforeEach(() => vi.stubGlobal("game", { i18n }));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const orphans = () =>
  findOrphanedActors(
    [{ id: "a1", name: "A", type: "gone-module.trooper", system: {} }],
    [{ id: "gone-module", active: false }]
  );

describe("engine text a player or GM reads is localized", () => {
  it("the orphan warning and the conversion prompt", async () => {
    const warn = vi.fn();
    warnAboutOrphans(orphans(), { warn } as never);
    expect(warn.mock.calls[0][0]).toContain("[battleframe.orphans.warning]");

    const confirm = vi.fn(async () => false);
    await offerOrphanConversion(orphans(), { confirm });
    expect((confirm.mock.calls[0] as unknown[])[0]).toBe("[battleframe.orphans.convertPrompt]");
  });

  it("the countdown setting's name and hint", () => {
    const register = vi.fn();
    vi.stubGlobal("game", { i18n, settings: { register } });
    registerReadyAdvance();
    expect(register.mock.calls[0][2]).toMatchObject({
      name: "battleframe.settings.advanceTimer.name",
      hint: "battleframe.settings.advanceTimer.hint"
    });
  });

  it("the ready-failed and countdown toasts", async () => {
    vi.useFakeTimers();
    const warn = vi.fn();
    const info = vi.fn();
    const hooks: Record<string, () => void> = {};
    const doc = {
      getFlag: () => ({ p1: true }),
      setFlag: () => Promise.reject(new Error("no")),
      update: () => Promise.reject(new Error("no"))
    };
    vi.stubGlobal("game", {
      i18n,
      user: { id: "p1" },
      users: [{ id: "p1", active: true, isGM: false }],
      combats: { active: doc },
      settings: { register: vi.fn(), get: () => 5 }
    });
    vi.stubGlobal("Hooks", { on: (e: string, cb: () => void) => (hooks[e] = cb), once: vi.fn() });
    vi.stubGlobal("ui", { notifications: { warn, info } });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    registerReadyAdvance();
    hooks.updateCombat();
    await Promise.resolve();
    expect(info.mock.calls[0][0]).toContain("[battleframe.advance.countdown]");

    await createReadyAdvanceApi().toggleReady();
    expect(warn.mock.calls[0][0]).toContain("[battleframe.advance.readyFailed]");
  });

  it("a refused ruleset activation", () => {
    const result = rulesetRegistry.activateRuleset("not-registered-anywhere");
    expect(result.ok).toBe(false);
    expect(result.errors?.[0]).toBe("[battleframe.rulesets.notRegistered]");
  });

  it("every battleframe.* key these sources name is in lang/en.json", () => {
    const sources = [
      "../src/rulesets/orphan-check.ts",
      "../src/rounds/ready-advance.ts",
      "../src/rulesets/registry.ts",
      "../src/applications/setup-wizard.ts"
    ].map((p) => readFileSync(resolve(__dirname, p), "utf8"));
    const used = sources.flatMap((s) => [...s.matchAll(/"(battleframe\.(?:orphans|advance|rulesets|settings\.advanceTimer|setupWizard)\.[A-Za-z.]+)"/g)].map((m) => m[1]));
    expect(used.length).toBeGreaterThan(8);
    for (const key of used) expect(lang[key], key).toBeTypeOf("string");
  });
});
