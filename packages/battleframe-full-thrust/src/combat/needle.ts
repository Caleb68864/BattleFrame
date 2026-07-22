/**
 * Needle-beam strike: a precision shot that knocks out ONE nominated enemy
 * system on a 6, ignoring screens and armour (it does no hull damage). Unlike
 * ordinary weapons this targets a specific system, so it is its own orchestrator
 * rather than part of the pooled fire. Engine services injected.
 *
 * Sources: FT2 "Needle Beams".
 */

import { DIE_SIZE } from "../constants";
import { needleInRange, needleHit } from "./ordnance";
import { weaponBearsOn } from "./arcs";
import { enumerateSurvivingSystems, applySystemKnockouts, type SystemRef } from "../ship/systems";
import { syncShipStatuses } from "../status";
import type { ShipActorLike } from "../data/ship-state";
import type { FireArc } from "../constants";

export interface NeedleContext {
  measure: { between: (a: unknown, b: unknown, mode?: string) => { distance: number } };
  facing: { bearingOf: (observer: unknown, target: unknown) => number };
  dice: { rollPool: (count: number, dieSize: number, options?: unknown) => Promise<number[]> };
}

export interface NeedleParams {
  attacker: { token: unknown; system?: { weapons?: Array<{ kind: string; arcs?: FireArc[]; destroyed?: boolean }> } };
  target: ShipActorLike & { token: unknown; system?: Record<string, any> };
  /** Which kind of system to snipe. */
  systemType: SystemRef["type"];
  context: NeedleContext;
}

export interface NeedleReport {
  fired: boolean;
  hit: boolean;
  reason?: "no-needle" | "out-of-range" | "out-of-arc" | "no-such-system";
  systemType: SystemRef["type"];
}

export async function fireNeedleAtSystem(params: NeedleParams): Promise<NeedleReport> {
  const { attacker, target, systemType, context } = params;
  const idle = { fired: false, hit: false, systemType };

  // A working needle mount that can bear on the target.
  const needle = (attacker.system?.weapons ?? []).find((w) => w.kind === "needle" && !w.destroyed);
  if (!needle) {
    return { ...idle, reason: "no-needle" };
  }

  const distance = context.measure.between(attacker.token, target.token, "centre-to-centre").distance;
  if (!needleInRange(distance)) {
    return { ...idle, reason: "out-of-range" };
  }

  const bearing = context.facing.bearingOf(attacker.token, target.token);
  if (!weaponBearsOn(needle.arcs ?? [], bearing)) {
    return { ...idle, reason: "out-of-arc" };
  }

  // Find a surviving system of the nominated type to aim at.
  const ref = enumerateSurvivingSystems(target.system ?? {}).find((r) => r.type === systemType);
  if (!ref) {
    return { ...idle, reason: "no-such-system" };
  }

  const [face] = await context.dice.rollPool(1, DIE_SIZE, {
    flavor: `needle beam vs ${systemType}`
  });
  const hit = face !== undefined && needleHit(face);

  if (hit) {
    await target.update(applySystemKnockouts(target.system ?? {}, [ref]));
    await syncShipStatuses(target);
  }

  return { fired: true, hit, systemType };
}
