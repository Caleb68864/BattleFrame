import { describe, expect, it } from "vitest";
import { resolveVisibility, isVisibleTo } from "../src/ui/hover-visibility";

describe("resolveVisibility", () => {
  it("passes an explicit mode through unchanged", () => {
    expect(resolveVisibility("gm", { fields: [] })).toBe("gm");
    expect(resolveVisibility("everyone", { fields: [] })).toBe("everyone");
  });
  it("falls back to the provider default when set to 'ruleset'", () => {
    expect(resolveVisibility("ruleset", { fields: [], defaultVisibility: "everyone" })).toBe("everyone");
  });
  it("falls back to 'owners' when 'ruleset' and the provider omits a default", () => {
    expect(resolveVisibility("ruleset", { fields: [] })).toBe("owners");
  });
});

describe("isVisibleTo", () => {
  const gm = { isGM: true };
  const player = { isGM: false };
  const ownedToken = { actor: { isOwner: true } };
  const enemyToken = { actor: { isOwner: false } };
  it("everyone: always visible", () => {
    expect(isVisibleTo(player, enemyToken, "everyone")).toBe(true);
  });
  it("owners: GM sees all; a player sees only owned", () => {
    expect(isVisibleTo(gm, enemyToken, "owners")).toBe(true);
    expect(isVisibleTo(player, ownedToken, "owners")).toBe(true);
    expect(isVisibleTo(player, enemyToken, "owners")).toBe(false);
  });
  it("gm: only the GM", () => {
    expect(isVisibleTo(gm, ownedToken, "gm")).toBe(true);
    expect(isVisibleTo(player, ownedToken, "gm")).toBe(false);
  });
});
