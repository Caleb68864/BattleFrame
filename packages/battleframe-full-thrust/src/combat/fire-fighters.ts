/**
 * A fighter group attacks a ship: it must be within 6mu with the target in its
 * FORE arc; a depleted group first passes a morale roll; then it rolls one die
 * per fighter, an Attack-type group adding +1 to each die, the target's screens
 * reducing the hits as against beams, and the damage runs through the shared
 * armour/hull + threshold path. A fired attack spends one endurance. Engine
 * services injected; the carrier bookkeeping (launch/recover) is layered above.
 *
 * Sources: FT2 "Fighter Attacks", "Fighter Groups"; More Thrust "Fighter Group
 * Morale", "Fighter Endurance"; "Specialised Fighter Types".
 */

import { DIE_SIZE, FIGHTER_ATTACK_RANGE_MU, FIGHTER_GROUP_MAX } from "../constants";
import { fighterAttackDamage, fighterMoralePasses, enduranceAfterActiveTurn } from "./fighters";
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
  system?: { size?: number; fighterType?: string; endurance?: number };
  update?: (data: Record<string, unknown>) => Promise<unknown>;
}

export interface FighterFireParams {
  group: AttackingGroup;
  target: ShipActorLike & { token: unknown; system?: Record<string, any> };
  context: FighterFireContext;
}

export interface FighterFireReport {
  fired: boolean;
  reason?: "no-fighters" | "out-of-range" | "out-of-arc" | "morale";
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
  if (!Number.isFinite(distance) || distance > FIGHTER_ATTACK_RANGE_MU) {
    return { ...idle, reason: "out-of-range" };
  }
  // Fighters attack only through their own fore arc.
  if (arcForBearing(bearing) !== "F") {
    return { ...idle, reason: "out-of-arc" };
  }

  // Morale: a depleted group (below full strength) rolls before attacking and
  // aborts if the die exceeds the fighters remaining (More Thrust).
  if (size < FIGHTER_GROUP_MAX) {
    const [moraleDie] = await context.dice.rollPool(1, DIE_SIZE);
    if (moraleDie !== undefined && !fighterMoralePasses(moraleDie, size)) {
      return { ...idle, reason: "morale" };
    }
  }

  const rolled = await context.dice.rollPool(size, DIE_SIZE);
  // An Attack-type group adds +1 to each attack die versus ships.
  const faces = group.system?.fighterType === "attack" ? rolled.map((f) => f + 1) : rolled;
  const screenLevel = (target.system?.screens as number | undefined) ?? 0;
  const damage = fighterAttackDamage(faces, screenLevel);

  const outcome = await applyDamageAndThreshold(target, damage, context.dice);

  // A fired attack is an active turn: spend one endurance (when the group can
  // persist it -- some callers pass a read-only group snapshot).
  if (typeof group.update === "function" && typeof group.system?.endurance === "number") {
    await group.update({ "system.endurance": enduranceAfterActiveTurn(group.system.endurance) });
  }

  return {
    fired: true,
    distance,
    totalDamage: damage,
    destroyed: outcome.destroyed,
    thresholdsCrossed: outcome.thresholdsCrossed,
    systemsKnockedOut: outcome.systemsKnockedOut
  };
}
