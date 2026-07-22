import { afterEach, describe, expect, it } from "vitest";
import {
  inCountryStatusEffects,
  registerStatusEffects,
  SUPPRESSED_STATUS
} from "../src/status";

afterEach(() => {
  delete (globalThis as any).CONFIG;
  delete (globalThis as any).battleframe;
});

/** A stand-in for the engine's game.battleframe.status registry (idempotent push). */
function stubEngineStatus(): any[] {
  const effects: any[] = [];
  (globalThis as any).battleframe = {
    status: {
      register: (e: any) => {
        if (!effects.some((x) => x.id === e.id)) effects.push(e);
      }
    }
  };
  return effects;
}

describe("registerStatusEffects", () => {
  it("registers the suppressed condition via the engine status registry", () => {
    const effects = stubEngineStatus();
    registerStatusEffects();
    expect(effects.map((e) => e.id)).toContain(SUPPRESSED_STATUS);
  });

  it("is idempotent (no duplicate on a second call)", () => {
    const effects = stubEngineStatus();
    registerStatusEffects();
    registerStatusEffects();
    expect(effects.filter((e) => e.id === SUPPRESSED_STATUS)).toHaveLength(1);
  });

  it("is a no-op when the engine registry is absent (not a browser)", () => {
    expect(() => registerStatusEffects()).not.toThrow();
  });

  it("names each effect via a localizable key and a core SVG icon", () => {
    for (const effect of inCountryStatusEffects()) {
      expect(effect.name).toMatch(/^battleframe-incountry\./);
      expect(effect.img).toMatch(/^icons\/svg\//); // core art -- ships none of its own
    }
  });
});
