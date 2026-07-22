import { MODULE_ID, SHIP_ACTOR_TYPE } from "../constants";

/**
 * The Full Thrust ship sheet -- a live SSD. Renders the ship's mass/thrust,
 * damage track (armour + hull boxes), fire control, screens, point defence, its
 * current velocity/course, and its weapon mounts. Built on ApplicationV2 via
 * `HandlebarsApplicationMixin(ActorSheetV2)` per v14, `submitOnChange` so field
 * edits persist, registered under this module's own id.
 */

export type ActorSheetV2BaseConstructor = new (...args: any[]) => {
  actor?: { system?: unknown };
};

type HandlebarsApplicationMixinFn = (
  base: ActorSheetV2BaseConstructor
) => ActorSheetV2BaseConstructor;

export class MissingActorSheetV2BaseError extends Error {
  constructor() {
    super(`${MODULE_ID} | no ActorSheetV2 base class found on foundry.applications.sheets.ActorSheetV2`);
    this.name = "MissingActorSheetV2BaseError";
  }
}

export function resolveFoundryApplications(): {
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
  const g = globalThis as unknown as {
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
    ActorSheetV2: g.foundry?.applications?.sheets?.ActorSheetV2,
    HandlebarsApplicationMixin: g.foundry?.applications?.api?.HandlebarsApplicationMixin,
    DocumentSheetConfig: g.foundry?.applications?.apps?.DocumentSheetConfig,
    ActorDocumentClass: g.CONFIG?.Actor?.documentClass
  };
}

export function createShipSheetClass(
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

  class ShipSheet extends (MixedBase as new (...args: any[]) => any) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-ship-sheet`,
      classes: [MODULE_ID, "sheet", "actor", SHIP_ACTOR_TYPE],
      position: { width: 520, height: 560 },
      form: { submitOnChange: true }
    };

    static PARTS = {
      form: { template: `modules/${MODULE_ID}/templates/ship-sheet.hbs` }
    };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function" ? await super._prepareContext(options) : {};

      const actor = (this as unknown as { actor?: { system?: unknown } }).actor;
      context.system = actor?.system ?? {};

      return context;
    }
  }

  return ShipSheet as unknown as ActorSheetV2BaseConstructor;
}

/**
 * Registers an Actor sheet for `<moduleId>.<typeKey>` via
 * `DocumentSheetConfig.registerSheet`. Shared by every subtype's sheet so the
 * registration boilerplate lives in one place. No-op when Foundry's sheet
 * machinery is absent (pre-init / tests).
 */
export function registerActorSheet(
  typeKey: string,
  sheetClass: ActorSheetV2BaseConstructor,
  label: string
): void {
  const resolved = resolveFoundryApplications();
  if (!resolved.DocumentSheetConfig || !resolved.ActorDocumentClass) {
    return;
  }
  resolved.DocumentSheetConfig.registerSheet(
    resolved.ActorDocumentClass,
    MODULE_ID,
    sheetClass,
    { types: [`${MODULE_ID}.${typeKey}`], makeDefault: true, label }
  );
}

/** Registers the ship sheet for `battleframe-full-thrust.ship`. */
export function registerShipSheet(): void {
  registerActorSheet(SHIP_ACTOR_TYPE, createShipSheetClass(), "battleframe-full-thrust.sheets.ship");
}
