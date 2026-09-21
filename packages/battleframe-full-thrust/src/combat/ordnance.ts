/**
 * Precision and stand-off ordnance: needle beams (snipe one enemy system on a 6,
 * ignore screens/armour) and salvo missile systems (a salvo of 6 one-turn
 * missiles, point-defence intercepts, survivors each roll a damage die; screens
 * do not reduce them, armour does). Pure over die faces.
 *
 * Sources: FT2 "Needle Beams"; Fleet Book 1 "Salvo Missile Systems".
 */

import { poolBeamDamage } from "./beam";
import { requireRules } from "../rules-profile";

/** Whether a target is within needle-beam range (9mu, FT2). */
export function needleInRange(distanceMu: number): boolean {
  return distanceMu <= requireRules().needleMaxRangeMu;
}

/** A needle beam knocks out the nominated system only on a 6. */
export function needleHit(face: number): boolean {
  return face >= requireRules().needleKillOn;
}

/**
 * Salvo missiles stopped by point defence: the universal PDS kill table (4-5
 * stop one missile, 6 stops two). One die per firing PDS.
 */
export function salvoIntercepted(pdsFaces: readonly number[]): number {
  // The unscreened beam table matches the PDS interception table (4-5=1, 6=2).
  return poolBeamDamage(pdsFaces, 0);
}

/** Surviving missiles = those on target minus interceptions, floored at zero. */
export function salvoSurvivors(onTarget: number, intercepted: number): number {
  return Math.max(0, onTarget - intercepted);
}

/**
 * Damage of the surviving salvo missiles: each rolls a d6 (a 6 is 6 damage, no
 * reroll), summed. Screens do not reduce salvo missiles; armour absorbs them via
 * the normal armour-then-hull path.
 */
export function salvoDamage(faces: readonly number[]): number {
  return faces.reduce((sum, face) => sum + face, 0);
}
