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
import { dogfightKillsAgainst } from "./fighters";
import { type PilotQuality, pilotAttackDice, pilotDogfightFaces } from "./pilot";
import { arcForBearing } from "./arcs";

export interface DogfightContext {
  measure: { between: (a: unknown, b: unknown, mode?: string) => { distance: number } };
  facing: { bearingOf: (observer: unknown, target: unknown) => number };
  dice: { rollPool: (count: number, dieSize: number, options?: unknown) => Promise<number[]> };
}

export interface DogfightGroup {
  token: unknown;
  system?: { size?: number; fighterType?: string; pilotQuality?: PilotQuality };
  update?: (data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * A group's dogfight dice after both the fighter-type and pilot-quality per-die
 * modifiers, which stack: an Interceptor adds +1 to each die; a Turkey subtracts
 * 1 from each; an Ace's benefit is an extra die (via `pilotAttackDice`), not a
 * per-die bonus.
 */
function dogfightFaces(faces: readonly number[], fighterType?: string, quality: PilotQuality = "standard"): number[] {
  const typed = fighterType === "interceptor" ? faces.map((f) => f + 1) : [...faces];
  return pilotDogfightFaces(typed, quality);
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

  const attackerType = attacker.system?.fighterType;
  const defenderType = defender.system?.fighterType;
  const attackerQuality: PilotQuality = attacker.system?.pilotQuality ?? "standard";
  const defenderQuality: PilotQuality = defender.system?.pilotQuality ?? "standard";

  // Attacker fires; the defender returns fire only if IT bears on the attacker.
  // Interceptors roll +1/die and Aces throw an extra die; a Turkey rolls -1/die;
  // a Heavy target is screened (dogfightKillsAgainst).
  const attackerRolled = await context.dice.rollPool(pilotAttackDice(attackerSize, attackerQuality), DIE_SIZE);
  const attackerFaces = dogfightFaces(attackerRolled, attackerType, attackerQuality);
  const attackerKills = Math.min(defenderSize, dogfightKillsAgainst(attackerFaces, defenderType));

  const defenderReturned = arcForBearing(context.facing.bearingOf(defender.token, attacker.token)) === "F";
  let defenderKills = 0;
  if (defenderReturned) {
    const defenderRolled = await context.dice.rollPool(pilotAttackDice(defenderSize, defenderQuality), DIE_SIZE);
    const defenderFaces = dogfightFaces(defenderRolled, defenderType, defenderQuality);
    defenderKills = Math.min(attackerSize, dogfightKillsAgainst(defenderFaces, attackerType));
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
