import { afterEach, describe, expect, it, vi } from "vitest";
import { registerDirtsideRuleset, registerDirtsideHoverFields } from "../src/main";

afterEach(() => {
  delete (globalThis as any).battleframe;
  delete (globalThis as any).game;
  delete (globalThis as any).ui;
});

describe("registerDirtsideRuleset", () => {
  it("registers via the battleframe api with the module id and primary flag", () => {
    const registerRuleset = vi.fn(() => ({ ok: true }));
    (globalThis as any).battleframe = { api: { registerRuleset } };
    registerDirtsideRuleset();
    expect(registerRuleset).toHaveBeenCalledTimes(1);
    const def = registerRuleset.mock.calls[0][0] as Record<string, unknown>;
    expect(def.id).toBe("battleframe-dirtside-ii");
    expect(def.primary).toBe(true);
  });

  it("throws (and notifies) when the system api is absent", () => {
    const error = vi.fn();
    (globalThis as any).ui = { notifications: { error } };
    expect(() => registerDirtsideRuleset()).toThrow();
    expect(error).toHaveBeenCalled();
  });

  it("throws when the system rejects the ruleset", () => {
    (globalThis as any).battleframe = {
      api: { registerRuleset: () => ({ ok: false, errors: ["nope"] }) },
    };
    expect(() => registerDirtsideRuleset()).toThrow(/nope/);
  });
});

describe("registerDirtsideHoverFields", () => {
  it("advertises vehicle + unit hover fields to the registry", () => {
    const register = vi.fn();
    (globalThis as any).battleframe = { hover: { register } };
    registerDirtsideHoverFields();
    const types = register.mock.calls.map((c) => c[0]);
    expect(types).toContain("battleframe-dirtside-ii.vehicle");
    expect(types).toContain("battleframe-dirtside-ii.unit");
  });

  it("is a no-op when the registry is absent", () => {
    expect(() => registerDirtsideHoverFields()).not.toThrow();
  });
});
