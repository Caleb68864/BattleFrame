import { describe, expect, it, vi, afterEach } from "vitest";
import { registerSimpleSkirmishHoverFields } from "../src/main";

afterEach(() => { delete (globalThis as { battleframe?: unknown }).battleframe; });

describe("registerSimpleSkirmishHoverFields", () => {
  it("registers the seven unit stats for the unit type", () => {
    const register = vi.fn();
    (globalThis as { battleframe?: unknown }).battleframe = { hover: { register } };
    registerSimpleSkirmishHoverFields();
    const [type, provider] = register.mock.calls[0];
    expect(type).toBe("battleframe-simple-skirmish.unit");
    expect(provider.fields.map((f: { key: string }) => f.key)).toEqual([
      "models",
      "move",
      "attackMelee",
      "attackRanged",
      "attackMagic",
      "save",
      "skill",
    ]);
    expect(provider.fields.every((f: { max?: number }) => f.max === undefined)).toBe(true);
    expect(provider.defaultVisibility).toBe("everyone");
  });
  it("is a no-op when the registry is absent", () => {
    expect(() => registerSimpleSkirmishHoverFields()).not.toThrow();
  });
});
