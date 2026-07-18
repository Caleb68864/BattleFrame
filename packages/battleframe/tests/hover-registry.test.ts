import { describe, expect, it } from "vitest";
import { createHoverRegistry } from "../src/ui/hover-registry";

describe("hover registry", () => {
  it("returns a provider registered for an actor type", () => {
    const reg = createHoverRegistry();
    const provider = { fields: [{ key: "hp", label: "HP" }] };
    reg.register("some.type", provider);
    expect(reg.get("some.type")).toBe(provider);
  });
  it("returns undefined for an unregistered type", () => {
    expect(createHoverRegistry().get("nope")).toBeUndefined();
  });
  it("last registration for a type wins (idempotent install)", () => {
    const reg = createHoverRegistry();
    reg.register("t", { fields: [] });
    const second = { fields: [{ key: "a", label: "A" }] };
    reg.register("t", second);
    expect(reg.get("t")).toBe(second);
  });
});
