/**
 * i18n service: localize / format a key with a FALLBACK, so a module's UI reads a
 * key when Foundry's i18n is present and a plain-English fallback when it is not
 * (unit tests, early init). Four modules hand-rolled the same
 * `i18n?.format() ?? i18n?.localize() ?? fallback` shape (QoL→engine scan #1).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18nApi } from "../src/ui/i18n";

afterEach(() => vi.unstubAllGlobals());
const api = createI18nApi();

describe("i18n.localize", () => {
  it("uses Foundry's localize when present", () => {
    vi.stubGlobal("game", { i18n: { localize: (k: string) => (k === "K" ? "Localized" : k) } });
    expect(api.localize("K", "fallback")).toBe("Localized");
  });

  it("returns the fallback when i18n is absent", () => {
    vi.stubGlobal("game", {});
    expect(api.localize("K", "fallback")).toBe("fallback");
  });

  it("returns the key when there is no fallback and no i18n", () => {
    vi.stubGlobal("game", {});
    expect(api.localize("K")).toBe("K");
  });
});

describe("i18n.format", () => {
  it("uses Foundry's format (interpolation) when present", () => {
    vi.stubGlobal("game", { i18n: { format: (k: string, d: Record<string, unknown>) => `${k}:${d.n}` } });
    expect(api.format("K", { n: 3 }, "fallback")).toBe("K:3");
  });

  it("falls back to localize, then the fallback, when format is absent", () => {
    vi.stubGlobal("game", { i18n: { localize: (k: string) => `L(${k})` } });
    expect(api.format("K", { n: 3 }, "fallback")).toBe("L(K)");
    vi.stubGlobal("game", {});
    expect(api.format("K", { n: 3 }, "fallback")).toBe("fallback");
  });
});
