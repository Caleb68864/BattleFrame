import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerSimpleSkirmishTokenDefaults,
  simpleSkirmishDefaultTokenImages
} from "../src/token-defaults";
import { MODULE_ID, UNIT_ACTOR_TYPE } from "../src/constants";

afterEach(() => {
  delete (globalThis as any).battleframe;
  delete (globalThis as any).game;
});

describe("simpleSkirmishDefaultTokenImages", () => {
  it("maps the unit type to its squad icon under the module path", () => {
    expect(simpleSkirmishDefaultTokenImages()).toEqual([
      { type: `${MODULE_ID}.${UNIT_ACTOR_TYPE}`, img: `modules/${MODULE_ID}/icons/squad.svg` }
    ]);
  });
});

describe("registerSimpleSkirmishTokenDefaults", () => {
  it("registers each (type, img) pair via the engine tokens registry", () => {
    const registerDefaultImage = vi.fn();
    (globalThis as any).battleframe = { tokens: { registerDefaultImage } };
    registerSimpleSkirmishTokenDefaults();
    expect(registerDefaultImage).toHaveBeenCalledTimes(1);
    expect(registerDefaultImage).toHaveBeenCalledWith(
      `${MODULE_ID}.${UNIT_ACTOR_TYPE}`,
      `modules/${MODULE_ID}/icons/squad.svg`
    );
  });

  it("resolves the registry off game.battleframe when globalThis.battleframe is absent", () => {
    const registerDefaultImage = vi.fn();
    (globalThis as any).game = { battleframe: { tokens: { registerDefaultImage } } };
    registerSimpleSkirmishTokenDefaults();
    expect(registerDefaultImage).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the registry is absent", () => {
    expect(() => registerSimpleSkirmishTokenDefaults()).not.toThrow();
  });
});
