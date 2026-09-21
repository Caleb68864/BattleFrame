/**
 * The big forward "spinal" plasma weapons: the FT2 spinal-mount Nova Cannon and
 * its tamer More Thrust cousin, the Wave Gun. Both fire straight ahead, sweep an
 * expanding template along the ship's centreline, and deal damage equal to the
 * ACTUAL die score rolled (like pulse torpedoes) -- screens (and, for the Wave
 * Gun, armour) give NO protection, so these functions carry no screen parameter.
 *
 * Pure functions over range, turn-of-life, and die faces. The template geometry
 * on the canvas, the "arming"/"charging" bookkeeping on the Combat/Actor
 * documents, and any scene tool are firing-orchestration glue and are DEFERRED
 * (out of scope here): this file is only the rules math.
 *
 * The Nova Cannon does NOT add a WEAPON_KIND to the shared WEAPON_KINDS array --
 * it is unwired, so a kind would be an unused token; a firing session can add one
 * when the glue lands.
 *
 * Sources: FT2 "Spinal-Mount Nova Cannon"; More Thrust "Wave Gun". Exact numbers
 * live in constants.ts (NOVA_CANNON_*, WAVE_GUN_*).
 */

import { bandIndex } from "./bands";
import { requireRules } from "../rules-profile";

/**
 * Both weapons deal damage = the sum of the actual die faces (a 6 is 6 points, no
 * reroll), and no defence reduces it. Shared here so the "damage = die score"
 * rule is expressed once.
 */
function sumFaces(faces: readonly number[]): number {
  return faces.reduce((sum, face) => sum + face, 0);
}

// --- Nova Cannon ------------------------------------------------------------

/**
 * The turn-of-life index (0-based) if `turn` (1-based) is within the cannon's
 * 3-turn life, else null (not yet armed, or burnt out).
 */
function novaTurnIndex(turn: number): number | null {
  if (!Number.isInteger(turn) || turn < 1 || turn > requireRules().novaCannonLifeTurns) {
    return null;
  }
  return turn - 1;
}

/** Nova Cannon damage: the sum of the die faces; screens give no protection. */
export function novaCannonDamage(faces: readonly number[]): number {
  return sumFaces(faces);
}

/** Damage dice the Nova Cannon rolls on `turn` of its life (6/4/2), else 0. */
export function novaCannonDiceForTurn(turn: number): number {
  const i = novaTurnIndex(turn);
  return i === null ? 0 : requireRules().novaCannonDiceByTurn[i];
}

/** Template diameter (inches) on `turn` of the Nova Cannon's life (2/4/6), else 0. */
export function novaCannonTemplateInches(turn: number): number {
  const i = novaTurnIndex(turn);
  return i === null ? 0 : requireRules().novaCannonTemplateInchesByTurn[i];
}

/** The full sweep for one turn of the Nova Cannon's life (see interface), null outside its life. */
export interface NovaCannonSweep {
  /** Template diameter in inches. */
  diameterInches: number;
  /** Damage dice rolled against anything the template touches. */
  diceCount: number;
  /** How far the template travels forward this turn (mu). */
  travelMu: number;
  /** Leading-edge distance from the bow where this turn's sweep begins (mu). */
  startOffsetMu: number;
  /** Leading-edge distance from the bow where this turn's sweep ends (mu). */
  endOffsetMu: number;
}

/**
 * The Nova Cannon's contiguous forward sweep on `turn` of its life, or null if it
 * is not yet armed or has burnt out. The sweep starts at the 6mu arming point on
 * turn 1 and continues from the previous turn's end point thereafter (see the
 * requireRules().novaCannonTravelMuByTurn note for that assumption).
 */
export function novaCannonSweep(turn: number): NovaCannonSweep | null {
  const i = novaTurnIndex(turn);
  if (i === null) {
    return null;
  }
  // Leading edge starts at the arming point plus every prior turn's travel, so
  // the plasma keeps moving forward rather than restarting at the bow.
  let startOffsetMu = requireRules().novaCannonArmingOffsetMu;
  for (let prior = 0; prior < i; prior++) {
    startOffsetMu += requireRules().novaCannonTravelMuByTurn[prior];
  }
  const travelMu = requireRules().novaCannonTravelMuByTurn[i];
  return {
    diameterInches: requireRules().novaCannonTemplateInchesByTurn[i],
    diceCount: requireRules().novaCannonDiceByTurn[i],
    travelMu,
    startOffsetMu,
    endOffsetMu: startOffsetMu + travelMu
  };
}

// --- Wave Gun ---------------------------------------------------------------

/** Wave Gun damage: the sum of the die faces; neither screens nor armour reduce it. */
export function waveGunDamage(faces: readonly number[]): number {
  return sumFaces(faces);
}

/**
 * Damage dice the Wave Gun rolls at `distanceMu` (4D6 0-12, 3D6 12-24, 2D6
 * 24-36), zero beyond its 36mu reach. Boundaries belong to the nearer band.
 */
export function waveGunDiceAtRange(distanceMu: number): number {
  if (!Number.isFinite(distanceMu) || distanceMu > requireRules().waveGunMaxRangeMu) {
    return 0;
  }
  return requireRules().waveGunDiceByBand[bandIndex(distanceMu, requireRules().waveGunBandMu)] ?? 0;
}

/**
 * Template diameter (inches) the Wave Gun projects at `distanceMu` (2"/3"/4" by
 * band), zero beyond reach.
 */
export function waveGunTemplateInches(distanceMu: number): number {
  if (!Number.isFinite(distanceMu) || distanceMu > requireRules().waveGunMaxRangeMu) {
    return 0;
  }
  return requireRules().waveGunTemplateInchesByBand[bandIndex(distanceMu, requireRules().waveGunBandMu)] ?? 0;
}

/** Stored charge after another charging turn: accumulate the rolled die face. */
export function waveGunChargeAfterTurn(currentCharge: number, dieFace: number): number {
  return currentCharge + dieFace;
}

/** Whether the Wave Gun is fully charged (stored total 6+) and may fire. */
export function waveGunIsCharged(charge: number): boolean {
  return charge >= requireRules().waveGunFullCharge;
}

/** Firing fully discharges the Wave Gun: it recharges from zero. */
export function waveGunChargeAfterFiring(): number {
  return 0;
}

/**
 * Feedback damage the firing ship takes if the Wave Gun is knocked out (threshold
 * or needle beam) while charging or charged: equal to the current stored charge.
 */
export function waveGunFeedbackDamage(charge: number): number {
  return charge;
}
