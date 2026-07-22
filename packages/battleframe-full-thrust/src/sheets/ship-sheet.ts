import { MODULE_ID, SHIP_ACTOR_TYPE, FIRE_ARCS, WEAPON_KINDS } from "../constants";
import { addWeaponTo, removeWeaponAt, type WeaponMountData } from "./weapon-edit";
import { rowBoundaries } from "../ship/hull";

/** One rendered hull box: its 1-based number, whether it is crossed off, and
 * whether a threshold-row separator follows it. */
export interface HullBoxView {
  number: number;
  damaged: boolean;
  rowEnd: boolean;
}

/**
 * The clickable hull track for the SSD (roadmap #10): `boxes` boxes, the first
 * `damage` of them crossed off, with a separator flagged after each threshold
 * row's last box (except the final box, which is destruction, not a threshold).
 * Pure so the sheet view-model is unit-tested without Foundry.
 */
export function prepareHullBoxes(boxes: number, damage: number, rows: number): HullBoxView[] {
  const total = Math.max(0, Math.floor(boxes));
  const crossed = Math.max(0, Math.min(total, Math.floor(damage)));
  // Row boundaries mark where a threshold row completes; the last equals `total`
  // (destruction), which gets no separator.
  const boundaries = new Set(rowBoundaries(total, rows).filter((b) => b < total));
  const view: HullBoxView[] = [];
  for (let i = 0; i < total; i++) {
    const number = i + 1;
    view.push({ number, damaged: number <= crossed, rowEnd: boundaries.has(number) });
  }
  return view;
}

/**
 * Action handler: a click on hull box N sets `system.hull.damage`. Clicking an
 * intact box fills damage through it (damage = N); clicking an already-damaged
 * box unfills it and everything beyond (damage = N-1). `this` is the sheet app.
 */
export async function onToggleHullBox(this: any, _event: unknown, target: any): Promise<void> {
  const actor = this?.actor;
  if (!actor?.update) {
    return;
  }
  const number = Number(target?.dataset?.number);
  if (!Number.isInteger(number) || number < 1) {
    return;
  }
  const current = actor.system?.hull?.damage ?? 0;
  const next = number <= current ? number - 1 : number;
  await actor.update({ "system.hull.damage": next });
}

/** Action handler: append a default weapon to the ship. `this` is the sheet app. */
export async function onAddWeapon(this: any): Promise<void> {
  const actor = this?.actor;
  if (!actor?.update) {
    return;
  }
  await actor.update({ "system.weapons": addWeaponTo(actor.system?.weapons) });
}

/** Action handler: remove the weapon at the button's data-index. */
export async function onRemoveWeapon(this: any, _event: unknown, target: any): Promise<void> {
  const actor = this?.actor;
  if (!actor?.update) {
    return;
  }
  const index = Number(target?.dataset?.index);
  await actor.update({ "system.weapons": removeWeaponAt(actor.system?.weapons, index) });
}

/** Builds the per-weapon view rows: kind options + arc options with selected flags. */
export function prepareWeaponRows(weapons: readonly WeaponMountData[] | undefined): unknown[] {
  return (weapons ?? []).map((weapon, index) => ({
    index,
    weaponClass: weapon.weaponClass ?? null,
    destroyed: weapon.destroyed,
    kinds: WEAPON_KINDS.map((k) => ({ value: k, selected: k === weapon.kind })),
    arcs: FIRE_ARCS.map((a) => ({ value: a, selected: (weapon.arcs ?? []).includes(a) }))
  }));
}

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
      position: { width: 560, height: 620 },
      form: { submitOnChange: true },
      actions: { addWeapon: onAddWeapon, removeWeapon: onRemoveWeapon, toggleHullBox: onToggleHullBox }
    };

    static PARTS = {
      form: { template: `modules/${MODULE_ID}/templates/ship-sheet.hbs` }
    };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function" ? await super._prepareContext(options) : {};

      const actor = (this as unknown as { actor?: { system?: any } }).actor;
      context.system = actor?.system ?? {};
      // Editable weapon rows: kind/arc options with selected flags for the template.
      context.weapons = prepareWeaponRows(actor?.system?.weapons);
      // Clickable hull damage track (visual SSD).
      const hull = actor?.system?.hull ?? {};
      context.hullBoxes = prepareHullBoxes(hull.boxes ?? 0, hull.damage ?? 0, hull.rows ?? 1);

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
