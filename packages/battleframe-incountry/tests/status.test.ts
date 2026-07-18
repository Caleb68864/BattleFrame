import { afterEach, describe, expect, it } from "vitest";
import {
  inCountryStatusEffects,
  registerStatusEffects,
  SUPPRESSED_STATUS
} from "../src/status";

afterEach(() => {
  delete (globalThis as any).CONFIG;
});

describe("registerStatusEffects", () => {
  it("adds the suppressed condition to CONFIG.statusEffects", () => {
    (globalThis as any).CONFIG = { statusEffects: [] };
    registerStatusEffects();
    const ids = (globalThis as any).CONFIG.statusEffects.map((e: { id: string }) => e.id);
    expect(ids).toContain(SUPPRESSED_STATUS);
  });

  it("is idempotent (no duplicate on a second call)", () => {
    (globalThis as any).CONFIG = { statusEffects: [] };
    registerStatusEffects();
    registerStatusEffects();
    const count = (globalThis as any).CONFIG.statusEffects.filter(
      (e: { id: string }) => e.id === SUPPRESSED_STATUS
    ).length;
    expect(count).toBe(1);
  });

  it("is a no-op when CONFIG is absent (not a browser)", () => {
    expect(() => registerStatusEffects()).not.toThrow();
  });

  it("names each effect via a localizable key and a core SVG icon", () => {
    for (const effect of inCountryStatusEffects()) {
      expect(effect.name).toMatch(/^battleframe-incountry\./);
      expect(effect.img).toMatch(/^icons\/svg\//); // core art -- ships none of its own
    }
  });
});
