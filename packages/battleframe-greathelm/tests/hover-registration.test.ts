import { describe, expect, it, vi, afterEach } from "vitest";
import { registerGreathelmHoverFields } from "../src/main";

afterEach(() => { delete (globalThis as { battleframe?: unknown }).battleframe; });

describe("registerGreathelmHoverFields", () => {
  it("registers momentum and damage for the knight type", () => {
    const register = vi.fn();
    (globalThis as { battleframe?: unknown }).battleframe = { hover: { register } };
    registerGreathelmHoverFields();
    const [type, provider] = register.mock.calls[0];
    expect(type).toBe("battleframe-greathelm.knight");
    expect(provider.fields.map((f: { key: string }) => f.key)).toEqual(["momentum", "damage"]);
    expect(provider.fields.map((f: { max?: number }) => f.max)).toEqual([3, 3]);
    expect(provider.defaultVisibility).toBe("everyone");
  });
  it("is a no-op when the registry is absent", () => {
    expect(() => registerGreathelmHoverFields()).not.toThrow();
  });
});
