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

interface ActorLike {
  system?: { weapons?: unknown[] };
  update: (changes: Record<string, unknown>) => Promise<unknown>;
}

const DEFAULT_WEAPON = { name: "Rifle", count: 1, dmg: 1, attackDice: 2, owDice: 1 };

/** Adds a fresh weapon row. Bound by ApplicationV2 with `this` = the sheet. */
async function onAddWeapon(this: { actor?: ActorLike }): Promise<void> {
  const actor = this.actor;
  if (!actor) {
    return;
  }
  const weapons = [...(actor.system?.weapons ?? [])];
  weapons.push({ ...DEFAULT_WEAPON });
  await actor.update({ "system.weapons": weapons });
}

/** Removes the weapon row named by the button's `data-index`. */
async function onRemoveWeapon(
  this: { actor?: ActorLike },
  _event: Event,
  target: HTMLElement
): Promise<void> {
  const actor = this.actor;
  if (!actor) {
    return;
  }
  const index = Number(target?.dataset?.index ?? -1);
  const weapons = [...(actor.system?.weapons ?? [])];
  if (Number.isInteger(index) && index >= 0 && index < weapons.length) {
    weapons.splice(index, 1);
    await actor.update({ "system.weapons": weapons });
  }
}

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
 * The "Destroyed by damage X+" rating the card prints, from the modifier the
 * user entered. An unentered modifier has no rating to print, so it shows as a
 * dash rather than resolving to a number nobody typed.
 */
export function armorRating(armorModifier: number): string {
  return armorModifier > 0 ? `${armorModifier + 1}+` : "\u2014";
}

/**
 * INCOUNTRY's unit sheet. Renders the unit-card stat line (models, move, morale,
 * the two Attack values, armor tier) plus an editable list of weapon profiles.
 * Built on ApplicationV2 via `HandlebarsApplicationMixin(ActorSheetV2)` and
 * registered under this module's own id.
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
      position: { width: 480, height: 560 },
      form: { submitOnChange: true },
      actions: {
        addWeapon: onAddWeapon,
        removeWeapon: onRemoveWeapon
      }
    };

    static PARTS = {
      form: { template: `modules/${MODULE_ID}/templates/unit-sheet.hbs` }
    };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function" ? await super._prepareContext(options) : {};

      const actor = (this as unknown as { actor?: { system?: Record<string, unknown> } }).actor;
      const system = (actor?.system ?? {}) as Record<string, unknown>;
      context.system = system;

      // The tier picker is gone with the tier table: armour is two numbers off
      // the card now, edited like every other rating on this sheet.
      context.armorRating = armorRating(Number(system.armorModifier) || 0);

      return context;
    }
  }

  return UnitSheet as unknown as ActorSheetV2BaseConstructor;
}

/**
 * Registers the unit sheet for `battleframe-incountry.unit` through
 * `DocumentSheetConfig.registerSheet`, scoped to this module's package id.
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
      label: "battleframe-incountry.sheets.unit"
    }
  );
}
