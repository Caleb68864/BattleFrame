import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createUnitDataClass, registerUnitDataModel } from "../src/data/unit";

/**
 * The Foundry data model is defined against `foundry.data.fields` and a
 * `TypeDataModel` base, both injected here so the schema builds without a live
 * Foundry. We assert the schema's SHAPE (the SG2 unit card), not Foundry's field
 * internals.
 */

class FakeField {
  constructor(public readonly config: Record<string, unknown> = {}) {}
}

class FakeTypeDataModel {}

function installFakeFieldsNamespace(): void {
  (globalThis as any).foundry = {
    abstract: { TypeDataModel: FakeTypeDataModel },
    data: {
      fields: {
        NumberField: FakeField,
        StringField: FakeField,
        BooleanField: FakeField,
        ArrayField: FakeField,
        SchemaField: FakeField
      }
    }
  };
}

beforeEach(() => {
  installFakeFieldsNamespace();
});

afterEach(() => {
  delete (globalThis as any).foundry;
  delete (globalThis as any).CONFIG;
});

describe("createUnitDataClass — the SG2 unit schema", () => {
  it("defines identity, roster, weapons, and the live morale counters", () => {
    const UnitData = createUnitDataClass(FakeTypeDataModel as any) as any;
    const schema = UnitData.defineSchema();

    for (const key of [
      "quality",
      "leadership",
      "figures",
      "weapons",
      "confidence",
      "suppression",
      "inPosition",
      "disorganised",
      "activated",
      "missionMotivation",
      "fatigue"
    ]) {
      expect(schema).toHaveProperty(key);
    }
  });

  it("offers the five die types as the quality choices, defaulting d8", () => {
    const UnitData = createUnitDataClass(FakeTypeDataModel as any) as any;
    const schema = UnitData.defineSchema();
    expect((schema.quality as FakeField).config.choices).toEqual([
      "d4",
      "d6",
      "d8",
      "d10",
      "d12"
    ]);
    expect((schema.quality as FakeField).config.initial).toBe("d8");
  });

  it("clamps confidence to the 0..4 ladder and suppression to 0..3", () => {
    const UnitData = createUnitDataClass(FakeTypeDataModel as any) as any;
    const schema = UnitData.defineSchema();
    expect((schema.confidence as FakeField).config).toMatchObject({ min: 0, max: 4, initial: 4 });
    expect((schema.suppression as FakeField).config).toMatchObject({ min: 0, max: 3, initial: 0 });
  });

  it("clamps leadership to LV 1..3", () => {
    const UnitData = createUnitDataClass(FakeTypeDataModel as any) as any;
    const schema = UnitData.defineSchema();
    expect((schema.leadership as FakeField).config).toMatchObject({ min: 1, max: 3, initial: 2 });
  });
});

describe("registerUnitDataModel", () => {
  it("registers the namespaced actor subtype on CONFIG", () => {
    (globalThis as any).CONFIG = {};
    registerUnitDataModel();
    expect((globalThis as any).CONFIG.Actor.dataModels).toHaveProperty(
      "battleframe-stargrunt-ii.unit"
    );
  });

  it("is a no-op when CONFIG is absent (not a browser)", () => {
    expect(() => registerUnitDataModel()).not.toThrow();
  });
});
