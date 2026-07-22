import { afterEach, describe, expect, it, vi } from "vitest";
import {
  registerDirtsideTokenDefaults,
  dirtsideDefaultTokenImages
} from "../src/token-defaults";
import { MODULE_ID, VEHICLE_ACTOR_TYPE, INFANTRY_ACTOR_TYPE } from "../src/constants";

afterEach(() => {
  delete (globalThis as any).battleframe;
  delete (globalThis as any).game;
});

describe("dirtsideDefaultTokenImages", () => {
  it("maps vehicle and infantry to their icons, and NOT the token-less unit", () => {
    const images = dirtsideDefaultTokenImages();
    expect(images).toEqual([
      { type: `${MODULE_ID}.${VEHICLE_ACTOR_TYPE}`, img: `modules/${MODULE_ID}/icons/vehicle.svg` },
      { type: `${MODULE_ID}.${INFANTRY_ACTOR_TYPE}`, img: `modules/${MODULE_ID}/icons/infantry.svg` }
    ]);
    expect(images.some((i) => i.type.endsWith(".unit"))).toBe(false);
  });
});

describe("registerDirtsideTokenDefaults", () => {
  it("registers each (type, img) pair via the engine tokens registry", () => {
    const registerDefaultImage = vi.fn();
    (globalThis as any).battleframe = { tokens: { registerDefaultImage } };
    registerDirtsideTokenDefaults();
    expect(registerDefaultImage).toHaveBeenCalledTimes(2);
    expect(registerDefaultImage).toHaveBeenCalledWith(
      `${MODULE_ID}.${VEHICLE_ACTOR_TYPE}`,
      `modules/${MODULE_ID}/icons/vehicle.svg`
    );
    expect(registerDefaultImage).toHaveBeenCalledWith(
      `${MODULE_ID}.${INFANTRY_ACTOR_TYPE}`,
      `modules/${MODULE_ID}/icons/infantry.svg`
    );
  });

  it("resolves the registry off game.battleframe when globalThis.battleframe is absent", () => {
    const registerDefaultImage = vi.fn();
    (globalThis as any).game = { battleframe: { tokens: { registerDefaultImage } } };
    registerDirtsideTokenDefaults();
    expect(registerDefaultImage).toHaveBeenCalledTimes(2);
  });

  it("is a no-op when the registry is absent", () => {
    expect(() => registerDirtsideTokenDefaults()).not.toThrow();
  });
});
