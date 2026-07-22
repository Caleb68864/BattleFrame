/**
 * Fleet Book 1 OPTIONAL damage layers (roadmap P2 #19). These are opt-in variants
 * that a ruleset/scenario can layer on top of the FT2 default combat path -- they
 * do NOT change the baseline in combat/beam.ts, ship/damage.ts or ship/threshold.ts.
 * All pure functions over die faces / numbers; the rolling and actor read/write
 * live in the orchestration and ../data/ship-state.
 *
 * Three layers, each straight from the user's Fleet Book notes:
 *
 *  1. Reroll / penetrating damage ("Reroll Damage Rules"): a rolled 6 inflicts its
 *     normal damage AND grants a reroll die, cumulatively, with no cap on the chain
 *     of 6s -- replacing the FT2 "6 = 2 damage, done" behaviour. The reroll die
 *     scores on the ordinary UNSCREENED per-die table, so this reuses
 *     beamDamageForFace rather than re-tabulating; screens downgrade only the
 *     initial dice, never the rerolls.
 *
 *  2. Armour bypass ("Armour" / "Reroll Damage Rules"): penetrating (reroll) damage,
 *     and some weapons, skip armour and hit the hull directly even while armour
 *     remains. A bypassing application, and a normal/penetrating split, parallel to
 *     applyDamageWithArmour.
 *
 *  3. Core Systems +1 ("Core Systems"): the three deep-buried systems roll at +1 to
 *     the current threshold kill number, one step tougher than surface systems.
 *
 * Sources: Fleet Book 1 "Reroll Damage Rules", "Armour", "Core Systems".
 */

import { DIE_TWO_DAMAGE, CORE_SYSTEM_THRESHOLD_BONUS } from "../constants";
import { beamDamageForFace } from "../combat/beam";
import { applyHullDamage, type HullDamageResult } from "./hull";
import { thresholdKillOn } from "./threshold";
import type {
  ArmourState,
  HullState,
  ApplyDamageWithArmourParams,
  ApplyDamageWithArmourResult
} from "./damage";

// --- 1. Reroll / penetrating damage -----------------------------------------

/**
 * Damage a single reroll ("penetrating") die scores: it is always unscreened, so
 * this is exactly the unscreened beam-die table (1-3 = 0, 4-5 = 1, 6 = 2). Built
 * on beamDamageForFace(face, 0) so the base per-die table is never duplicated.
 * Note (Reroll Damage Rules): "1-3 = nothing, 4-5 = +1 point, 6 = +2 points and
 * reroll again."
 */
export function penetratingDamageForFace(face: number): number {
  return beamDamageForFace(face, 0);
}

/**
 * Whether a die face penetrates and grants a reroll -- a physical 6, regardless of
 * screen (Reroll Damage Rules: "every roll of 6 ... allows a reroll"; the reroll
 * "is assumed to have already penetrated the screen"). A screened 6 still scores
 * its (downgraded) initial damage but the 6 face still triggers the reroll.
 */
export function triggersReroll(face: number): boolean {
  return face === DIE_TWO_DAMAGE;
}

/**
 * Total penetrating damage of a pool. `initialFaces` are the weapon's rolled dice
 * (downgraded by `screenLevel`); `rerollFaces` is the ordered list of faces rolled
 * for the rerolls the 6s spawn (the caller keeps rolling while 6s appear and hands
 * the results here). Each 6 -- initial or reroll -- consumes one reroll face, in
 * order, until the reroll supply is exhausted (a graceful stop if the caller
 * under-supplies). Reroll dice are always unscreened.
 */
export function poolPenetratingDamage(
  initialFaces: readonly number[],
  rerollFaces: readonly number[],
  screenLevel: number
): number {
  let total = 0;
  let pending = 0;

  for (const face of initialFaces) {
    total += beamDamageForFace(face, screenLevel);
    if (triggersReroll(face)) {
      pending += 1;
    }
  }

  let next = 0;
  while (pending > 0 && next < rerollFaces.length) {
    const face = rerollFaces[next];
    next += 1;
    pending -= 1;
    total += penetratingDamageForFace(face);
    if (triggersReroll(face)) {
      pending += 1;
    }
  }

  return total;
}

