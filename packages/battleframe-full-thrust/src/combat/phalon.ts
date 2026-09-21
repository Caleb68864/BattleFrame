/**
 * Phalon bio-tech weapon and defence mechanics: the Plasma Bolt Launcher (a
 * placed-marker area weapon whose strength is worn down by interception before
 * it bursts) and multi-layer "shell" armour (armour arranged in stacked layers,
 * with a K-gun rule that strips one box from EVERY layer). Pure functions over
 * die faces and box counts -- the actual rolling (via
 * game.battleframe.dice.rollPool), marker placement, range/arc and burst-radius
 * checks live in the firing orchestration.
 *
 * The defining Phalon rules modelled here:
 *  - Plasma bolts do "full dice" damage (DP = die score), not the beam 4-5/6
 *    table; screens/shrouds negate the high faces rather than downgrading them.
 *  - A bolt's strength (= number of damage dice) is reduced by point-defence and
 *    scattergun/interceptor interception BEFORE it bursts.
 *  - Shell armour is multiple ordered layers; normal hits spend the outermost
 *    first, but a K-gun hit takes one box from each layer at once.
 *
 * Baseline is Fleet Book 2 (the only edition the Phalons appear in). Pulsers are
 * an energy/beam variant and reuse the beam mechanics in `beam.ts` (screens
 * apply, but they deliver full dice over their whole range with no band
 * drop-off) -- their range/config handling belongs to the beam + weapon-design
 * layer and is NOT re-modelled here.
 *
 * DEFERRED (out of scope, matching how beam.ts / ship/damage.ts treat optional
 * reroll rules): the shell "reroll damage steps down one layer per reroll" rule,
 * since plasma bolts and (FT2-baseline) pulsers carry no reroll here.
 *
 * Sources (user's notes): Factions & Ships/Xeno/Phalon Systems.md, Phalons.md,
 * and K-guns.md ("Vs Phalon multi-layer shells: takes one box from each shell
 * layer, remainder to hull.").
 */

import {
  applyDamageWithArmour,
  type HullState,
  type ApplyDamageWithArmourResult
} from "../ship/damage";
import { type HullDamageResult } from "../ship/hull";
import { requireRules } from "../rules-profile";

// --- Plasma Bolt Launchers: interception ------------------------------------

/**
 * Strength a single point-defence die knocks off a plasma bolt: a 6 reduces the
 * bolt by 1, anything less does nothing (ordinary PDS only bites a bolt on a 6).
 */
export function plasmaBoltPdsReduction(face: number): number {
  return face >= requireRules().plasmaBoltPdsReduceOn ? 1 : 0;
}

/**
 * Strength a single scattergun / interceptor-pod die knocks off a plasma bolt:
 * these roll "like a beam die" against the bolt -- 4-5 = -1, 6 = -2, else 0 (no
 * rerolls).
 */
export function plasmaBoltInterceptReduction(face: number): number {
  if (face >= requireRules().plasmaBoltInterceptTwoReduce) {
    return 2;
  }
  if (face >= requireRules().plasmaBoltInterceptOneReduceMin) {
    return 1;
  }
  return 0;
}

/**
 * The bolt's reduced strength (= number of burst dice it will roll) after all
 * interception: the launched `size` less every PDS and scattergun/interceptor
 * reduction, floored at 0 (over-interception fizzles the bolt, it never goes
 * negative).
 */
export function plasmaBoltStrength(
  size: number,
  pdsFaces: readonly number[],
  interceptFaces: readonly number[]
): number {
  const pdsLoss = pdsFaces.reduce((sum, face) => sum + plasmaBoltPdsReduction(face), 0);
  const interceptLoss = interceptFaces.reduce(
    (sum, face) => sum + plasmaBoltInterceptReduction(face),
    0
  );
  return Math.max(0, size - pdsLoss - interceptLoss);
}

// --- Plasma Bolt Launchers: burst damage ------------------------------------

/**
 * Damage points a single burst die scores against a target with `screenLevel`.
 * Plasma bolts do "full dice" damage: unscreened, DP equals the die score. A
 * screen (or vapour shroud) negates the HIGH faces outright rather than
 * downgrading them: level-1 negates 6s; level-2 (and a vapour shroud, which acts
 * as a level-2 screen vs energy) negates 5s and 6s. No rerolls.
 */
export function plasmaBoltDamageForFace(face: number, screenLevel: number): number {
  // A negative/absent screen level means unscreened; anything above 2 protects
  // no more than a shroud (the strongest entry in the plasma table).
  const level = screenLevel <= 0 ? 0 : Math.min(screenLevel, requireRules().plasmaBoltScreenMaxLevel);
  switch (level) {
    case 0:
      return face;
    case 1:
      // Negate 6s only.
      return face >= requireRules().dieTwoDamage ? 0 : face;
    default: // 2 (or a vapour shroud): negate 5s and 6s.
      return face >= requireRules().dieOneDamageMax ? 0 : face;
  }
}

