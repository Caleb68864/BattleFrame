import { registerVehicleSheet } from "./vehicle-sheet";
import { registerInfantrySheet } from "./infantry-sheet";
import { registerUnitSheet } from "./unit-sheet";

/** Registers all three DSII actor sheets (G2). No-op without DocumentSheetConfig. */
export function registerSheets(): void {
  registerVehicleSheet();
  registerInfantrySheet();
  registerUnitSheet();
}
