/**
 * Damage control (More Thrust, optional): at the end of a turn each Damage
 * Control Party rolls 1D6 and a 6 brings one threshold-lost system back online.
 * Pure math here; which system a repair restores is a player choice the repair
 * UI drives (deferred), and DCPs cannot repair hull damage or needle losses.
 *
 * Source: More Thrust "Damage Control".
 */

import type { ShipClass } from "../ship/hull";

/** Systems repaired this turn: one per Damage Control Party that rolls a 6. */
export function damageControlRepairs(faces: readonly number[]): number {
  return faces.reduce((repairs, face) => repairs + (face >= 6 ? 1 : 0), 0);
}

/** Free Damage Control Parties by class: escort 1, cruiser 2, capital 3. */
export function standardDamageControlParties(cls: ShipClass): number {
  return cls === "escort" ? 1 : cls === "cruiser" ? 2 : 3;
}
