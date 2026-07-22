import { registerDataModels } from "./data/register";
import { registerSheets } from "./sheets/register";

/**
 * Module entry (the Vite bundle root). Init order per build plan §4 G10:
 *
 *   registerDataModels()            // G1  — DONE
 *   → registerSheets()              // G2  — DONE
 *   → registerStatusEffects()       // G8  (damaged / knocked-out / under-fire)
 *   → registerHoverFields()         // hover stat registry
 *   → registerRoundControl()        // G3  (scene control; seats Combatants)
 *   → advance.registerAdvance(fn)   // G4  (Turn-End reset: clear activated/underFire, bump round)
 *   → registerRuleset({ id, primary: true, … })   // LAST + loud
 *
 * The still-TODO steps are the remaining G-series glue.
 */

const globalHooks = (globalThis as unknown as {
  Hooks?: { once: (event: string, cb: () => void) => void };
}).Hooks;

globalHooks?.once("init", () => {
  registerDataModels();
  registerSheets();
  // TODO(G3,G4,G8–G10): status effects, hover fields, round control, advance,
  // ruleset registration (LAST + loud). See the header note.
});
