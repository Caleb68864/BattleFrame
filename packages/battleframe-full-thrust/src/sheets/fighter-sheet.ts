import { MODULE_ID, FIGHTER_GROUP_ACTOR_TYPE } from "../constants";
import {
  createShipSheetClass,
  registerActorSheet,
  type ActorSheetV2BaseConstructor
} from "./ship-sheet";

/**
 * The fighter-group sheet. Reuses the ship sheet's ApplicationV2 plumbing
 * (defensive base resolution, submitOnChange, the `_prepareContext` that exposes
 * `system`) but points at the fighter-group template and id. Only the template
 * and registration differ, so the mechanism is not duplicated.
 */

export function createFighterSheetClass(): ActorSheetV2BaseConstructor {
  const Base = createShipSheetClass() as unknown as new (...args: any[]) => any;

  class FighterSheet extends Base {
    static DEFAULT_OPTIONS = {
      id: `${MODULE_ID}-fighter-sheet`,
      classes: [MODULE_ID, "sheet", "actor", FIGHTER_GROUP_ACTOR_TYPE],
      position: { width: 380, height: 260 },
      form: { submitOnChange: true }
    };

    static PARTS = {
      form: { template: `modules/${MODULE_ID}/templates/fighter-sheet.hbs` }
    };
  }

  return FighterSheet as unknown as ActorSheetV2BaseConstructor;
}

export function registerFighterSheet(): void {
  registerActorSheet(
    FIGHTER_GROUP_ACTOR_TYPE,
    createFighterSheetClass(),
    "battleframe-full-thrust.sheets.fighterGroup"
  );
}
