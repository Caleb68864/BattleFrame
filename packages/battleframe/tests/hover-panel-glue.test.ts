import { describe, expect, it } from "vitest";
import { shouldRender } from "../src/ui/hover-panel";

describe("shouldRender", () => {
  const provider = { fields: [{ key: "a", label: "A" }] };
  it("no provider for the type -> false", () => {
    expect(shouldRender({ isGM: true }, { actor: { type: "x", isOwner: true } }, () => undefined, "ruleset")).toBe(false);
  });
  it("provider + GM + any mode -> true", () => {
    expect(shouldRender({ isGM: true }, { actor: { type: "x", isOwner: false } }, () => provider, "gm")).toBe(true);
  });
  it("provider + player + gm mode -> false", () => {
    expect(shouldRender({ isGM: false }, { actor: { type: "x", isOwner: true } }, () => provider, "gm")).toBe(false);
  });
  it("token with no actor -> false", () => {
    expect(shouldRender({ isGM: true }, { actor: null }, () => provider, "everyone")).toBe(false);
  });
});
