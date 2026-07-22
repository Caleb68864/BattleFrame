import { MODULE_ID, INFANTRY_ACTOR_TYPE } from "../constants";
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

async function onAddWeapon(this: { actor?: ActorLike }): Promise<void> {
  const actor = this.actor;
  if (!actor) return;
  const weapons = [...(actor.system?.weapons ?? [])];
  weapons.push("");
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
 * The Dirtside II infantry-stand sheet: troop type, chits drawn, kill total,
 * posture, and a simple weapons-tags list. ApplicationV2, `submitOnChange`.
 */
export function createInfantrySheetClass(
  ActorSheetV2Base?: ActorSheetV2BaseConstructor,
  HandlebarsApplicationMixin?: HandlebarsApplicationMixinFn
): ActorSheetV2BaseConstructor {
  const MixedBase = mixedSheetBase(ActorSheetV2Base, HandlebarsApplicationMixin);

  class InfantrySheet extends (MixedBase as new (...args: any[]) => any) {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-infantry-sheet`,
      classes: [MODULE_ID, "sheet", "actor", INFANTRY_ACTOR_TYPE],
      position: { width: 460, height: 520 },
      form: { submitOnChange: true },
      actions: { addWeapon: onAddWeapon, removeWeapon: onRemoveWeapon },
    };

    static PARTS = { form: { template: `modules/${MODULE_ID}/templates/infantry-sheet.hbs` } };

    async _prepareContext(options: unknown): Promise<Record<string, unknown>> {
      const context: Record<string, unknown> =
        typeof super._prepareContext === "function" ? await super._prepareContext(options) : {};
      const system = ((this as any).actor?.system ?? {}) as Record<string, any>;
      context.system = system;
      context.troopTypeOptions = selectOptions(
        ["militia", "line", "powered"],
        system.troopType ?? "line",
        `${MODULE_ID}.troopType`
      );
      context.postureOptions = selectOptions(
        ["open", "soft", "dug-in", "urban"],
        system.posture ?? "open",
        `${MODULE_ID}.infantryPosture`
      );
      return context;
    }
  }
  return InfantrySheet as unknown as ActorSheetV2BaseConstructor;
}

export function registerInfantrySheet(): void {
  registerSheetFor(
    INFANTRY_ACTOR_TYPE,
    createInfantrySheetClass(),
    `${MODULE_ID}.sheets.infantry`
  );
}
