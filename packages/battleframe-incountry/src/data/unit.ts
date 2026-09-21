import { MODULE_ID, UNIT_ACTOR_TYPE } from "../constants";

export class MissingTypeDataModelBaseError extends Error {
  constructor() {
    super(
      `${MODULE_ID} | no TypeDataModel base class found on ` +
        "foundry.abstract.TypeDataModel"
    );
    this.name = "MissingTypeDataModelBaseError";
  }
}

export type TypeDataModelBaseConstructor = new (...args: any[]) => {
  name?: string;
  [key: string]: unknown;
};

function resolveTypeDataModelBase(): TypeDataModelBaseConstructor {
  const globalScope = globalThis as unknown as {
    foundry?: { abstract?: { TypeDataModel?: TypeDataModelBaseConstructor } };
  };

  const base = globalScope.foundry?.abstract?.TypeDataModel;
  if (!base) {
    throw new MissingTypeDataModelBaseError();
  }
  return base;
}

function resolveFieldsNamespace(): Record<string, any> {
  const globalScope = globalThis as unknown as {
    foundry?: { data?: { fields?: Record<string, any> } };
  };
  return globalScope.foundry?.data?.fields ?? {};
}

/**
 * The INX unit stat line (rulebook A). Split across two levels exactly as the
 * unit card is: unit-wide stats (move, morale, the two Attack values, armor
 * tier) plus a list of weapon profiles (dice + DMG + a react profile each).
 *
 *  - `modelCount`      -- starting models (the card badge; used to reset).
 *  - `modelsRemaining` -- models still alive; the unit is destroyed at 0.
 *  - `move`            -- movement allowance in inches.
 *  - `morale`          -- suppression resistance (the check rolls over the best
 *                         surviving morale).
 *  - `attackClear` / `attackCover` -- roll <= this on a d10 to hit; the lower
 *                         cover value applies when the target is in cover.
 *  - `armorModifier`   -- added to the armor roll; the card prints it as
 *                         "Destroyed by damage X+", which is `X - 1` here.
 *  - `armorDice`       -- dice thrown on an armor check.
 *  - `suppressed`      -- the one suppression marker.
 *  - `weapons[]`       -- { name, count, dmg, attackDice, owDice }; owDice 0 =
 *                         the weapon cannot react.
 */
export function createUnitDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class UnitData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const fields = resolveFieldsNamespace();
      const { NumberField, StringField, BooleanField, ArrayField, SchemaField } = fields;
      const schema: Record<string, unknown> = {};

      if (!NumberField) {
        return schema;
      }

      const intField = (min: number, initial: number, max?: number): unknown =>
        new NumberField({ required: true, nullable: false, integer: true, min, max, initial });

      // Every rating ships at zero -- an empty card, waiting for the user's.
      //
      // `move`, `morale` and the two Attack values used to seed 6, 6, 6 and 4,
      // and the upper bounds of 10 were the published die. A seeded rating is
      // the same defect as a shipped table, only quieter: it is this module
      // writing a number onto the player's card and then never being asked
      // about it again. The sister project was fixed for exactly this -- an
      // import that answered a missing die with 8 and an empty roster with "a
      // weapon called Rifles" -- and the reasoning carries here unchanged.
      //
      // Zero is not a playable rating, which is the point: it is visibly
      // unentered rather than plausibly wrong.
      schema.modelCount = intField(0, 0);
      schema.modelsRemaining = intField(0, 0);
      schema.move = intField(0, 0);
      schema.morale = intField(0, 0);
      schema.attackClear = intField(0, 0);
      schema.attackCover = intField(0, 0);
      // These two replaced an `armorType` StringField whose three tier names
      // each mapped to a published modifier -- the one field on this schema
      // whose value came from the repository rather than the user's card.
      schema.armorModifier = intField(0, 0);
      schema.armorDice = intField(0, 0);
      schema.suppressed = new BooleanField({ initial: false });

      if (ArrayField && SchemaField) {
        schema.weapons = new ArrayField(
          new SchemaField({
            // Blank and zero for the same reason as the ratings above: a
            // weapon profile seeded with a name and a dice count is a stat
            // block this module wrote, sitting in the player's roster.
            name: new StringField({ required: true, blank: true, initial: "" }),
            count: new NumberField({ integer: true, min: 0, initial: 0 }),
            dmg: new NumberField({ integer: true, min: 0, initial: 0 }),
            attackDice: new NumberField({ integer: true, min: 0, initial: 0 }),
            owDice: new NumberField({ integer: true, min: 0, initial: 0 })
          }),
          { initial: [] }
        );
      }

      return schema;
    }
  }

  return UnitData as unknown as TypeDataModelBaseConstructor;
}

/**
 * Registers `battleframe-incountry.unit` as an Actor data model at `init`, per
 * Foundry v14's `CONFIG.Actor.dataModels` path. Namespaced by module id so it
 * cannot collide with another ruleset's `unit` subtype.
 */
export function registerUnitDataModel(): void {
  const globalScope = globalThis as unknown as {
    CONFIG?: { Actor?: { dataModels?: Record<string, unknown> } };
  };

  if (!globalScope.CONFIG) {
    return;
  }

  globalScope.CONFIG.Actor = globalScope.CONFIG.Actor ?? {};
  globalScope.CONFIG.Actor.dataModels = globalScope.CONFIG.Actor.dataModels ?? {};
  globalScope.CONFIG.Actor.dataModels[`${MODULE_ID}.${UNIT_ACTOR_TYPE}`] = createUnitDataClass();
}
