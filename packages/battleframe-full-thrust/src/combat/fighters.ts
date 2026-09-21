/**
 * Fighter and anti-fighter combat, all built on Full Thrust's universal kill die
 * (1-3 nothing, 4-5 = 1, 6 = 2): fighter attacks on ships (screens apply as for
 * beams), point-defence fire against fighters and missiles, and dogfights. Pure
 * over die faces; the rolling and the group/carrier bookkeeping live above.
 *
 * Sources: FT2 "Fighter Attacks", "Anti-Fighter Defences"; More Thrust missile
 * defence.
 */

import { poolBeamDamage } from "./beam";
import { requireRules } from "../rules-profile";

/** The universal fighter kill die: 4-5 = 1 kill, 6 = 2 kills. */
function killsForFace(face: number): number {
  if (face >= requireRules().pdsFighterTwoKill) return 2;
  if (face >= requireRules().pdsFighterOneKillMin) return 1;
  return 0;
}

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
  return faces.reduce((kills, face) => kills + killsForFace(face), 0);
}

/**
 * Missiles killed by point-defence fire: only a 6 kills (missiles are smaller
 * and more agile). One kill per 6; the "one missile per system per turn" limit
 * is the caller's to enforce by how many dice it rolls.
 */
export function pdsKillsVsMissiles(faces: readonly number[]): number {
  return faces.reduce((kills, face) => kills + (face >= requireRules().pdsMissileKillOn ? 1 : 0), 0);
}

/** Fighter kills in a dogfight: the same universal kill die as anti-fighter fire. */
export function dogfightKills(faces: readonly number[]): number {
  return faces.reduce((kills, face) => kills + killsForFace(face), 0);
}

/**
 * Dogfight kills against a defender of a given specialised type: a Heavy group
 * counts as a Level-1 screen (its "4" hits are ignored), so it takes fewer kills;
 * every other type uses the universal kill die.
 *
 * Source: More Thrust "Specialised Fighter Types" (Heavy).
 */
export function dogfightKillsAgainst(faces: readonly number[], defenderType?: string): number {
  return poolBeamDamage(faces, defenderType === "heavy" ? 1 : 0);
}

/**
 * Active-turn endurance for a specialised type: Long-Range carries 5, every other
 * type 3 (More Thrust). Used to seed a group's endurance at import.
 */
export function enduranceForType(fighterType?: string): number {
  return fighterType === "long-range" ? 5 : 3;
}

/**
 * Fighter-group morale (More Thrust): a depleted group rolls 1D6 before
 * attacking; it attacks if the roll is at or under the number of fighters
 * remaining, and aborts (no fire) if the roll is higher.
 */
export function fighterMoralePasses(roll: number, size: number): boolean {
  return roll <= size;
}

/** Endurance after an active (combat) turn: one spent, floored at zero. */
export function enduranceAfterActiveTurn(endurance: number): number {
  return Math.max(0, endurance - 1);
}

/** A group is out of fuel once endurance reaches zero (must return to a carrier). */
export function enduranceExhausted(endurance: number): boolean {
  return endurance <= 0;
}
