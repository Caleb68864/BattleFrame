import { MODULE_ID, FIGHTER_GROUP_ACTOR_TYPE } from "../constants";
import { createShipSheetClass, type ActorSheetV2BaseConstructor } from "./ship-sheet";

/**
 * The fighter-group sheet. Reuses the ship sheet's ApplicationV2 plumbing
 * (defensive base resolution, submitOnChange, the `_prepareContext` that exposes
 * `system`) but points at the fighter-group template and id. Only the template
 * and registration differ, so the mechanism is not duplicated.
 */

function resolveFoundry(): {
  DocumentSheetConfig?: {
    registerSheet: (dc: unknown, scope: string, sheet: unknown, opts?: Record<string, unknown>) => void;
  };
  ActorDocumentClass?: unknown;
} {
  const g = globalThis as unknown as {
    foundry?: { applications?: { apps?: { DocumentSheetConfig?: any } } };
    CONFIG?: { Actor?: { documentClass?: unknown } };
  };
  return {
    DocumentSheetConfig: g.foundry?.applications?.apps?.DocumentSheetConfig,
    ActorDocumentClass: g.CONFIG?.Actor?.documentClass
  };
}

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
  const resolved = resolveFoundry();
  if (!resolved.DocumentSheetConfig || !resolved.ActorDocumentClass) {
    return;
  }
  resolved.DocumentSheetConfig.registerSheet(
    resolved.ActorDocumentClass,
    MODULE_ID,
    createFighterSheetClass(),
    {
      types: [`${MODULE_ID}.${FIGHTER_GROUP_ACTOR_TYPE}`],
      makeDefault: true,
      label: "battleframe-full-thrust.sheets.fighterGroup"
    }
  );
}
