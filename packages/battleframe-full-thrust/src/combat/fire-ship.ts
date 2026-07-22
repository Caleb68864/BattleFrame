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
import { remainingFcs, remainingScreens } from "../ship/systems";

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
  /** Fleet Book optional layer: beams do penetrating (rerolling) damage. */
  penetrating?: boolean;
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
  /** Set when the ship could not fire at all (e.g. it has lost all fire control). */
  refused?: "no-fcs";
}

export async function fireShipAtTarget(params: FireShipParams): Promise<FireReport> {
  const { attacker, target, context, penetrating } = params;

  const distance = context.measure.between(attacker.token, target.token, "centre-to-centre").distance;
  const bearing = context.facing.bearingOf(attacker.token, target.token);

  // A ship that has lost ALL its fire control may not fire, even with working
  // weapons (FT2 "Fire Control System"). A missing fcs field defaults to "able"
  // so only a ship whose remaining FCS is zero refuses.
  const fcsRemaining = attacker.system?.fcs === undefined ? 1 : remainingFcs(attacker.system);
  if (fcsRemaining < 1) {
    return {
      distance,
      bearing,
      totalDamage: 0,
      shots: [],
      destroyed: false,
      thresholdsCrossed: [],
      systemsKnockedOut: 0,
      refused: "no-fcs"
    };
  }
  // Score against REMAINING screen level (design − knocked-out generators), so a
  // ship whose screens have been shot out no longer gets its full reduction.
  const targetScreenLevel = remainingScreens(target.system ?? {});
  const weapons = ((attacker.system?.weapons ?? []) as WeaponMount[]);

  const fire = await resolveWeaponFire({
    weapons,
    distanceMu: distance,
    bearing,
    targetScreenLevel,
    dice: context.dice,
    penetrating
  });

  // Flag any one-shot weapons that fired as spent on the attacker. Write only the
  // changed indices (targeted paths), not the whole array rebuilt from a
  // pre-await snapshot -- a full-array write would clobber any concurrent change.
  if (fire.spent.length > 0) {
    const spentUpdate: Record<string, boolean> = {};
    for (const i of fire.spent) {
      spentUpdate[`system.weapons.${i}.spent`] = true;
    }
    await attacker.update(spentUpdate);
  }

  const outcome = await applyDamageAndThreshold(target, fire.totalDamage, context.dice, fire.piercingHits);

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
