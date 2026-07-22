import { MODULE_ID } from "../constants";

/**
 * Shared ApplicationV2 sheet plumbing for the three DSII sheets: resolves the
 * Foundry `ActorSheetV2` base + `HandlebarsApplicationMixin` + `DocumentSheetConfig`
 * at call time (so classes build under an injected fake in tests and the real
 * globals live), and a `selectOptions` helper for enum dropdowns.
 */

export class MissingActorSheetV2BaseError extends Error {
  constructor() {
    super(`${MODULE_ID} | no ActorSheetV2 on foundry.applications.sheets.ActorSheetV2`);
    this.name = "MissingActorSheetV2BaseError";
  }
}

export type ActorSheetV2BaseConstructor = new (...args: any[]) => {
  actor?: { system?: unknown };
};

export type HandlebarsApplicationMixinFn = (
  base: ActorSheetV2BaseConstructor
) => ActorSheetV2BaseConstructor;

export interface FoundryApplications {
  ActorSheetV2?: ActorSheetV2BaseConstructor;
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn;
  DocumentSheetConfig?: {
    registerSheet: (
      documentClass: unknown,
      scope: string,
      sheetClass: unknown,
      options?: Record<string, unknown>
    ) => void;
  };
  ActorDocumentClass?: unknown;
}

export function resolveFoundryApplications(): FoundryApplications {
  const g = globalThis as unknown as {
    foundry?: {
      applications?: {
        sheets?: { ActorSheetV2?: ActorSheetV2BaseConstructor };
        api?: { HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn };
        apps?: { DocumentSheetConfig?: FoundryApplications["DocumentSheetConfig"] };
      };
    };
    CONFIG?: { Actor?: { documentClass?: unknown } };
  };
  return {
    ActorSheetV2: g.foundry?.applications?.sheets?.ActorSheetV2,
    HandlebarsApplicationMixin: g.foundry?.applications?.api?.HandlebarsApplicationMixin,
    DocumentSheetConfig: g.foundry?.applications?.apps?.DocumentSheetConfig,
    ActorDocumentClass: g.CONFIG?.Actor?.documentClass,
  };
}

export interface SelectOption {
  value: string;
  label: string;
  selected: boolean;
}

/** Builds a `<select>`'s option array: label is `<i18nPrefix>.<value>`. */
export function selectOptions(
  choices: readonly string[],
  current: string,
  i18nPrefix: string
): SelectOption[] {
  const i18n = (globalThis as unknown as {
    game?: { i18n?: { localize?: (k: string) => string } };
  }).game?.i18n;
  return choices.map((value) => {
    const key = `${i18nPrefix}.${value}`;
    return { value, label: i18n?.localize?.(key) ?? key, selected: value === current };
  });
}

/** Resolves the base + mixin for a sheet factory, throwing loud if the base is absent. */
export function mixedSheetBase(
  ActorSheetV2Base?: ActorSheetV2BaseConstructor,
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn
): ActorSheetV2BaseConstructor {
  const resolved = resolveFoundryApplications();
  const base = ActorSheetV2Base ?? resolved.ActorSheetV2;
  const mixin = HandlebarsApplicationMixin ?? resolved.HandlebarsApplicationMixin;
  if (!base) {
    throw new MissingActorSheetV2BaseError();
  }
  return mixin ? mixin(base) : base;
}

/** Registers a sheet class for one Actor subtype through DocumentSheetConfig. */
export function registerSheetFor(
  subtype: string,
  sheetClass: ActorSheetV2BaseConstructor,
  label: string
): void {
  const resolved = resolveFoundryApplications();
  if (!resolved.DocumentSheetConfig || !resolved.ActorDocumentClass) {
    return;
  }
  resolved.DocumentSheetConfig.registerSheet(resolved.ActorDocumentClass, MODULE_ID, sheetClass, {
    types: [`${MODULE_ID}.${subtype}`],
    makeDefault: true,
    label,
  });
}
