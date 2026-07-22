import { afterEach, describe, expect, it, vi } from "vitest";
import { createFighterGroupDataClass, registerFighterGroupDataModel } from "../src/data/fighter-group";

class FakeField {
  constructor(public readonly options: Record<string, unknown>) {}
}

function stubFoundryFields() {
  vi.stubGlobal("foundry", {
    abstract: { TypeDataModel: class {} },
    data: {
      fields: {
        NumberField: FakeField,
        StringField: FakeField,
        BooleanField: FakeField
      }
    }
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("fighter group data model", () => {
  it("defines size, type, endurance and morale fields", () => {
    stubFoundryFields();
    const FighterData = createFighterGroupDataClass() as unknown as {
      defineSchema: () => Record<string, unknown>;
    };
    const schema = FighterData.defineSchema();
    for (const key of ["size", "fighterType", "endurance", "moraleBroken"]) {
      expect(schema).toHaveProperty(key);
    }
  });
});

describe("registerFighterGroupDataModel", () => {
  it("registers under the namespaced key", () => {
    stubFoundryFields();
    const CONFIG: { Actor?: { dataModels?: Record<string, unknown> } } = { Actor: {} };
    vi.stubGlobal("CONFIG", CONFIG);
    registerFighterGroupDataModel();
    expect(CONFIG.Actor?.dataModels?.["battleframe-full-thrust.fighter-group"]).toBeTypeOf("function");
  });

  it("does nothing when CONFIG is absent", () => {
    vi.stubGlobal("CONFIG", undefined);
    expect(() => registerFighterGroupDataModel()).not.toThrow();
  });
});
