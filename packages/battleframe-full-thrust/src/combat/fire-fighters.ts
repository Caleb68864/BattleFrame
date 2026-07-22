/**
 * A fighter group attacks a ship: it must be within 6mu with the target in its
 * FORE arc; the target's POINT DEFENCE fires first (shooting down fighters before
 * they strike); a depleted group then passes a morale roll; then the survivors
 * roll one die per fighter, an Attack-type group adding +1 to each die, the
 * target's screens reducing the hits as against beams, and the damage runs
 * through the shared armour/hull + threshold path. A fired attack spends one
 * endurance. Engine services injected; carrier bookkeeping is layered above.
 *
 * DEFERRED specialised types: only Attack (+1/die vs ships) is applied here.
 * Heavy (counts as a Level-1 screen vs incoming fire), Interceptor/Torpedo
 * (dogfight modes), Fast (18mu move) and Long-Range (endurance 5, not the default
 * 3) touch movement / anti-fighter / dogfight contexts not resolved by this ship-
 * attack path, and are not yet modelled.
 *
 * Sources: FT2 "Fighter Attacks", "Fighter Groups"; More Thrust "Fighter Group
 * Morale", "Fighter Endurance"; "Specialised Fighter Types".
 */

import { DIE_SIZE, FIGHTER_ATTACK_RANGE_MU, FIGHTER_GROUP_MAX } from "../constants";
import {
  fighterAttackDamage,
  fighterMoralePasses,
  enduranceAfterActiveTurn,
  pdsKillsVsFighters
} from "./fighters";
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
  system?: {
    size?: number;
    fighterType?: string;
    endurance?: number;
    moraleBroken?: boolean;
    moraleFails?: number;
  };
  update?: (data: Record<string, unknown>) => Promise<unknown>;
}

export interface FighterFireParams {
  group: AttackingGroup;
  target: ShipActorLike & { token: unknown; system?: Record<string, any> };
  context: FighterFireContext;
}

export interface FighterFireReport {
  fired: boolean;
  reason?: "no-fighters" | "out-of-range" | "out-of-arc" | "morale" | "morale-broken" | "exhausted" | "shot-down";
  distance: number;
  totalDamage: number;
  destroyed: boolean;
  thresholdsCrossed: number[];
  systemsKnockedOut: number;
  /** Fighters the target's point defence shot down on the way in. */
  pdsKills: number;
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
    systemsKnockedOut: 0,
    pdsKills: 0
  };

  if (size <= 0) {
    return { ...idle, reason: "no-fighters" };
  }
  // A broken group has disengaged; an out-of-fuel group must return to its carrier.
  if (group.system?.moraleBroken) {
    return { ...idle, reason: "morale-broken" };
  }
  if (typeof group.system?.endurance === "number" && group.system.endurance <= 0) {
    return { ...idle, reason: "exhausted" };
  }
  if (!Number.isFinite(distance) || distance > FIGHTER_ATTACK_RANGE_MU) {
    return { ...idle, reason: "out-of-range" };
  }
  // Fighters attack only through their own fore arc.
  if (arcForBearing(bearing) !== "F") {
    return { ...idle, reason: "out-of-arc" };
  }

  // Point defence fires FIRST -- the target's PDS/anti-fighter systems shoot down
  // fighters before they strike (FT2). Casualties are permanent; persist them.
  const pds = (target.system?.pds as number | undefined) ?? 0;
  let pdsKills = 0;
  if (pds > 0) {
    const pdsFaces = await context.dice.rollPool(pds, DIE_SIZE);
    pdsKills = Math.min(size, pdsKillsVsFighters(pdsFaces));
  }
  const remaining = size - pdsKills;
  if (pdsKills > 0 && typeof group.update === "function") {
    await group.update({ "system.size": remaining });
  }
  if (remaining <= 0) {
    return { ...idle, reason: "shot-down", pdsKills };
  }

  // Morale: a depleted group (below full strength) rolls before attacking and
  // aborts if the die exceeds the fighters remaining. Three consecutive fails
  // break the group; a passed check resets the streak (More Thrust).
  if (remaining < FIGHTER_GROUP_MAX) {
    const [moraleDie] = await context.dice.rollPool(1, DIE_SIZE);
    if (moraleDie !== undefined && !fighterMoralePasses(moraleDie, remaining)) {
      const fails = (group.system?.moraleFails ?? 0) + 1;
      if (typeof group.update === "function") {
        await group.update({ "system.moraleFails": fails, "system.moraleBroken": fails >= 3 });
      }
      return { ...idle, reason: "morale", pdsKills };
    }
    if ((group.system?.moraleFails ?? 0) > 0 && typeof group.update === "function") {
      await group.update({ "system.moraleFails": 0 });
    }
  }

  const rolled = await context.dice.rollPool(remaining, DIE_SIZE);
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
    systemsKnockedOut: outcome.systemsKnockedOut,
    pdsKills
  };
}
