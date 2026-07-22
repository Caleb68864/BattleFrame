import { afterEach, describe, expect, it, vi } from "vitest";
import { createShipDataClass, registerShipDataModel } from "../src/data/ship";

class FakeField {
  constructor(public readonly options: Record<string, unknown>) {}
}
class FakeSchemaField {
  constructor(public readonly fields: Record<string, unknown>) {}
}
class FakeArrayField {
  constructor(public readonly element: unknown) {}
}

function stubFoundryFields() {
  vi.stubGlobal("foundry", {
    abstract: { TypeDataModel: class {} },
    data: {
      fields: {
        NumberField: FakeField,
        StringField: FakeField,
        BooleanField: FakeField,
        SchemaField: FakeSchemaField,
        ArrayField: FakeArrayField
      }
    }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ship data model schema", () => {
  it("defines the SSD fields a ship needs", () => {
    stubFoundryFields();
    const ShipData = createShipDataClass() as unknown as {
      defineSchema: () => Record<string, unknown>;
    };
    const schema = ShipData.defineSchema();

    for (const key of [
      "mass",
      "thrust",
      "hull",
      "armour",
      "fcs",
      "screens",
      "pds",
      "velocity",
      "course",
      "weapons"
    ]) {
      expect(schema).toHaveProperty(key);
    }
  });

  it("models the hull as a damage track with boxes, damage and rows", () => {
    stubFoundryFields();
    const ShipData = createShipDataClass() as unknown as {
      defineSchema: () => Record<string, { fields?: Record<string, unknown> }>;
    };
    const hull = ShipData.defineSchema().hull;
    expect(hull.fields).toHaveProperty("boxes");
    expect(hull.fields).toHaveProperty("damage");
    expect(hull.fields).toHaveProperty("rows");
  });

  it("models weapons as an array of typed weapon entries", () => {
    stubFoundryFields();
    const ShipData = createShipDataClass() as unknown as {
      defineSchema: () => Record<string, { element?: { fields?: Record<string, unknown> } }>;
    };
    const weapons = ShipData.defineSchema().weapons;
    expect(weapons.element).toBeInstanceOf(FakeSchemaField);
    expect(weapons.element?.fields).toHaveProperty("kind");
    expect(weapons.element?.fields).toHaveProperty("arcs");
    expect(weapons.element?.fields).toHaveProperty("destroyed");
  });
});

describe("prepareDerivedData", () => {
  it("computes a remaining/total hull string for the hover panel", () => {
    stubFoundryFields();
    const ShipData = createShipDataClass() as unknown as new () => any;
    const instance = new ShipData();
    instance.hull = { boxes: 16, damage: 3 };
    instance.prepareDerivedData();
    expect(instance.hullTrack).toBe("13/16");
  });

  it("never shows negative remaining hull", () => {
    stubFoundryFields();
    const ShipData = createShipDataClass() as unknown as new () => any;
    const instance = new ShipData();
    instance.hull = { boxes: 6, damage: 9 };
    instance.prepareDerivedData();
    expect(instance.hullTrack).toBe("0/6");
  });

  it("derives a Points value from the ship's systems", () => {
    stubFoundryFields();
    const ShipData = createShipDataClass() as unknown as new () => any;
    const instance = new ShipData();
    Object.assign(instance, {
      mass: 10, thrust: 4, ftl: false, screens: 0, pds: 0, fcs: 1,
      hull: { boxes: 5, damage: 0 },
      weapons: [{ kind: "beam", weaponClass: 1, arcs: ["F"] }]
    });
    instance.prepareDerivedData();
    // hull 20 + drive (10*4/4=10) + battery cls1 1-arc (2+1=3) = 33.
    expect(instance.pointsValue).toBe(33);
  });
});

describe("registerShipDataModel", () => {
  it("registers the ship data model under the namespaced key", () => {
    stubFoundryFields();
    const CONFIG: { Actor?: { dataModels?: Record<string, unknown> } } = { Actor: {} };
    vi.stubGlobal("CONFIG", CONFIG);

    registerShipDataModel();

    expect(CONFIG.Actor?.dataModels?.["battleframe-full-thrust.ship"]).toBeTypeOf("function");
  });

  it("does nothing when CONFIG is absent (pre-init / non-Foundry context)", () => {
    vi.stubGlobal("CONFIG", undefined);
    expect(() => registerShipDataModel()).not.toThrow();
  });
});
