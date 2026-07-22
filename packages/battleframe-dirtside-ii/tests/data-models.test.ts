import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createVehicleDataClass } from "../src/data/vehicle";
import { createInfantryDataClass } from "../src/data/infantry";
import { createUnitDataClass } from "../src/data/unit";
import { registerDataModels } from "../src/data/register";

/**
 * The three Foundry data models, built against `foundry.data.fields` and a
 * `TypeDataModel` base, both injected so the schema builds without a live
 * Foundry. We assert the schema's SHAPE, not Foundry's field internals.
 */

class FakeField {
  constructor(public readonly config: Record<string, unknown> = {}) {}
}
class FakeTypeDataModel {}

function installFakeFields(): void {
  (globalThis as any).foundry = {
    abstract: { TypeDataModel: FakeTypeDataModel },
    data: {
      fields: {
        NumberField: FakeField,
        StringField: FakeField,
        BooleanField: FakeField,
        ArrayField: FakeField,
        SchemaField: FakeField,
        ObjectField: FakeField,
      },
    },
  };
}

beforeEach(installFakeFields);
afterEach(() => {
  delete (globalThis as any).foundry;
  delete (globalThis as any).CONFIG;
});

describe("createVehicleDataClass — the vehicle element schema", () => {
  it("defines the core vehicle stat block + weapons list", () => {
    const schema = (createVehicleDataClass(FakeTypeDataModel as any) as any).defineSchema();
    for (const key of [
      "sizeClass",
      "signatureBasic",
      "stealthLevels",
      "armour",
      "fireControl",
      "weapons",
      "posture",
      "damage",
      "mobilityHit",
      "systemsDown",
      "isCommandVehicle",
    ]) {
      expect(schema).toHaveProperty(key);
    }
  });

  it("offers the damage marker as ok/damaged/knocked-out", () => {
    const schema = (createVehicleDataClass(FakeTypeDataModel as any) as any).defineSchema();
    expect((schema.damage as FakeField).config.choices).toEqual(["ok", "damaged", "knocked-out"]);
  });
});

describe("createInfantryDataClass — the infantry element schema", () => {
  it("defines the infantry stat block", () => {
    const schema = (createInfantryDataClass(FakeTypeDataModel as any) as any).defineSchema();
    for (const key of ["troopType", "chitsDrawn", "killTotal", "posture", "canFirefight", "removed"]) {
      expect(schema).toHaveProperty(key);
    }
  });
});

describe("createUnitDataClass — the token-less grouping schema", () => {
  it("defines the unit-level command + confidence block", () => {
    const schema = (createUnitDataClass(FakeTypeDataModel as any) as any).defineSchema();
    for (const key of [
      "role",
      "quality",
      "leadership",
      "confidence",
      "isCommandUnit",
      "commandVehicleId",
      "activated",
      "underFire",
    ]) {
      expect(schema).toHaveProperty(key);
    }
  });

  it("offers the four confidence levels", () => {
    const schema = (createUnitDataClass(FakeTypeDataModel as any) as any).defineSchema();
    expect((schema.confidence as FakeField).config.choices).toEqual([
      "confident",
      "steady",
      "shaken",
      "broken",
    ]);
  });
});

describe("registerDataModels — all three subtypes under the module id", () => {
  it("registers vehicle, infantry and unit on CONFIG.Actor.dataModels", () => {
    (globalThis as any).CONFIG = {};
    registerDataModels();
    const models = (globalThis as any).CONFIG.Actor.dataModels;
    expect(models).toHaveProperty("battleframe-dirtside-ii.vehicle");
    expect(models).toHaveProperty("battleframe-dirtside-ii.infantry");
    expect(models).toHaveProperty("battleframe-dirtside-ii.unit");
  });

  it("is a no-op when CONFIG is absent (not a browser)", () => {
    expect(() => registerDataModels()).not.toThrow();
  });
});
