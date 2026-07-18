import { afterEach, describe, expect, it, vi } from "vitest";
import { registerSimpleSkirmishRuleset } from "../src/main";
import { registerUnitDataModel } from "../src/data/unit";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registerSimpleSkirmishRuleset", () => {
  it("registers via the system api with the expected definition", () => {
    const registerRuleset = vi.fn(() => ({ ok: true }));
    vi.stubGlobal("battleframe", { api: { registerRuleset } });

    registerSimpleSkirmishRuleset();

    expect(registerRuleset).toHaveBeenCalledTimes(1);
    const def = registerRuleset.mock.calls[0][0] as Record<string, unknown>;
    expect(def.id).toBe("battleframe-simple-skirmish");
    expect(def.title).toBe("Simple Skirmish");
    expect(def.primary).toBe(true);
    expect(def.battleframeCompatibility).toEqual({ minimum: "0.1.0", verified: "0.1.0" });
  });

  it("throws loudly when the system api is absent -- never registers silently", () => {
    vi.stubGlobal("battleframe", undefined);
    vi.stubGlobal("game", undefined);
    vi.stubGlobal("ui", { notifications: { error: vi.fn() } });

    expect(() => registerSimpleSkirmishRuleset()).toThrow(/did not register/);
  });

  it("throws when the system rejects the ruleset (e.g. a duplicate id)", () => {
    const error = vi.fn();
    vi.stubGlobal("battleframe", {
      api: { registerRuleset: () => ({ ok: false, errors: ["duplicate id"] }) }
    });
    vi.stubGlobal("ui", { notifications: { error } });

    expect(() => registerSimpleSkirmishRuleset()).toThrow(/duplicate id/);
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe("registerUnitDataModel", () => {
  it("registers the unit data model under the namespaced key", () => {
    const CONFIG: { Actor?: { dataModels?: Record<string, unknown> } } = { Actor: {} };
    vi.stubGlobal("CONFIG", CONFIG);
    vi.stubGlobal("foundry", {
      abstract: { TypeDataModel: class {} },
      data: { fields: { NumberField: class {} } }
    });

    registerUnitDataModel();

    expect(CONFIG.Actor?.dataModels?.["battleframe-simple-skirmish.unit"]).toBeTypeOf("function");
  });

  it("does nothing when CONFIG is absent (pre-init / non-Foundry context)", () => {
    vi.stubGlobal("CONFIG", undefined);
    expect(() => registerUnitDataModel()).not.toThrow();
  });
});

describe("entry point wiring (the init hook actually reaches every registration)", () => {
  it("registers the data model, the sheet, and the ruleset when init fires", async () => {
    // Testing the functions in isolation proves they *can* register; it does not
    // prove main.ts's `init` hook *calls* them. That gap is exactly how a
    // ruleset ships wired-but-unreachable (this project's recurring failure). So
    // stand up a fake Foundry, import the entry point, fire init, and assert all
    // three landed.
    const inits: Array<() => void> = [];
    const registerRuleset = vi.fn(() => ({ ok: true }));
    const registerSheet = vi.fn();
    const CONFIG: { Actor: { documentClass: unknown; dataModels: Record<string, unknown> } } = {
      Actor: { documentClass: class {}, dataModels: {} }
    };

    vi.stubGlobal("Hooks", {
      once: (name: string, cb: () => void) => {
        if (name === "init") inits.push(cb);
      }
    });
    vi.stubGlobal("battleframe", { api: { registerRuleset } });
    vi.stubGlobal("CONFIG", CONFIG);
    vi.stubGlobal("foundry", {
      abstract: { TypeDataModel: class {} },
      data: { fields: { NumberField: class {} } },
      applications: {
        sheets: { ActorSheetV2: class {} },
        api: { HandlebarsApplicationMixin: (base: unknown) => base },
        apps: { DocumentSheetConfig: { registerSheet } }
      }
    });

    vi.resetModules();
    await import("../src/main");

    expect(inits.length).toBeGreaterThan(0); // the init hook was registered at module top level
    for (const cb of inits) cb(); // fire it, as Foundry would

    expect(CONFIG.Actor.dataModels["battleframe-simple-skirmish.unit"]).toBeTypeOf("function");
    expect(registerSheet).toHaveBeenCalledTimes(1);
    expect(registerRuleset).toHaveBeenCalledTimes(1);
  });
});
