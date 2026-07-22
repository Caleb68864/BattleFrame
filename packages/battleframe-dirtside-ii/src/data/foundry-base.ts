import { MODULE_ID } from "../constants";

/**
 * Shared resolution of the Foundry `TypeDataModel` base and `foundry.data.fields`
 * namespace, used by all three DSII data models. Both are resolved at call time
 * (not import time) so the schemas build under an injected fake in tests and
 * against the real globals in a live world — InCountry's
 * factory-resolves-base-at-call-time pattern.
 */

export class MissingTypeDataModelBaseError extends Error {
  constructor() {
    super(`${MODULE_ID} | no TypeDataModel base class on foundry.abstract.TypeDataModel`);
    this.name = "MissingTypeDataModelBaseError";
  }
}

export type TypeDataModelBaseConstructor = new (...args: any[]) => {
  [key: string]: unknown;
};

export function resolveTypeDataModelBase(): TypeDataModelBaseConstructor {
  const base = (globalThis as any).foundry?.abstract?.TypeDataModel as
    | TypeDataModelBaseConstructor
    | undefined;
  if (!base) {
    throw new MissingTypeDataModelBaseError();
  }
  return base;
}

export function resolveFieldsNamespace(): Record<string, any> {
  return (globalThis as any).foundry?.data?.fields ?? {};
}
