import { afterEach, describe, expect, it, vi } from "vitest";
import { registerShipTokenDefaults } from "../src/tokens";
import { MODULE_ID, SHIP_ACTOR_TYPE, FIGHTER_GROUP_ACTOR_TYPE } from "../src/constants";

afterEach(() => vi.unstubAllGlobals());

function fakeTokens() {
  const pairs: Array<{ type: string; img: string }> = [];
  return {
    pairs,
    registerDefaultImage: (type: string, img: string) => {
      pairs.push({ type, img });
    }
  };
}

describe("registerShipTokenDefaults", () => {
  it("registers ship + fighter-group default images via the engine tokens registry", () => {
    const tokens = fakeTokens();
    vi.stubGlobal("battleframe", { tokens });

    registerShipTokenDefaults();

    expect(tokens.pairs).toContainEqual({
      type: `${MODULE_ID}.${SHIP_ACTOR_TYPE}`,
      img: `modules/${MODULE_ID}/icons/ship.svg`
    });
    expect(tokens.pairs).toContainEqual({
      type: `${MODULE_ID}.${FIGHTER_GROUP_ACTOR_TYPE}`,
      img: `modules/${MODULE_ID}/icons/fighter.svg`
    });
  });

  it("resolves the registry off game.battleframe when globalThis.battleframe is absent", () => {
    const tokens = fakeTokens();
    vi.stubGlobal("battleframe", undefined);
    vi.stubGlobal("game", { battleframe: { tokens } });

    registerShipTokenDefaults();

    expect(tokens.pairs).toHaveLength(2);
  });

  it("does nothing when the engine tokens registry is absent", () => {
    vi.stubGlobal("battleframe", undefined);
    vi.stubGlobal("game", undefined);
    expect(() => registerShipTokenDefaults()).not.toThrow();
  });
});
