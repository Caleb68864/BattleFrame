/**
 * Salvo missile resolution: a launcher throws a salvo of 6 one-turn missiles at a
 * target; the attacker rolls how many reach it, the target's point defence
 * intercepts some, and each survivor rolls a damage die. Screens do NOT reduce
 * salvo missiles; armour DOES absorb them (handled by the shared armour→hull
 * path). Engine services injected.
 *
 * SIMPLIFICATION: the full rules place a point-of-aim counter and resolve after
 * movement (the salvo can miss if the target moves away). This resolves directly
 * against a chosen target within range -- the combat resolution is faithful; the
 * point-of-aim/movement-prediction step is deferred.
 *
 * Sources: Fleet Book 1 "Salvo Missile Systems".
 */

import { type FireArc } from "../constants";
import { salvoIntercepted, salvoSurvivors, salvoDamage } from "./ordnance";
import { weaponBearsOn } from "./arcs";
import { remainingPds } from "../ship/systems";
import { applyDamageAndThreshold } from "./apply-damage";
import type { ShipActorLike } from "../data/ship-state";
import { requireRules } from "../rules-profile";

export interface SalvoContext {
  measure: { between: (a: unknown, b: unknown, mode?: string) => { distance: number } };
  facing: { bearingOf: (observer: unknown, target: unknown) => number };
  dice: { rollPool: (count: number, dieSize: number, options?: unknown) => Promise<number[]> };
}

export interface SalvoParams {
  attacker: {
    token: unknown;
    system?: { weapons?: Array<{ kind: string; arcs?: FireArc[]; destroyed?: boolean; spent?: boolean }> };
    update?: (data: Record<string, unknown>) => Promise<unknown>;
  };
  target: ShipActorLike & { token: unknown; system?: Record<string, any> };
  context: SalvoContext;
}

export interface SalvoReport {
  fired: boolean;
  reason?: "no-salvo" | "out-of-range" | "out-of-arc";
  onTarget: number;
  intercepted: number;
  survivors: number;
  totalDamage: number;
  destroyed: boolean;
  thresholdsCrossed: number[];
  systemsKnockedOut: number;
  /** Weapons index of the launcher that fired (to mark spent). */
  spentIndex?: number;
}

export async function resolveSalvoAtTarget(params: SalvoParams): Promise<SalvoReport> {
  const { attacker, target, context } = params;
  const idle: Omit<SalvoReport, "reason"> = {
    fired: false, onTarget: 0, intercepted: 0, survivors: 0,
    totalDamage: 0, destroyed: false, thresholdsCrossed: [], systemsKnockedOut: 0
  };

  const weapons = attacker.system?.weapons ?? [];
  const index = weapons.findIndex((w) => w.kind === "salvo" && !w.destroyed && !w.spent);
  if (index < 0) {
    return { ...idle, reason: "no-salvo" };
  }

  const distance = context.measure.between(attacker.token, target.token, "centre-to-centre").distance;
  if (!Number.isFinite(distance) || distance > requireRules().salvoRangeMu) {
    return { ...idle, reason: "out-of-range" };
  }
  const bearing = context.facing.bearingOf(attacker.token, target.token);
  if (!weaponBearsOn(weapons[index].arcs ?? [], bearing)) {
    return { ...idle, reason: "out-of-arc" };
  }

  // Missiles that reach the target (1d6 of the salvo of 6).
  const [onTargetDie] = await context.dice.rollPool(1, requireRules().dieSize);
  const onTarget = onTargetDie ?? 0;

  // Point defence intercepts.
  const pds = remainingPds(target.system ?? {});
  const pdsFaces = pds > 0 ? await context.dice.rollPool(pds, requireRules().dieSize) : [];
  const intercepted = salvoIntercepted(pdsFaces);
  const survivors = salvoSurvivors(onTarget, intercepted);

  // Each surviving missile rolls a damage die; screens do not reduce; armour does.
  const damageFaces = survivors > 0 ? await context.dice.rollPool(survivors, requireRules().dieSize) : [];
  const damage = salvoDamage(damageFaces);

  const outcome = await applyDamageAndThreshold(target, damage, context.dice);

  // The launcher is spent (one salvo; SMR-style one-shot).
  if (typeof attacker.update === "function") {
    const updated = weapons.map((w, i) => (i === index ? { ...w, spent: true } : { ...w }));
    await attacker.update({ "system.weapons": updated });
  }

  return {
    fired: true,
    onTarget,
    intercepted,
    survivors,
    totalDamage: damage,
    destroyed: outcome.destroyed,
    thresholdsCrossed: outcome.thresholdsCrossed,
    systemsKnockedOut: outcome.systemsKnockedOut,
    spentIndex: index
  };
}
