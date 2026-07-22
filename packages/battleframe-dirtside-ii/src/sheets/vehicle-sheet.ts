import { MODULE_ID, VEHICLE_ACTOR_TYPE } from "../constants";
import {
  mixedSheetBase,
  registerSheetFor,
  selectOptions,
  type ActorSheetV2BaseConstructor,
  type HandlebarsApplicationMixinFn,
} from "./base";

interface ActorLike {
  system?: { weapons?: unknown[] };
  update: (changes: Record<string, unknown>) => Promise<unknown>;
}

const DEFAULT_WEAPON = {
  type: "",
  class: 1,
  mount: "turret",
  arc: "turret360",
  turretHeading: 0,
  bands: { close: 0, medium: 0, long: 0, flatMax: 0 },
  guidance: "",
  chitValidity: {},
};

async function onAddWeapon(this: { actor?: ActorLike }): Promise<void> {
  const actor = this.actor;
  if (!actor) return;
  const weapons = [...(actor.system?.weapons ?? [])];
  weapons.push({ ...DEFAULT_WEAPON });
  await actor.update({ "system.weapons": weapons });
}

async function onRemoveWeapon(
  this: { actor?: ActorLike },
  _event: Event,
  target: HTMLElement
): Promise<void> {
  const actor = this.actor;
  if (!actor) return;
  const index = Number(target?.dataset?.index ?? -1);
  const weapons = [...(actor.system?.weapons ?? [])];
  if (Number.isInteger(index) && index >= 0 && index < weapons.length) {
    weapons.splice(index, 1);
    await actor.update({ "system.weapons": weapons });
  }
}

/**
 * The Dirtside II vehicle-element sheet: the stat block (size/signature/stealth/
 * armour/fire-control) plus an editable weapons list. ApplicationV2 via
 * `HandlebarsApplicationMixin(ActorSheetV2)`, `submitOnChange`, no self-wrapped
 * `<form>` (the ApplicationV2 root is the form).
 */
export function createVehicleSheetClass(
  ActorSheetV2Base?: ActorSheetV2BaseConstructor,
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn
): ActorSheetV2BaseConstructor {
  const MixedBase = mixedSheetBase(ActorSheetV2Base, HandlebarsApplicationMixin);

  class VehicleSheet extends (MixedBase as new (...args: any[]) => any) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-vehicle-sheet`,
      classes: [MODULE_ID, "sheet", "actor", VEHICLE_ACTOR_TYPE],
      position: { width: 520, height: 640 },
      form: { submitOnChange: true },
      actions: { addWeapon: onAddWeapon, removeWeapon: onRemoveWeapon },
    };

    static PARTS = { form: { template: `modules/${MODULE_ID}/templates/vehicle-sheet.hbs` } };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function" ? await super._prepareContext(options) : {};
      const system = ((this as any).actor?.system ?? {}) as Record<string, any>;
      context.system = system;
      context.fireControlOptions = selectOptions(
        ["basic", "enhanced", "superior"],
        system.fireControl ?? "basic",
        `${MODULE_ID}.fireControl`
      );
      context.damageOptions = selectOptions(
        ["ok", "damaged", "knocked-out"],
        system.damage ?? "ok",
        `${MODULE_ID}.damage`
      );
      context.postureOptions = selectOptions(
        ["none", "turret-down", "hull-down", "evading", "soft-cover", "popped-up"],
        system.posture ?? "none",
        `${MODULE_ID}.posture`
      );
      return context;
    }
  }
  return VehicleSheet as unknown as ActorSheetV2BaseConstructor;
}

export function registerVehicleSheet(): void {
  registerSheetFor(
    VEHICLE_ACTOR_TYPE,
    createVehicleSheetClass(),
    `${MODULE_ID}.sheets.vehicle`
  );
}
