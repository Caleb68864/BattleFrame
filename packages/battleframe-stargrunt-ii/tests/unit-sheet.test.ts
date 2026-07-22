import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildUnitSheetContext,
  dieOptions,
  createUnitSheetClass,
  registerUnitSheet,
  MissingActorSheetV2BaseError
} from "../src/sheets/unit-sheet";

afterEach(() => {
  delete (globalThis as any).foundry;
  delete (globalThis as any).CONFIG;
});

describe("dieOptions", () => {
  it("offers the five die types with the current value flagged selected", () => {
    const opts = dieOptions("d8");
    expect(opts.map((o) => o.value)).toEqual(["d4", "d6", "d8", "d10", "d12"]);
    expect(opts.find((o) => o.value === "d8")?.selected).toBe(true);
    expect(opts.find((o) => o.value === "d4")?.selected).toBe(false);
  });
});

describe("buildUnitSheetContext", () => {
  it("precomputes select options for quality, figures, and weapons", () => {
    const ctx = buildUnitSheetContext({
      quality: "d10",
      missionMotivation: "high",
      fatigue: "tired",
      figures: [{ armour: "d6", status: "wounded" }],
      weapons: [{ impact: "d12", rangeClass: "close" }]
    });

    expect((ctx.qualityOptions as any[]).find((o) => o.value === "d10").selected).toBe(true);
    expect((ctx.motivationOptions as any[]).find((o) => o.value === "high").selected).toBe(true);

    const figure = (ctx.figures as any[])[0];
    expect(figure.index).toBe(0);
    expect(figure.armourOptions.find((o: any) => o.value === "d6").selected).toBe(true);
    expect(figure.statusOptions.find((o: any) => o.value === "wounded").selected).toBe(true);

    const weapon = (ctx.weapons as any[])[0];
    expect(weapon.impactOptions.find((o: any) => o.value === "d12").selected).toBe(true);
    expect(weapon.rangeClassOptions.find((o: any) => o.value === "close").selected).toBe(true);
  });

  it("handles an empty roster", () => {
    const ctx = buildUnitSheetContext({});
    expect(ctx.figures).toEqual([]);
    expect(ctx.weapons).toEqual([]);
  });
});

class FakeSheetBase {
  actor?: unknown;
}

describe("createUnitSheetClass", () => {
  it("declares submitOnChange and the roster/weapon actions", () => {
    const Sheet = createUnitSheetClass(FakeSheetBase as any, (b: any) => b) as any;
    expect(Sheet.DEFAULT_OPTIONS.form.submitOnChange).toBe(true);
    expect(Object.keys(Sheet.DEFAULT_OPTIONS.actions)).toEqual(
      expect.arrayContaining(["addFigure", "removeFigure", "addWeapon", "removeWeapon"])
    );
  });

  it("throws when no ActorSheetV2 base is available", () => {
    expect(() => createUnitSheetClass()).toThrow(MissingActorSheetV2BaseError);
  });
});

describe("registerUnitSheet", () => {
  it("registers the sheet for the namespaced unit type", () => {
    const registerSheet = vi.fn();
    (globalThis as any).foundry = {
      applications: {
        sheets: { ActorSheetV2: FakeSheetBase },
        api: { HandlebarsApplicationMixin: (b: any) => b },
        apps: { DocumentSheetConfig: { registerSheet } }
      }
    };
    (globalThis as any).CONFIG = { Actor: { documentClass: class {} } };

    registerUnitSheet();

    expect(registerSheet).toHaveBeenCalledTimes(1);
    const [, scope, , options] = registerSheet.mock.calls[0];
    expect(scope).toBe("battleframe-stargrunt-ii");
    expect(options.types).toEqual(["battleframe-stargrunt-ii.unit"]);
    expect(options.makeDefault).toBe(true);
  });

  it("is a no-op when the sheet config is absent", () => {
    expect(() => registerUnitSheet()).not.toThrow();
  });
});
