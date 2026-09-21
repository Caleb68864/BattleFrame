import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createUnitDataClass, registerUnitDataModel } from "../src/data/unit";

/**
 * The Foundry data model is defined against `foundry.data.fields` and a
 * `TypeDataModel` base, both injected here so the schema can be built without a
 * live Foundry. We assert the schema's SHAPE (the stat line), not Foundry's
 * field internals.
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

describe("createUnitDataClass — the INX unit schema", () => {
  it("defines every unit-level stat plus a weapons list", () => {
    const UnitData = createUnitDataClass(FakeTypeDataModel as any) as any;
    const schema = UnitData.defineSchema();

    for (const key of [
      "modelCount",
      "modelsRemaining",
      "move",
      "morale",
      "attackClear",
      "attackCover",
      "armorModifier",
      "armorDice",
      "suppressed",
      "weapons"
    ]) {
      expect(schema).toHaveProperty(key);
    }
  });

  /**
   * The guard on the strip. Every rating ships unentered, so a module that
   * quietly reintroduced a published default -- the easiest way for this work
   * to come undone -- fails here rather than shipping.
   */
  it("ships every rating unentered rather than seeding a playable card", () => {
    const UnitData = createUnitDataClass(FakeTypeDataModel as any) as any;
    const schema = UnitData.defineSchema();

    for (const key of [
      "modelCount",
      "modelsRemaining",
      "move",
      "morale",
      "attackClear",
      "attackCover",
      "armorModifier",
      "armorDice"
    ]) {
      expect((schema[key] as FakeField).config.initial).toBe(0);
    }
  });

  it("puts no upper bound on a rating, because the bound was the published die", () => {
    const UnitData = createUnitDataClass(FakeTypeDataModel as any) as any;
    const schema = UnitData.defineSchema();

    for (const key of ["attackClear", "attackCover", "morale"]) {
      expect((schema[key] as FakeField).config.max).toBeUndefined();
    }
  });
});

describe("registerUnitDataModel", () => {
  it("registers the namespaced actor subtype on CONFIG", () => {
    (globalThis as any).CONFIG = {};
    registerUnitDataModel();
    expect((globalThis as any).CONFIG.Actor.dataModels).toHaveProperty(
      "battleframe-incountry.unit"
    );
  });

  it("is a no-op when CONFIG is absent (not a browser)", () => {
    expect(() => registerUnitDataModel()).not.toThrow();
  });
});
