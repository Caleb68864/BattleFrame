import { registerDataModels } from "./data/register";

/**
 * Module entry (the Vite bundle root). FIRST-SLICE STATE: only the data models
 * (G1) are wired here so the vehicle/infantry/unit Actor subtypes register in a
 * live world and the package builds. The rest of the init order is deferred
 * G-series glue (handled by the parent), and MUST land in this exact order per
 * build plan §4 G10:
 *
 *   registerDataModels()            // G1  — DONE below
 *   → registerSheets()              // G2
 *   → registerStatusEffects()       // G8  (damaged / knocked-out / under-fire)
 *   → registerHoverFields()         // hover stat registry
 *   → registerRoundControl()        // G3  (scene control; seats Combatants)
 *   → advance.registerAdvance(fn)   // G4  (Turn-End reset: clear activated/underFire, bump round)
 *   → registerRuleset({ id, primary: true, … })   // LAST + loud
 *
 * Resolve the engine API defensively when that lands
 * (`globalThis.battleframe?.api ?? game.battleframe?.api`).
 */

const globalHooks = (globalThis as unknown as {
  Hooks?: { once: (event: string, cb: () => void) => void };
}).Hooks;

globalHooks?.once("init", () => {
  registerDataModels();
  // TODO(G2–G10): sheets, status effects, hover fields, round control, advance,
  // ruleset registration (LAST + loud). See the header note.
});
