import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerGreathelmTokenDefaults,
  greathelmDefaultTokenImages
} from "../src/token-defaults";
import { MODULE_ID, KNIGHT_ACTOR_TYPE } from "../src/constants";

afterEach(() => {
  delete (globalThis as any).battleframe;
  delete (globalThis as any).game;
});

describe("greathelmDefaultTokenImages", () => {
  it("maps the knight type to its knight icon under the module path", () => {
    expect(greathelmDefaultTokenImages()).toEqual([
      { type: `${MODULE_ID}.${KNIGHT_ACTOR_TYPE}`, img: `modules/${MODULE_ID}/icons/knight.svg` }
    ]);
  });
});

describe("registerGreathelmTokenDefaults", () => {
  it("registers each (type, img) pair via the engine tokens registry", () => {
    const registerDefaultImage = vi.fn();
    (globalThis as any).battleframe = { tokens: { registerDefaultImage } };
    registerGreathelmTokenDefaults();
    expect(registerDefaultImage).toHaveBeenCalledTimes(1);
    expect(registerDefaultImage).toHaveBeenCalledWith(
      `${MODULE_ID}.${KNIGHT_ACTOR_TYPE}`,
      `modules/${MODULE_ID}/icons/knight.svg`
    );
  });

  it("resolves the registry off game.battleframe when globalThis.battleframe is absent", () => {
    const registerDefaultImage = vi.fn();
    (globalThis as any).game = { battleframe: { tokens: { registerDefaultImage } } };
    registerGreathelmTokenDefaults();
    expect(registerDefaultImage).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the registry is absent", () => {
    expect(() => registerGreathelmTokenDefaults()).not.toThrow();
  });
});
