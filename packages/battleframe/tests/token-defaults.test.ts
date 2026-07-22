/**
 * token-defaults: a neutral registry so a ruleset can give its actor SUBTYPES a
 * default token image (a game icon) instead of the mystery-man default. Mirrors
 * the status/hover registries. The ruleset owns WHICH image; the engine owns the
 * single preCreateActor hook + the "don't override a chosen image" rule.
 */
import { describe, expect, it } from "vitest";
import { createTokenDefaultsApi, shouldApplyDefault } from "../src/ui/token-defaults";

describe("token-defaults", () => {
  it("returns the registered default image for a type, undefined otherwise", () => {
    const api = createTokenDefaultsApi();
    api.registerDefaultImage("x.ship", "modules/x/icons/ship.svg");
    expect(api.defaultImageFor("x.ship")).toBe("modules/x/icons/ship.svg");
    expect(api.defaultImageFor("x.other")).toBeUndefined();
    expect(api.defaultImageFor(undefined)).toBeUndefined();
  });

  it("keeps each registry instance isolated", () => {
    const a = createTokenDefaultsApi();
    const b = createTokenDefaultsApi();
    a.registerDefaultImage("x.unit", "a.svg");
    expect(b.defaultImageFor("x.unit")).toBeUndefined();
  });
});

describe("shouldApplyDefault", () => {
  it("applies only when there is no deliberately-chosen image", () => {
    expect(shouldApplyDefault(undefined)).toBe(true);
    expect(shouldApplyDefault("")).toBe(true);
    expect(shouldApplyDefault("icons/svg/mystery-man.svg")).toBe(true); // the core default
    expect(shouldApplyDefault("modules/x/icons/custom.svg")).toBe(false); // user chose one
  });
});
