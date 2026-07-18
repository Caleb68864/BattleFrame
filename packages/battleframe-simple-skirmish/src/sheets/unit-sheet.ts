import { MODULE_ID, UNIT_ACTOR_TYPE } from "../constants";

export class MissingActorSheetV2BaseError extends Error {
  constructor() {
    super(
      `${MODULE_ID} | no ActorSheetV2 base class found on ` +
        "foundry.applications.sheets.ActorSheetV2"
    );
    this.name = "MissingActorSheetV2BaseError";
  }
}

export type ActorSheetV2BaseConstructor = new (...args: any[]) => {
  actor?: { system?: unknown };
};

type HandlebarsApplicationMixinFn = (
  base: ActorSheetV2BaseConstructor
) => ActorSheetV2BaseConstructor;

function resolveFoundryApplications(): {
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
} {
  const globalScope = globalThis as unknown as {
    foundry?: {
      applications?: {
        sheets?: { ActorSheetV2?: ActorSheetV2BaseConstructor };
        api?: { HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn };
        apps?: {
          DocumentSheetConfig?: {
            registerSheet: (
              documentClass: unknown,
              scope: string,
              sheetClass: unknown,
              options?: Record<string, unknown>
            ) => void;
          };
        };
      };
    };
    CONFIG?: { Actor?: { documentClass?: unknown } };
  };

  return {
    ActorSheetV2: globalScope.foundry?.applications?.sheets?.ActorSheetV2,
    HandlebarsApplicationMixin: globalScope.foundry?.applications?.api?.HandlebarsApplicationMixin,
    DocumentSheetConfig: globalScope.foundry?.applications?.apps?.DocumentSheetConfig,
    ActorDocumentClass: globalScope.CONFIG?.Actor?.documentClass
  };
}

/**
 * Simple Skirmish's unit sheet. Renders the Basic Game stats a unit card
 * carries -- model count, move, the per-type Attack targets and the Save.
 * Built on ApplicationV2 via `HandlebarsApplicationMixin(ActorSheetV2)`, per
 * v14, and registered under this module's own id.
 */
export function createUnitSheetClass(
  ActorSheetV2Base?: ActorSheetV2BaseConstructor,
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn
): ActorSheetV2BaseConstructor {
  const resolved = resolveFoundryApplications();
  const base = ActorSheetV2Base ?? resolved.ActorSheetV2;
  const mixin = HandlebarsApplicationMixin ?? resolved.HandlebarsApplicationMixin;

  if (!base) {
    throw new MissingActorSheetV2BaseError();
  }

  const MixedBase = mixin ? mixin(base) : base;

  class UnitSheet extends (MixedBase as new (...args: any[]) => any) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-unit-sheet`,
      classes: [MODULE_ID, "sheet", "actor", UNIT_ACTOR_TYPE],
      position: { width: 460, height: 380 },
      // Save edits immediately (v14 DocumentSheetV2 defaults this to false, which
      // -- combined with no submit button -- meant field edits never persisted).
      form: { submitOnChange: true }
    };

    static PARTS = {
      form: { template: `modules/${MODULE_ID}/templates/unit-sheet.hbs` }
    };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function" ? await super._prepareContext(options) : {};

      const actor = (this as unknown as { actor?: { system?: unknown } }).actor;
      context.system = actor?.system ?? {};

      return context;
    }
  }

  return UnitSheet as unknown as ActorSheetV2BaseConstructor;
}

/**
 * Registers the unit sheet for `battleframe-simple-skirmish.unit` through
 * `DocumentSheetConfig.registerSheet`, scoped to this module's package id (see
 * data/unit.ts for the matching Actor subtype key).
 */
export function registerUnitSheet(): void {
  const resolved = resolveFoundryApplications();

  if (!resolved.DocumentSheetConfig || !resolved.ActorDocumentClass) {
    return;
  }

  resolved.DocumentSheetConfig.registerSheet(
    resolved.ActorDocumentClass,
    MODULE_ID,
    createUnitSheetClass(),
    {
      types: [`${MODULE_ID}.${UNIT_ACTOR_TYPE}`],
      makeDefault: true,
      label: "battleframe-simple-skirmish.sheets.unit"
    }
  );
}
