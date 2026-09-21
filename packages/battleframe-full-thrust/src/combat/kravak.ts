/**
 * Kra'Vak kinetic weapon mechanics: the K-gun (railgun) main gun, its K-1
 * point-defence mode, the one-shot MKP pack, and the all-arc scattergun. Pure
 * functions over range and die faces -- the actual rolling (via
 * game.battleframe.dice.rollPool) and target/arc checks live in the firing
 * orchestration.
 *
 * The defining Kra'Vak rule: all their weapons are KINETIC, so screens give NO
 * protection (there is no screen parameter anywhere here). The K-gun further
 * PIERCES armour -- only the first DP of each single hit is spent on armour, the
 * rest goes straight to hull (applyKgunHit) -- whereas the scattergun's small
 * anti-ship burst is absorbed by armour normally.
 *
 * Baseline is Fleet Book 2 (the current, canonical Kra'Vak file). The earlier
 * More Thrust "railgun" variant (classes 1-3, "subtract 1 per armour level" from
 * the damage die) is documented in the notes' Edition sections but is a
 * superseded edition layer and is DEFERRED here, mirroring how beam.ts takes the
 * FT2 baseline and leaves optional layers out of scope.
 *
 * Sources (user's notes): Factions & Ships/Xeno/K-guns.md, Scatterguns.md,
 * Kra'Vak.md, Kra'Vak Armour.md.
 */

import { bandIndex } from "./bands";
import { countHits } from "./weapons";
import {
  applyDamageWithArmour,
  type ArmourState,
  type HullState,
  type ApplyDamageWithArmourResult
} from "../ship/damage";
import { requireRules } from "../rules-profile";

// --- K-gun (railgun) --------------------------------------------------------

/**
 * K-gun to-hit target number at `distanceMu` (2+/3+/4+/5+/6 by 6mu band, shared
 * by every K-gun class), or null beyond the 30mu maximum range.
 */
export function kgunToHit(distanceMu: number): number | null {
  if (!Number.isFinite(distanceMu) || distanceMu > requireRules().kgunMaxRangeMu) {
    return null;
  }
  // `?? null` guards a band index off the end of the table -- never return
  // `undefined`, which a `=== null` caller would misread as "in range".
  return requireRules().kgunToHitByBand[bandIndex(distanceMu, requireRules().kgunBandMu)] ?? null;
}

/**
 * Damage points a penetrating K-gun hit of class `cls` does for the second
 * (penetration) die `face`: roll greater than class = class DP; roll <= class =
 * class x 2; a natural 6 always = class (the cap that matters for K-6 and K-6+,
 * whose class is >= the die).
 */
export function kgunDamageForFace(cls: number, face: number): number {
  // "A natural 6 always = class (even for K-6+)" -- overrides the doubling that
  // face <= cls would otherwise give a high-class gun.
  if (face === requireRules().dieSize) {
    return cls;
  }
  return face <= cls ? cls * requireRules().kgunDamageMultiplier : cls;
}

export interface ApplyKgunHitParams {
  armour: ArmourState;
  hull: HullState;
  /** DP of a SINGLE penetrating hit (e.g. from kgunDamageForFace, or a flat MKP 4). */
  damage: number;
}

/**
 * Applies one K-gun hit under the armour-pierce rule: only the first DP is taken
 * on armour, the entire remainder goes straight to hull (per-hit, not
 * per-salvo). The pierced remainder is routed through the shared armour+hull
 * applier as if the ship had NO armour, so it lands on the hull track (and can
 * trip thresholds) without spending further armour boxes.
 */
export function applyKgunHit(params: ApplyKgunHitParams): ApplyDamageWithArmourResult {
  const { armour, hull, damage } = params;

  const armourRemaining = Math.max(0, armour.boxes - armour.damage);
  const toArmour = Math.min(requireRules().kgunArmourPierceDp, Math.max(0, damage), armourRemaining);

  const pierced = applyDamageWithArmour({
    armour: { boxes: 0, damage: 0 },
    hull,
    incoming: Math.max(0, damage - toArmour)
  });

  return {
    armour: { boxes: armour.boxes, damage: armour.damage + toArmour },
    hull: pierced.hull,
    destroyed: pierced.destroyed
  };
}

/**
 * K-1 limited point-defence mode: each die of 5-6 is one kill (no rerolls). One
 * kill per hit, so the kill count is simply the number of qualifying dice.
 */
export function kgunK1PointDefenceKills(faces: readonly number[]): number {
  return countHits(faces, requireRules().kgunK1PointDefenceKillOn);
}

// --- MKP (Multiple Kinetic Penetrator) pack ---------------------------------

/**
 * Hits from the MKP pack's single effect die: 4-5 = 1 hit, 6 = 2 hits, else 0.
 * Each resulting hit is a flat requireRules().mkpHitDp (4) resolved via applyKgunHit (it
 * pierces armour like a class-4 K-gun).
 */
export function mkpHits(face: number): number {
  if (face >= requireRules().mkpTwoHit) {
    return 2;
  }
  if (face >= requireRules().mkpOneHitMin) {
    return 1;
  }
  return 0;
}

// --- Scattergun -------------------------------------------------------------

/**
 * Fighters / salvo-missile elements a single scattergun kills: the die roll is
 * the kill count (1D6), halved and rounded UP against heavy fighters.
 */
export function scattergunFighterKills(face: number, heavy = false): number {
  const kills = Math.max(0, Math.min(face, requireRules().dieSize));
  return heavy ? Math.ceil(kills / requireRules().scattergunHeavyFighterDivisor) : kills;
}

/**
 * Plasma-bolt strength reduction from one scattergun die: 4-5 reduces by 1, 6
 * reduces by 2, else 0 (no rerolls).
 */
export function scattergunPlasmaReduction(face: number): number {
  if (face >= requireRules().scattergunPlasmaTwoReduce) {
    return 2;
  }
  if (face >= requireRules().scattergunPlasmaOneReduceMin) {
    return 1;
  }
  return 0;
}

/**
 * Point-blank anti-ship damage points from one scattergun die: 4-5 = 1 DP, 6 = 2
 * DP. A 6 is two separate 1-DP hits, but the scattergun does NOT pierce armour,
 * so the two hits absorb identically to a single 2-DP hit -- feed this total to
 * applyDamageWithArmour (normal absorption), NOT applyKgunHit.
 */
export function scattergunShipDamageForFace(face: number): number {
  if (face >= requireRules().scattergunShipTwoDp) {
    return 2;
  }
  if (face >= requireRules().scattergunShipOneDpMin) {
    return 1;
  }
  return 0;
}

/**
 * Area-defence friendly-fire quirk: an effect roll of 1 means stray projectiles
 * hit the DEFENDED ship for 1 DP. True only on a 1.
 */
export function scattergunFriendlyFireHit(face: number): boolean {
  return face === requireRules().scattergunFriendlyFireOn;
}
