/**
 * The firing orchestrator: one ship fires all its weapons at one target. Ties
 * the engine's geometry/dice services to the pure combat math -- measure the
 * range (centre-to-centre, per FT), read the bearing (the engine's neutral
 * facing primitive), roll the weapons, apply damage (armour then hull), and run
 * a threshold check if a hull row completed. The engine services are injected as
 * `context`, so the whole sequence tests without Foundry; the scene-control glue
 * passes the real `game.battleframe.measure/facing/dice`.
 *
 * Sources: FT2 "Sequence of Play", "Weapon Ranges & Damage Rolls",
 * "Threshold Check".
 */

import { type ShipActorLike } from "../data/ship-state";
import { resolveWeaponFire, type WeaponMount, type WeaponShot } from "./fire";
import { applyDamageAndThreshold } from "./apply-damage";

export interface FireContext {
  measure: {
    between: (a: unknown, b: unknown, mode?: string) => { distance: number };
  };
  facing: {
    bearingOf: (observer: unknown, target: unknown) => number;
  };
  dice: {
    rollPool: (count: number, dieSize: number, options?: unknown) => Promise<number[]>;
  };
}

export interface FiringShip extends ShipActorLike {
  token: unknown;
  system?: Record<string, any>;
}

export interface FireShipParams {
  attacker: FiringShip;
  target: FiringShip;
  context: FireContext;
}

export interface FireReport {
  distance: number;
  bearing: number;
  totalDamage: number;
  shots: WeaponShot[];
  destroyed: boolean;
  thresholdsCrossed: number[];
  /** How many of the target's systems the threshold check knocked out. */
  systemsKnockedOut: number;
}

export async function fireShipAtTarget(params: FireShipParams): Promise<FireReport> {
  const { attacker, target, context } = params;

  const distance = context.measure.between(attacker.token, target.token, "centre-to-centre").distance;
  const bearing = context.facing.bearingOf(attacker.token, target.token);
  const targetScreenLevel = (target.system?.screens as number | undefined) ?? 0;
  const weapons = ((attacker.system?.weapons ?? []) as WeaponMount[]);

  const fire = await resolveWeaponFire({
    weapons,
    distanceMu: distance,
    bearing,
    targetScreenLevel,
    dice: context.dice
  });

  // Flag any one-shot weapons that fired as spent on the attacker.
  if (fire.spent.length > 0) {
    const updatedWeapons = weapons.map((w, i) =>
      fire.spent.includes(i) ? { ...w, spent: true } : { ...w }
    );
    await attacker.update({ "system.weapons": updatedWeapons });
  }

  const outcome = await applyDamageAndThreshold(target, fire.totalDamage, context.dice);

  return {
    distance,
    bearing,
    totalDamage: fire.totalDamage,
    shots: fire.shots,
    destroyed: outcome.destroyed,
    thresholdsCrossed: outcome.thresholdsCrossed,
    systemsKnockedOut: outcome.systemsKnockedOut
  };
}
