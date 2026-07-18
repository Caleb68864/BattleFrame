import { afterEach, describe, expect, it, vi } from "vitest";
import { createUnitSheetClass, registerUnitSheet } from "../src/sheets/unit-sheet";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createUnitSheetClass", () => {
  it("builds a sheet class pointing at the module's own template", () => {
    class FakeBase {}
    const SheetClass = createUnitSheetClass(FakeBase, (base) => base) as unknown as {
      PARTS: { form: { template: string } };
      DEFAULT_OPTIONS: { classes: string[] };
    };

    expect(SheetClass.PARTS.form.template).toBe(
      "modules/battleframe-simple-skirmish/templates/unit-sheet.hbs"
    );
    expect(SheetClass.DEFAULT_OPTIONS.classes).toContain("battleframe-simple-skirmish");
  });
});

describe("registerUnitSheet", () => {
  it("registers the unit sheet as default for the namespaced unit subtype", () => {
    const registerSheet = vi.fn();
    vi.stubGlobal("foundry", {
      applications: {
        sheets: { ActorSheetV2: class {} },
        api: { HandlebarsApplicationMixin: (base: unknown) => base },
        apps: { DocumentSheetConfig: { registerSheet } }
      }
    });
    vi.stubGlobal("CONFIG", { Actor: { documentClass: class {} } });

    registerUnitSheet();

    expect(registerSheet).toHaveBeenCalledTimes(1);
    const [, scope, , options] = registerSheet.mock.calls[0];
    expect(scope).toBe("battleframe-simple-skirmish");
    expect(options.types).toEqual(["battleframe-simple-skirmish.unit"]);
    expect(options.makeDefault).toBe(true);
  });

  it("does nothing when the sheet-config API is absent", () => {
    vi.stubGlobal("foundry", {});
    vi.stubGlobal("CONFIG", {});
    expect(() => registerUnitSheet()).not.toThrow();
  });
});
