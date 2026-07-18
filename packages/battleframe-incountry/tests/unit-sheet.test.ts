import { describe, expect, it } from "vitest";
import { armorRating, createUnitSheetClass } from "../src/sheets/unit-sheet";

describe("armorRating — the card's 'destroyed by X+' string", () => {
  it("renders modifier+1 for each tier", () => {
    expect(armorRating("unarmored")).toBe("5+");
    expect(armorRating("body")).toBe("6+");
    expect(armorRating("advanced")).toBe("7+");
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
