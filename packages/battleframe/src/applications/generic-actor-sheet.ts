import { SYSTEM_ID } from "../constants";
import { GENERIC_ACTOR_TYPE } from "../data/generic-actor";

export class MissingActorSheetV2BaseError extends Error {
  constructor() {
    super(
      `${SYSTEM_ID} | no ActorSheetV2 base class found on ` +
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
    HandlebarsApplicationMixin:
      globalScope.foundry?.applications?.api?.HandlebarsApplicationMixin,
    DocumentSheetConfig: globalScope.foundry?.applications?.apps?.DocumentSheetConfig,
    ActorDocumentClass: globalScope.CONFIG?.Actor?.documentClass,
  };
}

/**
 * Battleframe's default sheet for the `generic` Actor type -- the
 * fallback landing pad, so it must render with nothing more than the
 * generic data model's own fields. Built on ApplicationV2 via
 * `HandlebarsApplicationMixin(ActorSheetV2)`, per v14's application
 * framework.
 */
export function createGenericActorSheetClass(
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

  class GenericActorSheet extends (MixedBase as new (...args: any[]) => any) {
    static DEFAULT_OPTIONS = {
      id: `${SYSTEM_ID}-generic-actor-sheet`,
      classes: [SYSTEM_ID, "sheet", "actor", GENERIC_ACTOR_TYPE],
      position: { width: 480, height: 520 },
    };

    static PARTS = {
      form: { template: `systems/${SYSTEM_ID}/templates/generic-actor-sheet.hbs` },
    };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function"
          ? await super._prepareContext(options)
          : {};

      const actor = (this as unknown as { actor?: { system?: unknown } }).actor;
      context.system = actor?.system ?? {};

      return context;
    }
  }

  return GenericActorSheet as unknown as ActorSheetV2BaseConstructor;
}

function hooksAvailable(): boolean {
  return typeof Hooks !== "undefined";
}

/**
 * Registers the generic sheet for the `generic` Actor type through
 * `DocumentSheetConfig.registerSheet`, the standard v14 path -- core
 * does not reach into `CONFIG.Actor.sheetClasses` directly.
 */
export function registerGenericActorSheet(): void {
  const resolved = resolveFoundryApplications();

  if (!resolved.DocumentSheetConfig || !resolved.ActorDocumentClass) {
    return;
  }

  resolved.DocumentSheetConfig.registerSheet(
    resolved.ActorDocumentClass,
    SYSTEM_ID,
    createGenericActorSheetClass(),
    {
      types: [GENERIC_ACTOR_TYPE],
      makeDefault: true,
      label: "battleframe.sheets.generic-actor",
    }
  );
}

if (hooksAvailable()) {
  Hooks.once("init", () => {
    registerGenericActorSheet();
  });
}
