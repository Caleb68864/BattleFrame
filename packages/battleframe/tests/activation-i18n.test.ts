import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import langEn from "../lang/en.json";
import { createActivationOrder, IllegalActivationError } from "../src/rounds/activation";

/**
 * The engine's activation-order errors were developer English (2026-11-21), and a
 * module's toast can show them. They now go through the translation, English as
 * the fallback. The stub hands back `[key]`.
 */

beforeEach(() => {
  vi.stubGlobal("game", { i18n: { localize: (k: string) => `[${k}]`, format: (k: string) => `[${k}]` } });
});
afterEach(() => vi.unstubAllGlobals());

const unit = (id: string, sideId: string, resolved = false) => ({ id, sideId, isResolved: () => resolved });

describe("activation-order errors are localized", () => {
  it("out of turn, unknown, repeated and resolved units", () => {
    const order = createActivationOrder({
      units: [unit("a1", "A"), unit("a2", "A"), unit("b1", "B"), unit("b2", "B", true)],
      firstSideId: "A"
    });
    const message = (fn: () => void) => {
      try {
        fn();
      } catch (error) {
        expect(error).toBeInstanceOf(IllegalActivationError);
        return (error as Error).message;
      }
      throw new Error("did not throw");
    };

    expect(message(() => order.activate("b1"))).toContain("[battleframe.activation.notYourTurn]");
    expect(message(() => order.activate("nope"))).toContain("[battleframe.activation.unknownUnit]");
    order.activate("a1");
    order.activate("b1");
    expect(message(() => order.activate("a1"))).toContain("[battleframe.activation.alreadyActivated]");
    expect(message(() => order.activate("b2"))).toContain("[battleframe.activation.resolved]");
  });

  it("every battleframe.activation.* key the source names is in lang/en.json", () => {
    const source = readFileSync(resolve(__dirname, "../src/rounds/activation.ts"), "utf8");
    const used = [...source.matchAll(/\bt\(\s*"([A-Za-z]+)"/g)].map((m) => `battleframe.activation.${m[1]}`);
    expect(used.length).toBeGreaterThanOrEqual(7);
    for (const key of used) expect((langEn as Record<string, string>)[key], key).toBeTypeOf("string");
  });
});
