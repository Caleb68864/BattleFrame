import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { plotSecrecyAtRisk, registerOwnershipWarning } from "../src/ui/ownership-warning";
import { withRules } from "./helpers/world";

// This module ships no rules numbers; a world supplies them. See helpers/world.ts.
let restoreFtWorld: () => void;
beforeEach(() => {
  restoreFtWorld = withRules();
});
afterEach(() => {
  restoreFtWorld();
});


afterEach(() => vi.unstubAllGlobals());

const users = [
  { id: "gm", isGM: true },
  { id: "alice", isGM: false },
  { id: "bob", isGM: false }
];

describe("plotSecrecyAtRisk (2+ non-GM players can read the plotted order)", () => {
  it("is safe when only one player observes their own ship", () => {
    expect(plotSecrecyAtRisk({ alice: 3, default: 0 }, users)).toBe(false);
  });

  it("is at risk when a second player can observe the ship", () => {
    // Alice owns, Bob observes -> Bob (the opponent) could read the plotted flag.
    expect(plotSecrecyAtRisk({ alice: 3, bob: 2, default: 0 }, users)).toBe(true);
  });

  it("is at risk when the default grants everyone observer+", () => {
    expect(plotSecrecyAtRisk({ default: 2 }, users)).toBe(true);
  });

  it("ignores the GM (the GM always sees everything)", () => {
    expect(plotSecrecyAtRisk({ alice: 3, gm: 3, default: 0 }, users)).toBe(false);
  });

  it("treats LIMITED (1) as not able to read the flag", () => {
    expect(plotSecrecyAtRisk({ alice: 3, bob: 1, default: 0 }, users)).toBe(false);
  });
});

describe("registerOwnershipWarning", () => {
  it("registers an updateActor hook", () => {
    const on = vi.fn();
    vi.stubGlobal("Hooks", { on });
    registerOwnershipWarning();
    expect(on).toHaveBeenCalledWith("updateActor", expect.any(Function));
  });

  it("does nothing when Hooks is absent", () => {
    vi.stubGlobal("Hooks", undefined);
    expect(() => registerOwnershipWarning()).not.toThrow();
  });
});
