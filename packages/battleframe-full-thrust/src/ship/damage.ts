/**
 * Distributes incoming damage across a ship's armour and hull: armour boxes
 * absorb point-for-point first (no threshold at the armour row), then any
 * overflow reaches the hull damage track and can trigger threshold checks.
 * Pure; the actor read/write lives in ../data/ship-state.
 *
 * DEFERRED (Fleet Book optional): "penetrating" / reroll damage that bypasses
 * armour to hit the hull directly is not modelled -- all incoming damage spends
 * armour first. FT2-core armour has no such bypass.
 *
 * Sources: FT2 "Armour", "Hull Boxes & Damage".
 */

import { applyHullDamage, type HullDamageResult } from "./hull";

export interface ArmourState {
  damage: number;
  boxes: number;
}

export interface HullState {
  damage: number;
  boxes: number;
  rows: number;
}

export interface ApplyDamageWithArmourParams {
  armour: ArmourState;
  hull: HullState;
  incoming: number;
}

export interface ApplyDamageWithArmourResult {
  armour: ArmourState;
  hull: HullDamageResult;
  destroyed: boolean;
}

/**
 * Applies `incoming` damage to armour first, then the hull. Returns the new
 * armour state, the hull damage result (new damage, thresholds crossed,
 * destruction) and the overall destroyed flag.
 */
export function applyDamageWithArmour(
  params: ApplyDamageWithArmourParams
): ApplyDamageWithArmourResult {
  const { armour, hull, incoming } = params;

  const armourRemaining = Math.max(0, armour.boxes - armour.damage);
  const toArmour = Math.min(incoming, armourRemaining);
  const toHull = incoming - toArmour;

  const hullResult = applyHullDamage({
    damageBefore: hull.damage,
    incoming: toHull,
    boxes: hull.boxes,
    rows: hull.rows
  });

  return {
    armour: { boxes: armour.boxes, damage: armour.damage + toArmour },
    hull: hullResult,
    destroyed: hullResult.destroyed
  };
}