// --- 2. Armour bypass -------------------------------------------------------

/**
 * Armour-bypassing damage application: every incoming point goes straight to the
 * hull, armour untouched -- for weapons/rules that ignore armour entirely. Same
 * shape as applyDamageWithArmour so callers can swap one for the other.
 */
export function applyDamageBypassingArmour(
  params: ApplyDamageWithArmourParams
): ApplyDamageWithArmourResult {
  const { armour, hull, incoming } = params;

  const hullResult = applyHullDamage({
    damageBefore: hull.damage,
    incoming,
    boxes: hull.boxes,
    rows: hull.rows
  });

  return {
    armour: { boxes: armour.boxes, damage: armour.damage },
    hull: hullResult,
    destroyed: hullResult.destroyed
  };
}

export interface ApplyPenetratingDamageWithArmourParams {
  armour: ArmourState;
  hull: HullState;
  /** Ordinary dice damage -- spends armour first, overflow reaches the hull. */
  normalDamage: number;
  /** Penetrating (reroll) damage -- straight to the hull even if armour remains. */
  penetratingDamage: number;
}

/**
 * Splits an attack into its ordinary and penetrating parts (Reroll Damage Rules /
 * Armour: "normal dice hit armour boxes ... the reroll die's damage goes straight
 * to the hull"). Normal damage spends armour first then overflows to the hull; the
 * penetrating damage is added directly onto the hull. A single hull application
 * runs on the combined hull-bound total so thresholds see it as one attack. With
 * penetratingDamage 0 this reduces exactly to applyDamageWithArmour.
 */
export function applyPenetratingDamageWithArmour(
  params: ApplyPenetratingDamageWithArmourParams
): ApplyDamageWithArmourResult {
  const { armour, hull, normalDamage, penetratingDamage } = params;

  const armourRemaining = Math.max(0, armour.boxes - armour.damage);
  const toArmour = Math.min(normalDamage, armourRemaining);
  const normalToHull = normalDamage - toArmour;

  const hullResult = applyHullDamage({
    damageBefore: hull.damage,
    incoming: normalToHull + penetratingDamage,
    boxes: hull.boxes,
    rows: hull.rows
  });

  return {
    armour: { boxes: armour.boxes, damage: armour.damage + toArmour },
    hull: hullResult,
    destroyed: hullResult.destroyed
  };
}

// --- 3. Core Systems +1 -----------------------------------------------------

/**
 * The die value that knocks out a CORE system at the given threshold: the surface
 * kill number (thresholdKillOn) plus the +1 core bonus. At the 1st threshold this
 * is 7 -- unreachable on a d6, i.e. the core system is safe. Built on
 * thresholdKillOn so the base threshold table is never duplicated.
 */
export function coreThresholdKillOn(worst: number, extra: number): number {
  return thresholdKillOn(worst, extra) + CORE_SYSTEM_THRESHOLD_BONUS;
}

/**
 * Indices of systems knocked out when some are designated core. `isCore[i]` marks
 * system i as a core system (rolls at +1). Surface systems use thresholdKillOn,
 * core systems use coreThresholdKillOn, and each is compared against its own die
 * face (FT2 rolls high: lost on a face at or above the kill number).
 */
export function knockedOutIndicesWithCore(
  faces: readonly number[],
  isCore: readonly boolean[],
  worst: number,
  extra: number
): number[] {
  const surfaceKillOn = thresholdKillOn(worst, extra);
  const coreKillOn = coreThresholdKillOn(worst, extra);

  const lost: number[] = [];
  faces.forEach((face, i) => {
    const killOn = isCore[i] ? coreKillOn : surfaceKillOn;
    if (face >= killOn) {
      lost.push(i);
    }
  });
  return lost;
}
