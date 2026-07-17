import { afterEach, describe, expect, it, vi } from "vitest";
import { MANIFEST_VERSION, runningBattleframeVersion } from "../src/version";
import systemManifest from "../system.json";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runningBattleframeVersion", () => {
  it("reports the version Foundry actually loaded, from game.system", () => {
    vi.stubGlobal("game", { system: { id: "battleframe", version: "9.9.9" } });

    expect(runningBattleframeVersion()).toBe("9.9.9");
  });

  it("ignores a game.system belonging to a different system", () => {
    vi.stubGlobal("game", { system: { id: "dnd5e", version: "4.0.0" } });

    expect(runningBattleframeVersion()).toBe(MANIFEST_VERSION);
  });

  it("falls back to the build-time manifest version when no game is present", () => {
    vi.stubGlobal("game", undefined);

    expect(runningBattleframeVersion()).toBe(MANIFEST_VERSION);
  });

  // The whole point of the coupling: the fallback cannot drift from what ships.
  it("keeps the manifest version identical to system.json", () => {
    expect(MANIFEST_VERSION).toBe(systemManifest.version);
  });
});
