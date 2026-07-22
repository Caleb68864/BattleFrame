/**
 * Fighter-vs-fighter combat (a dogfight): one group attacks another within 6mu
 * in its fore arc, rolling one die per fighter (the universal kill die); the
 * defender returns fire if IT has the attacker in its own fore arc. Both attacks
 * are simultaneous -- a fighter killed this exchange still fires -- so both use
 * their pre-combat strength, then casualties apply to each group. Engine
 * services injected.
 *
 * SIMPLIFICATION: the "bases touching -> both fire regardless of facing" special
 * case is not modelled; engagement uses the fore-arc rule.
 *
 * Sources: FT2/More Thrust "Fighter-to-Fighter Combat".
 */

import { DIE_SIZE, FIGHTER_ATTACK_RANGE_MU } from "../constants";
import { dogfightKills } from "./fighters";
import { arcForBearing } from "./arcs";

export interface DogfightContext {
  measure: { between: (a: unknown, b: unknown, mode?: string) => { distance: number } };
  facing: { bearingOf: (observer: unknown, target: unknown) => number };
  dice: { rollPool: (count: number, dieSize: number, options?: unknown) => Promise<number[]> };
}

export interface DogfightGroup {
  token: unknown;
  system?: { size?: number };
  update?: (data: Record<string, unknown>) => Promise<unknown>;
}

export interface DogfightParams {
  attacker: DogfightGroup;
  defender: DogfightGroup;
  context: DogfightContext;
}

export interface DogfightReport {
  fired: boolean;
  reason?: "out-of-range" | "out-of-arc" | "no-fighters";
  attackerKills: number;
  defenderKills: number;
  defenderReturned: boolean;
}

export async function resolveDogfight(params: DogfightParams): Promise<DogfightReport> {
  const { attacker, defender, context } = params;
  const idle = { fired: false, attackerKills: 0, defenderKills: 0, defenderReturned: false };

  const attackerSize = attacker.system?.size ?? 0;
  const defenderSize = defender.system?.size ?? 0;
  if (attackerSize <= 0 || defenderSize <= 0) {
    return { ...idle, reason: "no-fighters" };
  }

  const distance = context.measure.between(attacker.token, defender.token, "centre-to-centre").distance;
  if (!Number.isFinite(distance) || distance > FIGHTER_ATTACK_RANGE_MU) {
    return { ...idle, reason: "out-of-range" };
  }
  if (arcForBearing(context.facing.bearingOf(attacker.token, defender.token)) !== "F") {
    return { ...idle, reason: "out-of-arc" };
  }

  // Attacker fires; the defender returns fire only if IT bears on the attacker.
  const attackerFaces = await context.dice.rollPool(attackerSize, DIE_SIZE);
  const attackerKills = Math.min(defenderSize, dogfightKills(attackerFaces));

  const defenderReturned = arcForBearing(context.facing.bearingOf(defender.token, attacker.token)) === "F";
  let defenderKills = 0;
  if (defenderReturned) {
    const defenderFaces = await context.dice.rollPool(defenderSize, DIE_SIZE);
    defenderKills = Math.min(attackerSize, dogfightKills(defenderFaces));
  }

  // Simultaneous: apply both sets of casualties from the pre-combat strengths.
  if (attackerKills > 0 && typeof defender.update === "function") {
    await defender.update({ "system.size": defenderSize - attackerKills });
  }
  if (defenderKills > 0 && typeof attacker.update === "function") {
    await attacker.update({ "system.size": attackerSize - defenderKills });
  }

  return { fired: true, attackerKills, defenderKills, defenderReturned };
}
