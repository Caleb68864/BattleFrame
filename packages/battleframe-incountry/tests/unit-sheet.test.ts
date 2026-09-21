import { describe, expect, it } from "vitest";
import { armorRating, createUnitSheetClass } from "../src/sheets/unit-sheet";

describe("armorRating — the card's 'destroyed by X+' string", () => {
  it("renders modifier+1, from whatever the user entered", () => {
    expect(armorRating(3)).toBe("4+");
    expect(armorRating(7)).toBe("8+");
  });

  it("renders a dash rather than a number for an unentered card", () => {
    expect(armorRating(0)).toBe("\u2014");
  });
});

describe("createUnitSheetClass", () => {
  it("builds a sheet class from an injected ActorSheetV2 base + mixin", () => {
    class FakeActorSheetV2 {}
    const identityMixin = (base: any) => base;
    const Sheet = createUnitSheetClass(FakeActorSheetV2 as any, identityMixin as any) as any;

    expect(typeof Sheet).toBe("function");
    expect(Sheet.DEFAULT_OPTIONS.actions).toHaveProperty("addWeapon");
    expect(Sheet.DEFAULT_OPTIONS.actions).toHaveProperty("removeWeapon");
    expect(Sheet.PARTS.form.template).toContain("unit-sheet.hbs");
  });
});
