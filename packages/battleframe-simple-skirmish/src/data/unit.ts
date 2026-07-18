import { MODULE_ID, UNIT_ACTOR_TYPE, MOVE_STANDARD_INCHES } from "../constants";

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
 * The Basic Game unit stats (Simple Fantasy Skirmish, Peter Vodden, CC BY-NC
 * 4.0). A d6 stat is a **target number**, and its absence means "cannot do that
 * action" -- modelled as a nullable field defaulting to null, never 0 (a 0
 * would read as "hits on any roll", the opposite of "cannot").
 *
 * - `models`  -- how many models remain; the number of dice thrown, and the
 *   thing removed by casualties. A unit at 0 is destroyed.
 * - `move`    -- move speed in inches (3 shambling / 6 standard / 9 fast).
 * - `attackMelee/Ranged/Magic` -- roll >= this on a d6 to hit; null = cannot.
 * - `save`    -- the defender rolls a d6 per hit; **< save = one casualty**;
 *   null = no save, every hit is a casualty.
 * - `skill`   -- Advanced Game; roll >= this to succeed. Carried but unused in
 *   the Basic Game.
 */
function nullableD6Target(): Record<string, unknown> {
  return { required: false, nullable: true, integer: true, min: 1, max: 6, initial: null };
}

export function createUnitDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class UnitData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const fields = resolveFieldsNamespace();
      const NumberField = fields.NumberField;

      const schema: Record<string, unknown> = {};

      if (NumberField) {
        schema.models = new NumberField({
          required: true,
          nullable: false,
          integer: true,
          min: 0,
          initial: 1
        });
        schema.move = new NumberField({
          required: true,
          nullable: false,
          integer: true,
          min: 0,
          initial: MOVE_STANDARD_INCHES
        });
        schema.attackMelee = new NumberField(nullableD6Target());
        schema.attackRanged = new NumberField(nullableD6Target());
        schema.attackMagic = new NumberField(nullableD6Target());
        schema.save = new NumberField(nullableD6Target());
        schema.skill = new NumberField(nullableD6Target());
      }

      return schema;
    }
  }

  return UnitData as unknown as TypeDataModelBaseConstructor;
}

/**
 * Registers `battleframe-simple-skirmish.unit` as an Actor data model at
 * `init`, per Foundry v14's `CONFIG.Actor.dataModels` path. Namespaced by
 * module id so it cannot collide with another ruleset's `unit` subtype.
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
  globalScope.CONFIG.Actor.dataModels[`${MODULE_ID}.${UNIT_ACTOR_TYPE}`] =
    createUnitDataClass();
}
