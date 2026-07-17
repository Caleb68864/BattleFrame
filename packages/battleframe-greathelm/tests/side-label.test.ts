import { afterEach, describe, expect, it, vi } from "vitest";
import { sideLabel } from "../src/ui/round-control";
import en from "../lang/en.json";

/** A localizer backed by the real en.json, resolving dotted keys as Foundry does. */
function stubI18n(): void {
  const flat: Record<string, string> = {};
  (function walk(node: Record<string, unknown>, prefix: string) {
    for (const [key, value] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === "object" && value !== null) {
        walk(value as Record<string, unknown>, path);
      } else if (typeof value === "string") {
        flat[path] = value;
      }
    }
  })(en as Record<string, unknown>, "");

  vi.stubGlobal("game", {
    i18n: { localize: (key: string) => flat[key] ?? key },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sideLabel", () => {
  it("names the side, not a single knight -- the win-banner bug", () => {
    stubI18n();

    // Regression: this returned a knight's `name`, so a warband win read as one
    // model's name. It must be a side label, and never a personal name.
    expect(sideLabel("hostile")).toBe("The hostile warband");
    expect(sideLabel("friendly")).toBe("The friendly warband");
  });

  it("falls back to the id, not a raw i18n key, for an unmapped side", () => {
    stubI18n();

    expect(sideLabel("neutral")).toBe("neutral");
  });

  it("does not throw when no i18n is available", () => {
    vi.stubGlobal("game", undefined);

    expect(sideLabel("hostile")).toBe("hostile");
  });
});
