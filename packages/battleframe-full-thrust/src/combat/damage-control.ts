/**
 * Damage control (More Thrust, optional): at the end of a turn each Damage
 * Control Party rolls 1D6 and a 6 brings one threshold-lost system back online.
 * Pure math here; which system a repair restores is a player choice the repair
 * UI drives (deferred), and DCPs cannot repair hull damage or needle losses.
 *
 * Source: More Thrust "Damage Control".
 */

import type { ShipClass } from "../ship/hull";
import { applySystemRepairs, type ShipSystemLike, type SystemRef } from "../ship/systems";

/** Systems repaired this turn: one per Damage Control Party that rolls a 6. */
export function damageControlRepairs(faces: readonly number[]): number {
  return faces.reduce((repairs, face) => repairs + (face >= 6 ? 1 : 0), 0);
}

/** Free Damage Control Parties by class: escort 1, cruiser 2, capital 3. */
export function standardDamageControlParties(cls: ShipClass): number {
  return cls === "escort" ? 1 : cls === "cruiser" ? 2 : 3;
}

interface RepairableSystem extends ShipSystemLike {
  weapons?: Array<{ destroyed?: boolean }>;
}

/**
 * The knocked-out systems a ship can repair, most-important first: fire control,
 * then drives, then weapons, then screens, then point defence. (Which system a
 * DCP restores is the player's choice in the rules; this is a sensible default
 * priority for the automated end-of-turn repair.)
 */
function repairableRefs(system: RepairableSystem): SystemRef[] {
  const refs: SystemRef[] = [];
  for (let i = 0; i < (system.fcsLost ?? 0); i++) refs.push({ type: "fcs" });
  if ((system.driveHits ?? 0) > 0) refs.push({ type: "drive" });
  (system.weapons ?? []).forEach((w, index) => {
    if (w.destroyed) refs.push({ type: "weapon", index });
  });
  for (let i = 0; i < (system.screensLost ?? 0); i++) refs.push({ type: "screen" });
  for (let i = 0; i < (system.pdsLost ?? 0); i++) refs.push({ type: "pds" });
  return refs;
}

/**
 * The `actor.update` for applying `repairs` damage-control successes to a ship:
 * restores up to `repairs` knocked-out systems in priority order -- decrementing
 * the LOST counters / stepping driveHits back, and un-destroying weapon mounts.
 * DCPs cannot repair hull damage (not touched here).
 */
export function resolveDamageControl(
  system: RepairableSystem,
  repairs: number
): Record<string, any> {
  const chosen = repairableRefs(system).slice(0, Math.max(0, repairs));

  const weaponRefs = chosen.filter((r): r is { type: "weapon"; index: number } => r.type === "weapon");
  const otherRefs = chosen.filter((r) => r.type !== "weapon");

  const update = applySystemRepairs(system, otherRefs);

  if (weaponRefs.length > 0) {
    const weapons = (system.weapons ?? []).map((w) => ({ ...w }));
    for (const ref of weaponRefs) {
      if (weapons[ref.index]) weapons[ref.index].destroyed = false;
    }
    update["system.weapons"] = weapons;
  }

  return update;
}
