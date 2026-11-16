import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import langEn from "../lang/en.json";
import { executeManeuversAction, needleAction } from "../src/ui/round-control";
import { withRules } from "./helpers/world";

// Roadmap P1 #12 left the toasts English-only. Every `notify(...)` now names a
// `battleframe-full-thrust.notify.*` key; the English text is only the fallback.

const SOURCE = readFileSync(resolve(__dirname, "../src/ui/round-control.ts"), "utf8");
const lang = langEn as Record<string, string>;

describe("toasts go through the translation", () => {
  it("every notify() call passes a key that lang/en.json defines", () => {
    const calls = [...SOURCE.matchAll(/\bnotify\(\s*"(?:warn|error|info)",\s*([^,]+),/g)].map((m) => m[1].trim());
    expect(calls.length).toBeGreaterThan(50);
    for (const arg of calls) {
      // A literal key, or a ternary choosing between literal keys.
      expect(arg, `a toast passes ${arg} instead of a key`).toMatch(/^(?:[^`"]+\?\s*"[A-Za-z]+"\s*:\s*)?"[A-Za-z]+"$/);
      for (const [, name] of arg.matchAll(/"([A-Za-z]+)"/g)) {
        const key = `battleframe-full-thrust.notify.${name}`;
        expect(lang[key], `${key} missing from lang/en.json`).toBeTypeOf("string");
      }
    }
  });

  it("no toast is built from raw English text", () => {
    expect(SOURCE).not.toMatch(/notify\(\s*"(?:warn|error|info)",\s*`/);
  });

  it("every placeholder an en.json toast names is one the call supplies", () => {
    const re = /notify\(\s*"(?:warn|error|info)",\s*"([A-Za-z]+)",\s*(?:`(?:[^`\\]|\\.)*`|"[^"]*")\s*(?:,\s*\{([^}]*)\})?\s*\)/g;
    for (const [, key, data = ""] of SOURCE.matchAll(re)) {
      const supplied = new Set(data.split(",").map((part) => part.split(":")[0].trim()).filter(Boolean));
      for (const [, name] of lang[`battleframe-full-thrust.notify.${key}`].matchAll(/\{(\w+)\}/g)) {
        expect(supplied.has(name), `${key} prints {${name}} but the call does not pass it`).toBe(true);
      }
    }
  });
});

describe("a refused action toasts its localized message", () => {
  let restore: () => void;
  beforeEach(() => {
    restore = withRules();
  });
  afterEach(() => {
    restore();
    vi.unstubAllGlobals();
  });

  function stubNonGm(warn: ReturnType<typeof vi.fn>) {
    vi.stubGlobal("game", {
      ...(globalThis as any).game,
      user: { isGM: false },
      i18n: { format: (key: string) => `[${key}]`, localize: (key: string) => `[${key}]` },
    });
    vi.stubGlobal("ui", { notifications: { warn } });
  }

  it("Needle Beam, for a player", async () => {
    const warn = vi.fn();
    stubNonGm(warn);
    await needleAction();
    expect(warn).toHaveBeenCalledWith("battleframe-full-thrust | [battleframe-full-thrust.notify.gmResolvesFire]");
  });

  it("Execute, for a player", async () => {
    const warn = vi.fn();
    stubNonGm(warn);
    await executeManeuversAction();
    expect(warn).toHaveBeenCalledWith("battleframe-full-thrust | [battleframe-full-thrust.notify.gmExecutes]");
  });

  it("falls back to the English text when no translation is loaded", async () => {
    const warn = vi.fn();
    vi.stubGlobal("game", { ...(globalThis as any).game, user: { isGM: false }, i18n: undefined });
    vi.stubGlobal("ui", { notifications: { warn } });
    await needleAction();
    expect(warn).toHaveBeenCalledWith("battleframe-full-thrust | only the GM resolves fire");
  });
});
