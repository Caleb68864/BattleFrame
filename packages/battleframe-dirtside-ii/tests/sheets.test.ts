import { describe, expect, it } from "vitest";
import { selectOptions } from "../src/sheets/base";
import { createVehicleSheetClass } from "../src/sheets/vehicle-sheet";
import { createInfantrySheetClass } from "../src/sheets/infantry-sheet";
import { createUnitSheetClass } from "../src/sheets/unit-sheet";

const FakeBase = class {};
const identityMixin = (b: any) => b;

/**
 * The three ApplicationV2 sheets. Built from an injected ActorSheetV2 base +
 * HandlebarsApplicationMixin so the class shape is testable without a live
 * Foundry. We assert DEFAULT_OPTIONS (submitOnChange, actions) + the template.
 */

describe("selectOptions — precomputed <select> option arrays", () => {
  it("marks the current value selected and localises via the i18n prefix", () => {
    const opts = selectOptions(["a", "b"], "b", "prefix");
    expect(opts).toEqual([
      { value: "a", label: "prefix.a", selected: false },
      { value: "b", label: "prefix.b", selected: true },
    ]);
  });
});

describe("createVehicleSheetClass", () => {
  it("is a form sheet with submitOnChange + weapon add/remove actions", () => {
    const Sheet = createVehicleSheetClass(FakeBase as any, identityMixin as any) as any;
    expect(Sheet.DEFAULT_OPTIONS.form.submitOnChange).toBe(true);
    expect(Sheet.DEFAULT_OPTIONS.actions).toHaveProperty("addWeapon");
    expect(Sheet.DEFAULT_OPTIONS.actions).toHaveProperty("removeWeapon");
    expect(Sheet.PARTS.form.template).toContain("vehicle-sheet.hbs");
  });
});

describe("createInfantrySheetClass", () => {
  it("is a form sheet pointing at the infantry template", () => {
    const Sheet = createInfantrySheetClass(FakeBase as any, identityMixin as any) as any;
    expect(Sheet.DEFAULT_OPTIONS.form.submitOnChange).toBe(true);
    expect(Sheet.PARTS.form.template).toContain("infantry-sheet.hbs");
  });
});

describe("createUnitSheetClass", () => {
  it("is a form sheet pointing at the unit template", () => {
    const Sheet = createUnitSheetClass(FakeBase as any, identityMixin as any) as any;
    expect(Sheet.DEFAULT_OPTIONS.form.submitOnChange).toBe(true);
    expect(Sheet.PARTS.form.template).toContain("unit-sheet.hbs");
  });
});
