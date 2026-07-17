import { SYSTEM_ID } from "../constants";

export const GENERIC_ACTOR_TYPE = "generic";

export class MissingTypeDataModelBaseError extends Error {
  constructor() {
    super(
      `${SYSTEM_ID} | no TypeDataModel base class found on ` +
        "foundry.abstract.TypeDataModel"
    );
    this.name = "MissingTypeDataModelBaseError";
  }
}

export type TypeDataModelBaseConstructor = new (...args: any[]) => {
  name?: string;
  [key: string]: unknown;
};

/**
 * `GenericActorData` is battleframe's own minimal Actor data model. It
 * exists so the system is usable with zero rulesets installed, and so
 * orphaned Actors (see rulesets/orphan-check.ts) have somewhere safe to
 * land instead of vanishing when the ruleset that defined their real
 * type gets disabled.
 *
 * Deliberately has NO freeform/ObjectField escape hatch for arbitrary
 * system data -- see decisions in
 * docs/specs/2026-07-16-battleframe-core-mvp.md (SS-08). The orphan
 * payload is preserved in flags, which need no schema, not in this
 * model's own schema.
 */
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

export function createGenericActorDataClass(
  TypeDataModelBase: TypeDataModelBaseConstructor = resolveTypeDataModelBase()
): TypeDataModelBaseConstructor {
  class GenericActorData extends (TypeDataModelBase as new (
    ...args: any[]
  ) => any) {
    static defineSchema(): Record<string, unknown> {
      const fields = resolveFieldsNamespace();
      const StringField = fields.StringField;
      const HTMLField = fields.HTMLField;

      const schema: Record<string, unknown> = {};

      if (StringField) {
        schema.notes = new StringField({ required: false, blank: true });
      }

      if (HTMLField) {
        schema.biography = new HTMLField({ required: false, blank: true });
      }

      return schema;
    }
  }

  return GenericActorData as unknown as TypeDataModelBaseConstructor;
}

function hooksAvailable(): boolean {
  return typeof Hooks !== "undefined";
}

/**
 * Registers `generic` as an Actor data model at `init`, per Foundry v14's
 * `CONFIG.Actor.dataModels` registration path.
 */
export function registerGenericActorDataModel(): void {
  const globalScope = globalThis as unknown as {
    CONFIG?: { Actor?: { dataModels?: Record<string, unknown> } };
  };

  if (!globalScope.CONFIG) {
    return;
  }

  globalScope.CONFIG.Actor = globalScope.CONFIG.Actor ?? {};
  globalScope.CONFIG.Actor.dataModels = globalScope.CONFIG.Actor.dataModels ?? {};
  globalScope.CONFIG.Actor.dataModels[GENERIC_ACTOR_TYPE] =
    createGenericActorDataClass();
}

if (hooksAvailable()) {
  Hooks.once("init", () => {
    registerGenericActorDataModel();
  });
}
