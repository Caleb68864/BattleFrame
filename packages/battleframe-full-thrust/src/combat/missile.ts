/**
 * Independent (More Thrust) missile combat resolution: a one-shot AI craft that,
 * after ships have moved, strikes a ship that FINISHED within 6mu of it and is
 * NOT in the missile's rear arc. The target's point defence fires first (a PDS or
 * anti-fighter system kills the missile on a 6 -- one die per system, and that
 * die can't also be anti-fighter that turn; the caller enforces the die budget by
 * how many it rolls). A surviving missile detonates its Normal (nuclear) warhead:
 * roll 2 dice, the TOTAL is the damage. Screens do NOT reduce it; armour DOES
 * absorb it (via the shared armour->hull path). Engine services injected.
 *
 * This is distinct from `combat/salvo.ts` (Fleet Book salvo missiles, fired as a
 * salvo of 6 straight from a ship): here the missile is a moving craft resolved
 * from wherever it ended its own move (see `movement/missile-path.ts`).
 *
 * Sources: More Thrust "Missiles (Basic)" + "Missile Warheads" (Normal).
 */

import { DIE_SIZE, MISSILE_ATTACK_RANGE_MU, MISSILE_NORMAL_WARHEAD_DICE, MISSILE_REAR_ARC } from "../constants";
import { arcForBearing } from "./arcs";
import { pdsKillsVsMissiles } from "./fighters";
import { remainingPds } from "../ship/systems";
import { applyDamageAndThreshold } from "./apply-damage";
import type { ShipActorLike } from "../data/ship-state";

export interface MissileContext {
  measure: { between: (a: unknown, b: unknown, mode?: string) => { distance: number } };
  facing: { bearingOf: (observer: unknown, target: unknown) => number };
  dice: { rollPool: (count: number, dieSize: number, options?: unknown) => Promise<number[]> };
}

export interface MissileParams {
  /** The active missile craft (its token gives the measure/bearing origin). */
  missile: { token: unknown };
  target: ShipActorLike & { token: unknown; system?: Record<string, any> };
  context: MissileContext;
}

export interface MissileAttackReport {
  attacked: boolean;
  reason?: "out-of-range" | "in-rear-arc";
  /** The target's point defence killed the missile before it could strike. */
  intercepted: boolean;
  totalDamage: number;
  destroyed: boolean;
  thresholdsCrossed: number[];
  systemsKnockedOut: number;
}

/**
 * Whether a missile may attack a ship that finished at `distanceMu` and
 * `bearingFromMissile` (degrees, clockwise, 0 = the missile's dead ahead): within
 * 6mu AND not in the missile's rear ("A") arc. Pure -- the range/bearing come
 * from the engine's measure/facing services.
 */
export function missileCanAttack(distanceMu: number, bearingFromMissile: number): boolean {
  if (!Number.isFinite(distanceMu) || distanceMu > MISSILE_ATTACK_RANGE_MU) {
    return false;
  }
  return arcForBearing(bearingFromMissile) !== MISSILE_REAR_ARC;
}

export async function resolveMissileAttack(params: MissileParams): Promise<MissileAttackReport> {
  const { missile, target, context } = params;
  const idle: Omit<MissileAttackReport, "reason"> = {
    attacked: false, intercepted: false, totalDamage: 0,
    destroyed: false, thresholdsCrossed: [], systemsKnockedOut: 0
  };

  const distance = context.measure.between(missile.token, target.token, "centre-to-centre").distance;
  if (!Number.isFinite(distance) || distance > MISSILE_ATTACK_RANGE_MU) {
    return { ...idle, reason: "out-of-range" };
  }
  const bearing = context.facing.bearingOf(missile.token, target.token);
  if (!missileCanAttack(distance, bearing)) {
    return { ...idle, reason: "in-rear-arc" };
  }

  // Point defence fires first: each PDS rolls one die and a 6 kills the missile.
  const pds = remainingPds(target.system ?? {});
  const pdsFaces = pds > 0 ? await context.dice.rollPool(pds, DIE_SIZE) : [];
  if (pdsKillsVsMissiles(pdsFaces) > 0) {
    return { ...idle, intercepted: true };
  }

  // Normal warhead: roll 2 dice, the TOTAL is the damage (screens do not reduce).
  const warheadFaces = await context.dice.rollPool(MISSILE_NORMAL_WARHEAD_DICE, DIE_SIZE);
  const damage = warheadFaces.reduce((sum, face) => sum + face, 0);

  const outcome = await applyDamageAndThreshold(target, damage, context.dice);

  return {
    attacked: true,
    intercepted: false,
    totalDamage: damage,
    destroyed: outcome.destroyed,
    thresholdsCrossed: outcome.thresholdsCrossed,
    systemsKnockedOut: outcome.systemsKnockedOut
  };
}
