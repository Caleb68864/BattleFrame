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
