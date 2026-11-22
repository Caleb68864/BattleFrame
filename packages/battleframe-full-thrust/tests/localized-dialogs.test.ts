import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import langEn from "../lang/en.json";
import { registerOwnershipWarning } from "../src/ui/ownership-warning";
import { newBattleAction } from "../src/ui/round-control";
import { pendingActionLabels } from "../src/round/turn-phase";
import { withRules } from "./helpers/world";

// Roadmap P1 #12 left the dialogs and the ownership warning English-only. Every
// dialog title, button, prompt and label now names a `battleframe-full-thrust.dialog.*`
// key in lang/en.json; the English is only the fallback.

const FILES = ["../src/ui/round-control.ts", "../src/ui/ownership-warning.ts"].map((path) => ({
  path,
  source: readFileSync(resolve(__dirname, path), "utf8")
}));
const lang = langEn as Record<string, string>;

describe("dialogs go through the translation", () => {
  it("no dialog title, button label or form label is raw English", () => {
    for (const { path, source } of FILES) {
      expect(source, `${path}: a dialog title is a literal`).not.toMatch(/window:\s*\{\s*title:\s*[`"]/);
      expect(source, `${path}: a button label is a literal`).not.toMatch(/\blabel:\s*[`"]/);
      expect(source, `${path}: a form <label> holds raw text`).not.toMatch(/<label>[A-Za-z]/);
    }
  });

  it("every dialog key a source names is in lang/en.json, with the placeholders it fills", () => {
    const used = FILES.flatMap(({ source }) => [...source.matchAll(/\$\{DIALOG\}\.(\w+)`/g)].map((m) => m[1]));
    expect(used.length).toBeGreaterThan(20);
    for (const name of used) {
      expect(lang[`battleframe-full-thrust.dialog.${name}`], `dialog.${name} missing from lang/en.json`).toBeTypeOf("string");
    }
    const call = /tr\(`\$\{DIALOG\}\.(\w+)`,\s*(?:`(?:[^`\\]|\\.)*`|"[^"]*")\s*(?:,\s*\{([^}]*)\})?\s*\)/g;
    for (const { source } of FILES) {
      for (const [, key, data = ""] of source.matchAll(call)) {
        const supplied = new Set(data.split(",").map((part) => part.split(":")[0].trim()).filter(Boolean));
        for (const [, name] of lang[`battleframe-full-thrust.dialog.${key}`].matchAll(/\{(\w+)\}/g)) {
          expect(supplied.has(name), `dialog.${key} prints {${name}} but the call does not pass it`).toBe(true);
        }
      }
    }
  });
});

describe("a dialog shows its localized text", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = withRules();
    (globalThis as any).game.i18n = {
      format: (key: string) => `[${key}]`,
      localize: (key: string) => `[${key}]`
    };
  });
  afterEach(() => {
    restore();
    vi.unstubAllGlobals();
  });

  function fireSecrecyHook() {
    const on = vi.fn();
    vi.stubGlobal("Hooks", { on });
    (globalThis as any).game.users = [
      { id: "a", isGM: false },
      { id: "b", isGM: false }
    ];
    registerOwnershipWarning();
    const hook = on.mock.calls[0][1];
    hook({ type: "battleframe-full-thrust.ship", name: "Lion", ownership: { default: 2 } }, { ownership: { default: 2 } });
  }

  it("the plotting-secrecy warning", () => {
    const prompt = vi.fn(async () => undefined);
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: { prompt } } } });

    fireSecrecyHook();

    const opts = (prompt.mock.calls[0] as unknown[])[0] as any;
    expect(opts.window.title).toBe("[battleframe-full-thrust.dialog.secrecyTitle]");
    expect(opts.ok.label).toBe("[battleframe-full-thrust.dialog.secrecyOk]");
    expect(opts.content).toContain("[battleframe-full-thrust.dialog.secrecyMessage]");
  });

  it("the secrecy warning's toast fallback, when there is no dialog", () => {
    const warn = vi.fn();
    vi.stubGlobal("foundry", undefined);
    vi.stubGlobal("ui", { notifications: { warn } });

    fireSecrecyHook();

    expect(warn).toHaveBeenCalledWith("battleframe-full-thrust | [battleframe-full-thrust.dialog.secrecyMessage]");
  });

  it("the New Battle confirm", async () => {
    const confirm = vi.fn(async () => false);
    (globalThis as any).game.user = { isGM: true };
    vi.stubGlobal("foundry", { applications: { api: { DialogV2: { confirm } } } });

    await newBattleAction();

    const opts = (confirm.mock.calls[0] as unknown[])[0] as any;
    expect(opts.window.title).toBe("[battleframe-full-thrust.dialog.newBattleTitle]");
    expect(opts.content).toContain("[battleframe-full-thrust.dialog.newBattleConfirm]");
  });

  it("the ready guard's pending-action names", () => {
    const labels = pendingActionLabels({ plot: true, fire: true, nova: true } as never);

    expect(labels).toEqual([
      "[battleframe-full-thrust.dialog.pendingAction.plot]",
      "[battleframe-full-thrust.dialog.pendingAction.fire]",
      "[battleframe-full-thrust.dialog.pendingAction.nova]"
    ]);
    for (const key of ["plot", "fire", "splitFire", "needle", "salvo", "nova", "waveGun", "launchFighters", "recoverFighters"]) {
      expect(lang[`battleframe-full-thrust.dialog.pendingAction.${key}`], key).toBeTypeOf("string");
    }
  });

  it("every option a dialog offers has a display name", () => {
    for (const key of ["fcs", "drive", "screen", "pds", "weapon"]) {
      expect(lang[`battleframe-full-thrust.dialog.system.${key}`], key).toBeTypeOf("string");
    }
    for (const key of ["normal", "emp", "needle"]) {
      expect(lang[`battleframe-full-thrust.dialog.warheadKind.${key}`], key).toBeTypeOf("string");
    }
    const source = FILES[0].source;
    expect(source).not.toMatch(/<option value="\$\{\w+\}">\$\{\w+\}<\/option>/);
  });
});
