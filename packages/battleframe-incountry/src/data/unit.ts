import { ARMOR_MODIFIER, MODULE_ID, UNIT_ACTOR_TYPE } from "../constants";

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

/** The armor tiers the card offers, as the StringField's choices. */
const ARMOR_TYPES = Object.keys(ARMOR_MODIFIER);

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
 *  - `armorType`       -- unarmored / body / advanced; sets the armor modifier.
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

      schema.modelCount = intField(1, 1);
      schema.modelsRemaining = intField(0, 1);
      schema.move = intField(0, 6);
      schema.morale = intField(1, 6, 10);
      schema.attackClear = intField(1, 6, 10);
      schema.attackCover = intField(1, 4, 10);
      schema.armorType = new StringField({
        required: true,
        blank: false,
        choices: ARMOR_TYPES,
        initial: "unarmored"
      });
      schema.suppressed = new BooleanField({ initial: false });

      if (ArrayField && SchemaField) {
        schema.weapons = new ArrayField(
          new SchemaField({
            name: new StringField({ required: true, blank: true, initial: "Rifle" }),
            count: new NumberField({ integer: true, min: 0, initial: 1 }),
            dmg: new NumberField({ integer: true, min: 0, initial: 1 }),
            attackDice: new NumberField({ integer: true, min: 0, initial: 2 }),
            owDice: new NumberField({ integer: true, min: 0, initial: 1 })
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
