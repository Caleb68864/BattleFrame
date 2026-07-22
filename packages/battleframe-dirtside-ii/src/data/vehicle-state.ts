import { armourByFace, type ArmourValue, type StruckFace } from "../combat/armour";

/**
 * Pure readers over a vehicle element's system data (G1). The Foundry data model
 * (`data/vehicle.ts`) defines the schema; these interpret it, Foundry-free.
 */

/**
 * Effective signature = basic signature minus stealth levels, floored at 0. A
 * reader, not a stored field, because the walker/oversize exceptions keep
 * `signatureBasic` explicit rather than derived (build plan §3).
 */
export function effectiveSignature(data: {
  signatureBasic: number;
  stealthLevels: number;
}): number {
  return Math.max(0, data.signatureBasic - data.stealthLevels);
}

/**
 * The armour value of the struck face — thin adapter onto the shared Tier-1
 * `armourByFace` math, fed from the vehicle's stored armour block.
 */
export function armourFace(
  armour: ArmourValue,
  face: StruckFace,
  weaponIsArtyOrSlam: boolean
): number {
  return armourByFace(armour, face, weaponIsArtyOrSlam);
}