/** Total burst damage of a plasma bolt's dice pool against a screen level. */
export function poolPlasmaBoltDamage(faces: readonly number[], screenLevel: number): number {
  return faces.reduce((sum, face) => sum + plasmaBoltDamageForFace(face, screenLevel), 0);
}

// --- Shell armour -----------------------------------------------------------

/** One layer of shell armour: its box count and how many boxes are crossed off. */
export interface ShellLayer {
  boxes: number;
  damage: number;
}

export interface ApplyShellHitParams {
  /** Shell layers ordered OUTERMOST first (index 0); the inner "layer 1" is last. */
  layers: readonly ShellLayer[];
  hull: HullState;
  incoming: number;
}

export interface ApplyShellDamageResult {
  layers: ShellLayer[];
  hull: HullDamageResult;
  destroyed: boolean;
}

/** Remaining (undamaged) boxes on a layer. */
function remaining(layer: ShellLayer): number {
  return Math.max(0, layer.boxes - layer.damage);
}

/**
 * Spends up to `amount` DP sequentially down a copy of `layers`, starting at
 * `startIndex`, filling each layer before moving inward. Returns the mutated
 * copy and the DP that overflowed past the innermost layer.
 */
function spendAcrossLayers(
  layers: ShellLayer[],
  amount: number,
  startIndex: number
): { layers: ShellLayer[]; overflow: number } {
  let left = Math.max(0, amount);
  for (let i = startIndex; i < layers.length && left > 0; i++) {
    const canTake = Math.min(remaining(layers[i]), left);
    layers[i] = { boxes: layers[i].boxes, damage: layers[i].damage + canTake };
    left -= canTake;
  }
  return { layers, overflow: left };
}

/** Routes shell overflow onto the hull track (no armour left to spend). */
function overflowToHull(hull: HullState, overflow: number): ApplyDamageWithArmourResult {
  return applyDamageWithArmour({
    armour: { boxes: 0, damage: 0 },
    hull,
    incoming: overflow
  });
}

/**
 * Applies a normal (non-piercing) hit to shell armour: DP cross off the
 * outermost layer first, then inward layer by layer, then any remainder reaches
 * the hull (and can trip thresholds). Non-penetrating weapons -- pulsers, plasma
 * bolts, human beams -- resolve this way.
 */
export function applyShellHit(params: ApplyShellHitParams): ApplyShellDamageResult {
  const { layers, hull, incoming } = params;
  const { layers: next, overflow } = spendAcrossLayers(layers.map((l) => ({ ...l })), incoming, 0);
  const hullResult = overflowToHull(hull, overflow);
  return { layers: next, hull: hullResult.hull, destroyed: hullResult.destroyed };
}

export interface ApplyKgunShellHitParams {
  layers: readonly ShellLayer[];
  hull: HullState;
  /** DP of a SINGLE K-gun hit. */
  damage: number;
}

/**
 * Applies one K-gun hit to shell armour under the Kra'Vak rule: the hit takes
 * one box from EACH layer that still has one (outermost inward, never more boxes
 * than it has DP), then any remaining DP goes straight to hull. Contrast
 * applyShellHit, where all DP pile onto the outer layer first.
 */
export function applyKgunShellHit(params: ApplyKgunShellHitParams): ApplyShellDamageResult {
  const { layers, hull, damage } = params;
  const next = layers.map((l) => ({ ...l }));

  let spent = 0;
  const budget = Math.max(0, damage);
  for (let i = 0; i < next.length && spent < budget; i++) {
    if (remaining(next[i]) > 0) {
      next[i] = { boxes: next[i].boxes, damage: next[i].damage + 1 };
      spent += 1;
    }
  }

  const hullResult = overflowToHull(hull, budget - spent);
  return { layers: next, hull: hullResult.hull, destroyed: hullResult.destroyed };
}

/**
 * Applies a half-armour weapon's hit to shell armour: half the DP go to the
 * outer layer and half to the next layer (rather than all onto the outermost).
 *
 * ASSUMED (the notes give the split but not the details): an odd DP puts the
 * extra point on the OUTER layer (ceil to outer, floor to next), and each half
 * that exceeds its target layer overflows inward through the remaining layers
 * and then to the hull.
 */
export function applyHalfArmourShellHit(params: ApplyShellHitParams): ApplyShellDamageResult {
  const { layers, hull, incoming } = params;
  const amount = Math.max(0, incoming);
  const outerHalf = Math.ceil(amount / 2);
  const nextHalf = Math.floor(amount / 2);

  let working = layers.map((l) => ({ ...l }));
  const outer = spendAcrossLayers(working, outerHalf, 0);
  working = outer.layers;
  // The "next layer" is index 1; if the shell has only one layer both halves
  // funnel through it (and on inward to hull).
  const nextStart = working.length > 1 ? 1 : 0;
  const next = spendAcrossLayers(working, nextHalf, nextStart);

  const hullResult = overflowToHull(hull, outer.overflow + next.overflow);
  return { layers: next.layers, hull: hullResult.hull, destroyed: hullResult.destroyed };
}
