import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createUnitDataClass, migrateStartingModels, registerUnitDataModel } from "../src/data/unit";
import { MODULE_ID, UNIT_ACTOR_TYPE } from "../src/constants";

/**
 * Roadmap P1: a token resource bar needs a `{ value, max }` pair. `models` is
 * only the live count, so a bar had no max. `startingModels` is that max.
 */

afterEach(() => vi.unstubAllGlobals());

const TYPE = `${MODULE_ID}.${UNIT_ACTOR_TYPE}`;

class Base {}

/** A stand-in NumberField that keeps its options, so the schema can be inspected. */
class FakeNumberField {
  constructor(public options: Record<string, unknown>) {}
}

describe("starting model count", () => {
  it("is a field on the unit schema", () => {
    vi.stubGlobal("foundry", { data: { fields: { NumberField: FakeNumberField } } });
    const Data = createUnitDataClass(Base as never) as any;

    const schema = Data.defineSchema();

    expect(schema.startingModels).toBeInstanceOf(FakeNumberField);
    expect(schema.startingModels.options).toMatchObject({ integer: true, min: 0, nullable: false });
  });

  it("derives a value/max pair, which is the shape Foundry draws as a bar", () => {
    const Data = createUnitDataClass(Base as never) as any;
    const unit = new Data();
    unit.startingModels = 6;
    unit.models = 2;

    unit.prepareDerivedData();

    expect(unit.modelsBar).toEqual({ value: 2, max: 6 });
  });

  it("never draws a bar fuller than full", () => {
    const Data = createUnitDataClass(Base as never) as any;
    const unit = new Data();
    unit.startingModels = 1;
    unit.models = 4;

    unit.prepareDerivedData();

    expect(unit.modelsBar).toEqual({ value: 4, max: 4 });
  });

  it("tells Foundry the attribute is trackable", () => {
    vi.stubGlobal("CONFIG", { Actor: {} });
    vi.stubGlobal("foundry", { abstract: { TypeDataModel: Base }, data: { fields: {} } });

    registerUnitDataModel();

    expect((globalThis as any).CONFIG.Actor.trackableAttributes[TYPE]).toEqual({ bar: ["modelsBar"], value: [] });
  });
});

describe("keeping the starting count at or above the live count", () => {
  it("raises it at create when the unit is created with more models", async () => {
    const Data = createUnitDataClass(Base as never) as any;
    const unit = new Data();
    unit.models = 5;
    unit.startingModels = 1;
    const updateSource = vi.fn();
    unit.parent = { updateSource };

    await unit._preCreate({}, {}, {});

    expect(updateSource).toHaveBeenCalledWith({ "system.startingModels": 5 });
  });

  it("leaves a create alone when the starting count already covers it", async () => {
    const Data = createUnitDataClass(Base as never) as any;
    const unit = new Data();
    unit.models = 3;
    unit.startingModels = 5;
    const updateSource = vi.fn();
    unit.parent = { updateSource };

    await unit._preCreate({}, {}, {});

    expect(updateSource).not.toHaveBeenCalled();
  });

  it("raises it when the sheet sets more models than the unit started with", async () => {
    const Data = createUnitDataClass(Base as never) as any;
    const unit = new Data();
    unit.models = 1;
    unit.startingModels = 1;
    const changes: any = { system: { models: 5 } };

    await unit._preUpdate(changes, {}, {});

    expect(changes.system.startingModels).toBe(5);
  });

  it("does not touch it when casualties lower the count", async () => {
    const Data = createUnitDataClass(Base as never) as any;
    const unit = new Data();
    unit.models = 5;
    unit.startingModels = 5;
    const changes: any = { system: { models: 3 } };

    await unit._preUpdate(changes, {}, {});

    expect(changes.system).toEqual({ models: 3 });
  });

  it("handles a flattened update key", async () => {
    const Data = createUnitDataClass(Base as never) as any;
    const unit = new Data();
    unit.models = 1;
    unit.startingModels = 1;
    const changes: any = { "system.models": 4 };

    await unit._preUpdate(changes, {}, {});

    expect(changes["system.startingModels"]).toBe(4);
  });

  it("leaves an update that touches neither count alone", async () => {
    const Data = createUnitDataClass(Base as never) as any;
    const unit = new Data();
    unit.models = 4;
    unit.startingModels = 1; // an unmigrated actor: the ready migration owns this one
    const changes: any = { name: "Spearmen" };

    await unit._preUpdate(changes, {}, {});

    expect(changes).toEqual({ name: "Spearmen" });
  });
});

describe("migrating existing units", () => {
  function actor(type: string, models: number, startingModels: number) {
    return { type, system: { models, startingModels }, update: vi.fn(async () => undefined) };
  }

  it("sets the starting count from the current count on units that predate the field", async () => {
    // A unit saved before the field existed loads with the schema's initial value.
    const old = actor(TYPE, 5, 1);
    const fine = actor(TYPE, 3, 5);
    const other = actor("battleframe-incountry.unit", 9, 0);

    const migrated = await migrateStartingModels([old, fine, other]);

    expect(migrated).toBe(1);
    expect(old.update).toHaveBeenCalledWith({ "system.startingModels": 5 });
    expect(fine.update).not.toHaveBeenCalled();
    expect(other.update).not.toHaveBeenCalled();
  });

  it("runs at ready for the GM only", async () => {
    const readies: Array<() => unknown> = [];
    const old = actor(TYPE, 4, 1);
    vi.stubGlobal("Hooks", {
      once: (event: string, cb: () => unknown) => {
        if (event === "ready") readies.push(cb);
      },
      on: () => undefined,
    });
    vi.stubGlobal("game", { user: { isGM: false }, actors: [old] });

    vi.resetModules();
    await import("../src/main");
    expect(readies.length).toBe(1);

    await readies[0]();
    expect(old.update).not.toHaveBeenCalled();

    (globalThis as any).game.user.isGM = true;
    await readies[0]();
    expect(old.update).toHaveBeenCalledWith({ "system.startingModels": 4 });
  });
});

describe("unit sheet", () => {
  it("lets the player enter the starting count", () => {
    const template = readFileSync(join(__dirname, "..", "templates", "unit-sheet.hbs"), "utf8");
    expect(template).toContain('name="system.startingModels"');
    expect(template).toContain(`${MODULE_ID}.fields.startingModels`);
  });
});
