/**
 * Fighter and anti-fighter combat, all built on Full Thrust's universal kill die
 * (1-3 nothing, 4-5 = 1, 6 = 2): fighter attacks on ships (screens apply as for
 * beams), point-defence fire against fighters and missiles, and dogfights. Pure
 * over die faces; the rolling and the group/carrier bookkeeping live above.
 *
 * Sources: FT2 "Fighter Attacks", "Anti-Fighter Defences"; More Thrust missile
 * defence.
 */

import { PDS_MISSILE_KILL_ON } from "../constants";
import { poolBeamDamage } from "./beam";

/**
 * Damage a fighter group's attack dice inflict on a ship. Fighters use the beam
 * per-die table and the target's screens reduce them exactly as for beams.
 */
export function fighterAttackDamage(faces: readonly number[], screenLevel: number): number {
  return poolBeamDamage(faces, screenLevel);
}

/**
 * Fighters killed by point-defence fire: the universal kill die (4-5 = 1 kill,
 * 6 = 2). One die per firing PDS/anti-fighter system.
 */
export function pdsKillsVsFighters(faces: readonly number[]): number {
  // The unscreened beam table is exactly the universal kill die.
  return poolBeamDamage(faces, 0);
}

/**
 * Missiles killed by point-defence fire: only a 6 kills (missiles are smaller
 * and more agile). One kill per 6; the "one missile per system per turn" limit
 * is the caller's to enforce by how many dice it rolls.
 */
export function pdsKillsVsMissiles(faces: readonly number[]): number {
  return faces.reduce((kills, face) => kills + (face >= PDS_MISSILE_KILL_ON ? 1 : 0), 0);
}

/** Fighter kills in a dogfight: the same universal kill die as anti-fighter fire. */
export function dogfightKills(faces: readonly number[]): number {
  return poolBeamDamage(faces, 0);
}
