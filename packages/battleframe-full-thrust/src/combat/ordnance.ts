/**
 * Precision and stand-off ordnance: needle beams (snipe one enemy system on the world's face,
 * ignore screens/armour) and salvo missile systems (a salvo of 6 one-turn
 * missiles, point-defence intercepts, survivors each roll a damage die; screens
 * do not reduce them, armour does). Pure over die faces.
 *
 * Sources: FT2 "Needle Beams"; Fleet Book 1 "Salvo Missile Systems".
 */

import { poolBeamDamage } from "./beam";
import { requireRules } from "../rules-profile";

/** Whether a target is within needle-beam range (Nmu, FT2). */
export function needleInRange(distanceMu: number): boolean {
  return distanceMu <= requireRules().needleMaxRangeMu;
}

/** A needle beam knocks out the nominated system only on the world's face. */
export function needleHit(face: number): boolean {
  return face >= requireRules().needleKillOn;
}

/**
 * Salvo missiles stopped by point defence: the universal PDS kill table (N-N
 * stop one missile, 6 stops two). One die per firing PDS.
 */
export function salvoIntercepted(pdsFaces: readonly number[]): number {
  // The unscreened beam table matches the PDS interception table (N-N=N, 6=N).
  return poolBeamDamage(pdsFaces, 0);
}

/** Surviving missiles = those on target minus interceptions, floored at zero. */
export function salvoSurvivors(onTarget: number, intercepted: number): number {
  return Math.max(0, onTarget - intercepted);
}

/**
 * Damage of the surviving salvo missiles: each rolls a d6 (the top face is 6 damage, no
 * reroll), summed. Screens do not reduce salvo missiles; armour absorbs them via
 * the normal armour-then-hull path.
 */
export function salvoDamage(faces: readonly number[]): number {
  return faces.reduce((sum, face) => sum + face, 0);
}
