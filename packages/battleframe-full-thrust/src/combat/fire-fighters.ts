/**
 * A fighter group attacks a ship: it must be within 6mu with the target in its
 * FORE arc, then rolls one die per fighter, the target's screens reducing the
 * hits as against beams, and the damage runs through the shared armour/hull +
 * threshold path. Engine services injected; the group/carrier bookkeeping
 * (endurance, morale, recovery) is layered above.
 *
 * Sources: FT2 "Fighter Attacks", "Fighter Groups".
 */

import { DIE_SIZE, FIGHTER_ATTACK_RANGE_MU } from "../constants";
import { fighterAttackDamage } from "./fighters";
import { arcForBearing } from "./arcs";
import { applyDamageAndThreshold } from "./apply-damage";
import type { ShipActorLike } from "../data/ship-state";

export interface FighterFireContext {
  measure: { between: (a: unknown, b: unknown, mode?: string) => { distance: number } };
  facing: { bearingOf: (observer: unknown, target: unknown) => number };
  dice: { rollPool: (count: number, dieSize: number, options?: unknown) => Promise<number[]> };
}

export interface AttackingGroup {
  token: unknown;
  system?: { size?: number };
}

export interface FighterFireParams {
  group: AttackingGroup;
  target: ShipActorLike & { token: unknown; system?: Record<string, any> };
  context: FighterFireContext;
}

export interface FighterFireReport {
  fired: boolean;
  reason?: "no-fighters" | "out-of-range" | "out-of-arc";
  distance: number;
  totalDamage: number;
  destroyed: boolean;
  thresholdsCrossed: number[];
  systemsKnockedOut: number;
}

export async function fireFighterGroupAtTarget(
  params: FighterFireParams
): Promise<FighterFireReport> {
  const { group, target, context } = params;

  const size = group.system?.size ?? 0;
  const distance = context.measure.between(group.token, target.token, "centre-to-centre").distance;
  const bearing = context.facing.bearingOf(group.token, target.token);

  const idle: Omit<FighterFireReport, "reason"> = {
    fired: false,
    distance,
    totalDamage: 0,
    destroyed: false,
    thresholdsCrossed: [],
    systemsKnockedOut: 0
  };

  if (size <= 0) {
    return { ...idle, reason: "no-fighters" };
  }
  if (distance > FIGHTER_ATTACK_RANGE_MU) {
    return { ...idle, reason: "out-of-range" };
  }
  // Fighters attack only through their own fore arc.
  if (arcForBearing(bearing) !== "F") {
    return { ...idle, reason: "out-of-arc" };
  }

  const faces = await context.dice.rollPool(size, DIE_SIZE);
  const screenLevel = (target.system?.screens as number | undefined) ?? 0;
  const damage = fighterAttackDamage(faces, screenLevel);

  const outcome = await applyDamageAndThreshold(target, damage, context.dice);

  return {
    fired: true,
    distance,
    totalDamage: damage,
    destroyed: outcome.destroyed,
    thresholdsCrossed: outcome.thresholdsCrossed,
    systemsKnockedOut: outcome.systemsKnockedOut
  };
}
