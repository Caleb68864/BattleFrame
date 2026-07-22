import {
  MODULE_ID,
  VEHICLE_ACTOR_TYPE,
  INFANTRY_ACTOR_TYPE,
  UNIT_ACTOR_TYPE,
} from "../constants";
import { createVehicleDataClass } from "./vehicle";
import { createInfantryDataClass } from "./infantry";
import { createUnitDataClass } from "./unit";

/**
 * Registers the three DSII Actor data models at `init` on `CONFIG.Actor.dataModels`
 * (Foundry v14). Keys are `<MODULE_ID>.<subtype>` because Foundry namespaces a
 * module's document subtypes by the manifest id — see the naming reconciliation
 * in `constants.ts`. No-op when CONFIG is absent (not a browser).
 */
export function registerDataModels(): void {
  const config = (globalThis as any).CONFIG as
    | { Actor?: { dataModels?: Record<string, unknown> } }
    | undefined;
  if (!config) {
    return;
  }

  config.Actor = config.Actor ?? {};
  config.Actor.dataModels = config.Actor.dataModels ?? {};
  config.Actor.dataModels[`${MODULE_ID}.${VEHICLE_ACTOR_TYPE}`] = createVehicleDataClass();
  config.Actor.dataModels[`${MODULE_ID}.${INFANTRY_ACTOR_TYPE}`] = createInfantryDataClass();
  config.Actor.dataModels[`${MODULE_ID}.${UNIT_ACTOR_TYPE}`] = createUnitDataClass();
}
