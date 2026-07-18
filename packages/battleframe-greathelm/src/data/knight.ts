import { KNIGHT_ACTOR_TYPE, MODULE_ID } from "../constants";

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
    foundry?: {
      abstract?: { TypeDataModel?: TypeDataModelBaseConstructor };
    };
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
 * `KnightData` is GREATHELM's Actor subtype. Per
 * vault/greathelm/knights-have-no-stat-line.md, knights are mechanically
 * identical -- there is no stat line to model. This schema is
 * deliberately minimal: momentum and damage markers (both capped at 3,
 * see vault/greathelm/momentum.md and vault/greathelm/damage-and-removal.md)
 * are the only per-knight numbers the QSR evidences. Equipment,
 * warband construction, and campaign identity are "not found" in the QSR
 * (see vault/greathelm/open-questions.md) and are intentionally absent
 * here, not invented.
 */
function resolveNumberFieldOptions(max: number): Record<string, unknown> {
  return { required: true, nullable: false, integer: true, min: 0, max, initial: 0 };
}

export function createKnightDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class KnightData extends (TypeDataModelBase as new (...args: any[]) => any) {
    static defineSchema(): Record<string, unknown> {
      const fields = resolveFieldsNamespace();
      const NumberField = fields.NumberField;

      const schema: Record<string, unknown> = {};

      if (NumberField) {
        schema.momentum = new NumberField(resolveNumberFieldOptions(3));
        schema.damage = new NumberField(resolveNumberFieldOptions(3));
      }

      return schema;
    }
  }

  return KnightData as unknown as TypeDataModelBaseConstructor;
}

/**
 * Registers `battleframe-greathelm.knight` as an Actor data model at
 * `init`, per Foundry v14's `CONFIG.Actor.dataModels` registration path.
 * Namespaced by module id so it cannot collide with another ruleset's
 * Actor subtype of the same short name.
 */
export function registerKnightDataModel(): void {
  const globalScope = globalThis as unknown as {
    CONFIG?: { Actor?: { dataModels?: Record<string, unknown> } };
  };

  if (!globalScope.CONFIG) {
    return;
  }

  globalScope.CONFIG.Actor = globalScope.CONFIG.Actor ?? {};
  globalScope.CONFIG.Actor.dataModels = globalScope.CONFIG.Actor.dataModels ?? {};
  globalScope.CONFIG.Actor.dataModels[`${MODULE_ID}.${KNIGHT_ACTOR_TYPE}`] =
    createKnightDataClass();
}
