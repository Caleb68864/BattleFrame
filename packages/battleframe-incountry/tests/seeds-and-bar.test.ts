import { afterEach, describe, expect, it, vi } from "vitest";
import { createUnitSheetClass } from "../src/sheets/unit-sheet";
import { createUnitDataClass, registerUnitDataModel } from "../src/data/unit";
import { MODULE_ID, UNIT_ACTOR_TYPE } from "../src/constants";

afterEach(() => vi.unstubAllGlobals());

describe("Add Weapon", () => {
  it("adds a blank row, not a stat block the module wrote", async () => {
    class Base {}
    const Sheet = createUnitSheetClass(Base as never, ((b: unknown) => b) as never) as any;
    const update = vi.fn(async () => undefined);

    await Sheet.DEFAULT_OPTIONS.actions.addWeapon.call({ actor: { system: { weapons: [] }, update } });

    expect(update).toHaveBeenCalledWith({
      "system.weapons": [{ name: "", count: 0, dmg: 0, attackDice: 0, owDice: 0 }],
    });
  });
});

describe("model count as a token resource bar", () => {
  class Base {}

  it("derives a value/max pair, which is the shape Foundry draws as a bar", () => {
    const Data = createUnitDataClass(Base as never) as any;
    const unit = new Data();
    unit.modelCount = 7;
    unit.modelsRemaining = 4;

    unit.prepareDerivedData();

    expect(unit.modelsBar).toEqual({ value: 4, max: 7 });
  });

  it("tells Foundry the attribute is trackable", () => {
    vi.stubGlobal("CONFIG", { Actor: {} });
    vi.stubGlobal("foundry", { abstract: { TypeDataModel: Base }, data: { fields: {} } });

    registerUnitDataModel();

    const type = `${MODULE_ID}.${UNIT_ACTOR_TYPE}`;
    expect((globalThis as any).CONFIG.Actor.trackableAttributes[type].bar).toEqual(["modelsBar"]);
  });
});
