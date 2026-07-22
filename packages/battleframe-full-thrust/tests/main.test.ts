import { afterEach, describe, expect, it, vi } from "vitest";
import { registerFullThrustRuleset } from "../src/main";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registerFullThrustRuleset", () => {
  it("registers via the system api with the expected definition", () => {
    const registerRuleset = vi.fn(() => ({ ok: true }));
    vi.stubGlobal("battleframe", { api: { registerRuleset } });

    registerFullThrustRuleset();

    expect(registerRuleset).toHaveBeenCalledTimes(1);
    const def = registerRuleset.mock.calls[0][0] as Record<string, unknown>;
    expect(def.id).toBe("battleframe-full-thrust");
    expect(def.title).toBe("Full Thrust");
    expect(def.primary).toBe(true);
    expect(def.battleframeCompatibility).toEqual({ minimum: "0.1.0", verified: "0.1.0" });
  });

  it("throws loudly when the system api is absent -- never registers silently", () => {
    vi.stubGlobal("battleframe", undefined);
    vi.stubGlobal("game", undefined);
    vi.stubGlobal("ui", { notifications: { error: vi.fn() } });

    expect(() => registerFullThrustRuleset()).toThrow(/did not register/);
  });

  it("throws when the system rejects the ruleset (e.g. a duplicate id)", () => {
    const error = vi.fn();
    vi.stubGlobal("battleframe", {
      api: { registerRuleset: () => ({ ok: false, errors: ["duplicate id"] }) }
    });
    vi.stubGlobal("ui", { notifications: { error } });

    expect(() => registerFullThrustRuleset()).toThrow(/duplicate id/);
    expect(error).toHaveBeenCalledTimes(1);
  });
});

describe("entry point wiring (the init hook actually reaches every registration)", () => {
  it("registers the data model, the sheet, the hover fields, and the ruleset on init", async () => {
    const inits: Array<() => void> = [];
    const registerRuleset = vi.fn(() => ({ ok: true }));
    const registerSheet = vi.fn();
    const hoverRegister = vi.fn();
    const CONFIG: { Actor: { documentClass: unknown; dataModels: Record<string, unknown> } } = {
      Actor: { documentClass: class {}, dataModels: {} }
    };

    const on = vi.fn();
    vi.stubGlobal("Hooks", {
      once: (name: string, cb: () => void) => {
        if (name === "init") inits.push(cb);
      },
      on
    });
    vi.stubGlobal("battleframe", {
      api: { registerRuleset },
      hover: { register: hoverRegister }
    });
    vi.stubGlobal("CONFIG", CONFIG);
    vi.stubGlobal("foundry", {
      abstract: { TypeDataModel: class {} },
      data: {
        fields: {
          NumberField: class {},
          StringField: class {},
          BooleanField: class {},
          SchemaField: class {},
          ArrayField: class {}
        }
      },
      applications: {
        sheets: { ActorSheetV2: class {} },
        api: { HandlebarsApplicationMixin: (base: unknown) => base },
        apps: { DocumentSheetConfig: { registerSheet } }
      }
    });

    vi.resetModules();
    await import("../src/main");

    expect(inits.length).toBeGreaterThan(0);
    for (const cb of inits) cb();

    expect(CONFIG.Actor.dataModels["battleframe-full-thrust.ship"]).toBeTypeOf("function");
    expect(registerSheet).toHaveBeenCalledTimes(1);
    expect(hoverRegister).toHaveBeenCalledTimes(1);
    expect(registerRuleset).toHaveBeenCalledTimes(1);
    // The scene control was registered -- the trigger that keeps combat reachable.
    expect(on).toHaveBeenCalledWith("getSceneControlButtons", expect.any(Function));
  });
});
