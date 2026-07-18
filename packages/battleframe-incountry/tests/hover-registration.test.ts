import { describe, expect, it, vi, afterEach } from "vitest";
import { registerInCountryHoverFields } from "../src/main";

afterEach(() => { delete (globalThis as { battleframe?: unknown }).battleframe; });

describe("registerInCountryHoverFields", () => {
  it("registers modelsRemaining for the unit type", () => {
    const register = vi.fn();
    (globalThis as { battleframe?: unknown }).battleframe = { hover: { register } };
    registerInCountryHoverFields();
    const [type, provider] = register.mock.calls[0];
    expect(type).toBe("battleframe-incountry.unit");
    expect(provider.fields.map((f: { key: string }) => f.key)).toEqual(["modelsRemaining"]);
    expect(provider.defaultVisibility).toBe("everyone");
  });
  it("is a no-op when the registry is absent", () => {
    expect(() => registerInCountryHoverFields()).not.toThrow();
  });
});
