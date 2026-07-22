/**
 * A7 — armour of the struck face (build plan §4; Tier-1 GZG-family math).
 *
 * Stored armour is front-only; the other faces derive from it. No GZG numbers —
 * the front value and open-top flag are USER-entered on the vehicle.
 */

export type StruckFace = "front" | "side" | "top" | "rear";

export interface ArmourValue {
  /** Front armour value (stored). */
  front: number;
  /** Open-topped hull: 0 armour vs artillery & SLAM. */
  openTop: boolean;
}

/**
 * The armour value the incoming hit is compared against: `front` for a front
 * hit, `max(front-1, 0)` for side/top/rear. An open-topped vehicle struck by
 * artillery or a SLAM has 0 armour on every face.
 */
export function armourByFace(
  armour: ArmourValue,
  face: StruckFace,
  weaponIsArtyOrSlam: boolean
): number {
  if (armour.openTop && weaponIsArtyOrSlam) {
    return 0;
  }
  if (face === "front") {
    return armour.front;
  }
  return Math.max(armour.front - 1, 0);
}
