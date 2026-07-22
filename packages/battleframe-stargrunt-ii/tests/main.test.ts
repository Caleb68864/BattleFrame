import { afterEach, describe, expect, it, vi } from "vitest";
import { registerStargruntRuleset, registerStargruntHoverFields } from "../src/main";

afterEach(() => {
  delete (globalThis as any).battleframe;
  delete (globalThis as any).game;
  delete (globalThis as any).ui;
});

describe("registerStargruntRuleset", () => {
  it("registers via the battleframe api with the module id and primary flag", () => {
    const registerRuleset = vi.fn(() => ({ ok: true }));
    (globalThis as any).battleframe = { api: { registerRuleset } };

    registerStargruntRuleset();

    expect(registerRuleset).toHaveBeenCalledTimes(1);
    const def = registerRuleset.mock.calls[0][0] as Record<string, unknown>;
    expect(def.id).toBe("battleframe-stargrunt-ii");
    expect(def.primary).toBe(true);
  });

  it("throws (and notifies) when the system api is absent", () => {
    const error = vi.fn();
    (globalThis as any).ui = { notifications: { error } };
    expect(() => registerStargruntRuleset()).toThrow();
    expect(error).toHaveBeenCalled();
  });

  it("throws when the system rejects the ruleset", () => {
    (globalThis as any).battleframe = {
      api: { registerRuleset: () => ({ ok: false, errors: ["nope"] }) }
    };
    expect(() => registerStargruntRuleset()).toThrow(/nope/);
  });
});

describe("registerStargruntHoverFields", () => {
  it("advertises quality, confidence, and suppression for the unit type", () => {
    const register = vi.fn();
    (globalThis as any).battleframe = { hover: { register } };

    registerStargruntHoverFields();

    expect(register).toHaveBeenCalledWith(
      "battleframe-stargrunt-ii.unit",
      expect.objectContaining({
        fields: expect.arrayContaining([
          expect.objectContaining({ key: "quality" }),
          expect.objectContaining({ key: "confidence", max: 4 }),
          expect.objectContaining({ key: "suppression", max: 3 })
        ])
      })
    );
  });

  it("is a no-op when no hover registry is present", () => {
    expect(() => registerStargruntHoverFields()).not.toThrow();
  });
});
