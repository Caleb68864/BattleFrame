/**
 * Fleet Book 1 OPTIONAL conditional aft fire (roadmap P2 #19). An opt-in layer
 * over combat/arcs.ts: it does NOT change weaponBearsOn or the default firing
 * path -- it adds a predicate the orchestration may consult when it knows whether
 * the firing ship spent main-drive thrust this turn.
 *
 * Source (user's "Fire Arcs" note, Fleet Book optional aft-arc fire): "all-round
 * turret weapons may fire aft on a turn in which the ship applied no main-drive
 * thrust (course changes / thruster use are fine; any accel/decel blocks aft fire
 * that turn)." The base FTL model blacks out the aft (A) arc on every weapon icon
 * (the aft blind spot); this rule conditionally restores it for all-round turrets.
 *
 * We therefore model an "all-round turret" as a mount covering every arc EXCEPT
 * the aft blind spot (the five forward/side arcs). The predicate here grants that
 * turret its aft shot only on a no-thrust turn. Whether the ship thrusted is a
 * fact the caller supplies -- this file has no notion of the movement system.
 */

import { FIRE_ARCS, type FireArc } from "../constants";
import { arcForBearing, weaponBearsOn } from "./arcs";

/** The aft arc -- the blind spot the conditional rule may reopen. */
const AFT_ARC: FireArc = "A";

/** Every arc except the aft blind spot -- an all-round turret's normal coverage. */
const NON_AFT_ARCS: readonly FireArc[] = FIRE_ARCS.filter((arc) => arc !== AFT_ARC);

/**
 * Whether a mount is an all-round turret: it covers every non-aft arc (the five
 * forward/side arcs). A mount that also lists the aft arc still qualifies -- it
 * simply needs no conditional grant to fire aft.
 */
export function isAllRoundTurret(weaponArcs: readonly FireArc[]): boolean {
  return NON_AFT_ARCS.every((arc) => weaponArcs.includes(arc));
}

/**
 * Whether the Fleet Book conditional rule grants THIS weapon an aft-arc shot at a
 * target on `bearing`, given whether the ship spent main-drive thrust this turn.
 *
 * True only when: the target is in the aft arc, the mount is an all-round turret
 * that does NOT already cover the aft arc outright (a mount that lists "A" already
 * bears via weaponBearsOn, so the conditional grant adds nothing), and the ship
 * applied no main-drive thrust. Any thrust, or a non-turret mount, denies it.
 */
export function aftFirePermitted(
  weaponArcs: readonly FireArc[],
  bearing: number,
  thrusted: boolean
): boolean {
  if (arcForBearing(bearing) !== AFT_ARC) {
    return false;
  }
  if (weaponArcs.includes(AFT_ARC)) {
    return false;
  }
  return isAllRoundTurret(weaponArcs) && !thrusted;
}

/**
 * Additive combination of the default arc check with the conditional aft grant: a
 * weapon bears if it bears normally (weaponBearsOn, unchanged) OR the conditional
 * aft-fire rule grants it. With a thrusting ship, or any non-aft target, this
 * reduces exactly to weaponBearsOn -- so it is safe to swap in only where the
 * conditional rule is desired.
 */
export function weaponBearsOnWithAftFire(
  weaponArcs: readonly FireArc[],
  bearing: number,
  thrusted: boolean
): boolean {
  return weaponBearsOn(weaponArcs, bearing) || aftFirePermitted(weaponArcs, bearing, thrusted);
}
