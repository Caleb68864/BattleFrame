import { afterEach, describe, expect, it, vi } from "vitest";
import { registerInCountryRuleset } from "../src/main";

afterEach(() => {
  delete (globalThis as any).battleframe;
  delete (globalThis as any).game;
  delete (globalThis as any).ui;
});

describe("registerInCountryRuleset", () => {
  it("registers via the battleframe api with the module id and primary flag", () => {
    const registerRuleset = vi.fn(() => ({ ok: true }));
    (globalThis as any).battleframe = { api: { registerRuleset } };

    registerInCountryRuleset();

    expect(registerRuleset).toHaveBeenCalledTimes(1);
    const def = registerRuleset.mock.calls[0][0] as Record<string, unknown>;
    expect(def.id).toBe("battleframe-incountry");
    expect(def.primary).toBe(true);
  });

  it("throws (and notifies) when the system api is absent", () => {
    const error = vi.fn();
    (globalThis as any).ui = { notifications: { error } };
    expect(() => registerInCountryRuleset()).toThrow();
    expect(error).toHaveBeenCalled();
  });

  it("throws when the system rejects the ruleset", () => {
    (globalThis as any).battleframe = {
      api: { registerRuleset: () => ({ ok: false, errors: ["nope"] }) }
    };
    expect(() => registerInCountryRuleset()).toThrow(/nope/);
  });
});
