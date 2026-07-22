/**
 * The selection service: neutral reads of "which token(s) the user has selected /
 * targeted", so every ruleset stops re-implementing `canvas.tokens.controlled`
 * and `game.user.targets.first()` with the same Set/array defensiveness
 * (engine-extraction scan #2, finding 1).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createSelectionApi } from "../src/ui/selection";

afterEach(() => vi.unstubAllGlobals());

const api = createSelectionApi();

describe("selection.controlled / controlledOne", () => {
  it("returns the controlled tokens as an array", () => {
    vi.stubGlobal("canvas", { tokens: { controlled: ["a", "b"] } });
    expect(api.controlled()).toEqual(["a", "b"]);
  });

  it("defaults to an empty array when nothing is controlled or canvas is absent", () => {
    vi.stubGlobal("canvas", {});
    expect(api.controlled()).toEqual([]);
  });

  it("controlledOne returns the single controlled token, else undefined", () => {
    vi.stubGlobal("canvas", { tokens: { controlled: ["only"] } });
    expect(api.controlledOne()).toBe("only");
    vi.stubGlobal("canvas", { tokens: { controlled: ["a", "b"] } });
    expect(api.controlledOne()).toBeUndefined();
    vi.stubGlobal("canvas", { tokens: { controlled: [] } });
    expect(api.controlledOne()).toBeUndefined();
  });
});

describe("selection.targets / firstTarget", () => {
  it("returns the user's targets as an array (from a Set)", () => {
    vi.stubGlobal("game", { user: { targets: new Set(["t1", "t2"]) } });
    expect(api.targets()).toEqual(["t1", "t2"]);
  });

  it("defaults to an empty array when there are no targets", () => {
    vi.stubGlobal("game", { user: {} });
    expect(api.targets()).toEqual([]);
    vi.stubGlobal("game", {});
    expect(api.targets()).toEqual([]);
  });

  it("firstTarget returns the first target, else undefined", () => {
    vi.stubGlobal("game", { user: { targets: new Set(["t1", "t2"]) } });
    expect(api.firstTarget()).toBe("t1");
    vi.stubGlobal("game", { user: { targets: new Set() } });
    expect(api.firstTarget()).toBeUndefined();
  });
});
