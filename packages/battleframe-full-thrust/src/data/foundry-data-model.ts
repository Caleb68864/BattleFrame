/**
 * Shared Foundry data-model plumbing, so each Actor subtype (ship, fighter
 * group) does not re-derive the base-class / fields resolution and the
 * CONFIG.Actor.dataModels registration. Defensive resolution keeps the data
 * classes constructible in tests without a live Foundry.
 */

import { MODULE_ID } from "../constants";

export type TypeDataModelBaseConstructor = new (...args: any[]) => {
  [key: string]: unknown;
};

export class MissingTypeDataModelBaseError extends Error {
  constructor() {
    super(`${MODULE_ID} | no TypeDataModel base class found on foundry.abstract.TypeDataModel`);
    this.name = "MissingTypeDataModelBaseError";
  }
}

/** The Foundry `TypeDataModel` base, or a thrown MissingTypeDataModelBaseError. */
export function resolveTypeDataModelBase(): TypeDataModelBaseConstructor {
  const base = (globalThis as unknown as {
    foundry?: { abstract?: { TypeDataModel?: TypeDataModelBaseConstructor } };
  }).foundry?.abstract?.TypeDataModel;

  if (!base) {
    throw new MissingTypeDataModelBaseError();
  }
  return base;
}

/** The `foundry.data.fields` namespace, or an empty object (pre-init / tests). */
export function resolveFieldsNamespace(): Record<string, any> {
  return (globalThis as unknown as {
    foundry?: { data?: { fields?: Record<string, any> } };
  }).foundry?.data?.fields ?? {};
}

/**
 * Registers a data model class under `CONFIG.Actor.dataModels["<moduleId>.<type>"]`.
 * No-op when CONFIG is absent (pre-init / non-Foundry context).
 */
export function registerActorDataModel(
  typeKey: string,
  factory: () => TypeDataModelBaseConstructor
): void {
  const globalScope = globalThis as unknown as {
    CONFIG?: { Actor?: { dataModels?: Record<string, unknown> } };
  };
  if (!globalScope.CONFIG) {
    return;
  }
  globalScope.CONFIG.Actor = globalScope.CONFIG.Actor ?? {};
  globalScope.CONFIG.Actor.dataModels = globalScope.CONFIG.Actor.dataModels ?? {};
  globalScope.CONFIG.Actor.dataModels[`${MODULE_ID}.${typeKey}`] = factory();
}
