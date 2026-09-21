/**
 * Independent (More Thrust) missile combat resolution: a one-shot AI craft that,
 * after ships have moved, strikes a ship that FINISHED within 6mu of it and is
 * NOT in the missile's rear arc. The target's point defence fires first (a PDS or
 * anti-fighter system kills the missile on a 6 -- one die per system, and that
 * die can't also be anti-fighter that turn; the caller enforces the die budget by
 * how many it rolls). A surviving missile detonates its warhead. Three payloads
 * (all bypass screens):
 *   Normal (nuclear) — roll 2 dice, the TOTAL is the damage; armour DOES absorb.
 *   EMP — no hull damage; roll one die minus target screen level, then knock out
 *         systems as a threshold check (5-6 on a 3-4 roll, 4-6 on a 5-6 roll).
 *   Needle — like a needle beam: nominate one system; a 4-6 knocks it out, and
 *         the die is also dealt as normal damage (a 1-3 only does that damage).
 * Engine services injected.
 *
 * This is distinct from `combat/salvo.ts` (Fleet Book salvo missiles, fired as a
 * salvo of 6 straight from a ship): here the missile is a moving craft resolved
 * from wherever it ended its own move (see `movement/missile-path.ts`).
 *
 * Sources: More Thrust "Missiles (Basic)" + "Missile Warheads" (Normal/EMP/Needle).
 */

import { arcForBearing } from "./arcs";
import { pdsKillsVsMissiles } from "./fighters";
import {
  remainingPds,
  remainingScreens,
  enumerateSurvivingSystems,
  applySystemKnockouts,
  type SystemRef
} from "../ship/systems";
import { knockedOutIndices } from "../ship/threshold";
import { applyDamageAndThreshold } from "./apply-damage";
import { syncShipStatuses } from "../status";
import type { ShipActorLike } from "../data/ship-state";
import { requireRules } from "../rules-profile";

export interface MissileContext {
  measure: { between: (a: unknown, b: unknown, mode?: string) => { distance: number } };
  facing: { bearingOf: (observer: unknown, target: unknown) => number };
  dice: { rollPool: (count: number, dieSize: number, options?: unknown) => Promise<number[]> };
}

/** The independent-missile payload; defaults to "normal" (the nuclear warhead). */
export type MissileWarhead = "normal" | "emp" | "needle";

export interface MissileParams {
  /** The active missile craft (its token gives the measure/bearing origin). */
  missile: { token: unknown };
  target: ShipActorLike & { token: unknown; system?: Record<string, any> };
  /** Which warhead detonates on a successful strike. Defaults to "normal". */
  warhead?: MissileWarhead;
  /** Needle warhead only: the system the owner nominates to snipe. */
  systemType?: SystemRef["type"];
  context: MissileContext;
}

export interface MissileAttackReport {
  attacked: boolean;
  reason?: "out-of-range" | "in-rear-arc";
  /** Which warhead resolved (echoes the request; "normal" when unspecified). */
  warhead: MissileWarhead;
  /** The target's point defence killed the missile before it could strike. */
  intercepted: boolean;
  totalDamage: number;
  destroyed: boolean;
  thresholdsCrossed: number[];
  systemsKnockedOut: number;
  /** Needle warhead only: whether the nominated system was knocked out. */
  nominatedSystemKnockedOut?: boolean;
}

/**
 * Whether a missile may attack a ship that finished at `distanceMu` and
 * `bearingFromMissile` (degrees, clockwise, 0 = the missile's dead ahead): within
 * 6mu AND not in the missile's rear ("A") arc. Pure -- the range/bearing come
 * from the engine's measure/facing services.
 */
export function missileCanAttack(distanceMu: number, bearingFromMissile: number): boolean {
  if (!Number.isFinite(distanceMu) || distanceMu > requireRules().missileAttackRangeMu) {
    return false;
  }
  return arcForBearing(bearingFromMissile) !== requireRules().missileRearArc;
}

export async function resolveMissileAttack(params: MissileParams): Promise<MissileAttackReport> {
  const { missile, target, context } = params;
  const warhead: MissileWarhead = params.warhead ?? "normal";
  const idle: Omit<MissileAttackReport, "reason"> = {
    attacked: false, intercepted: false, totalDamage: 0,
    destroyed: false, thresholdsCrossed: [], systemsKnockedOut: 0, warhead
  };

  const distance = context.measure.between(missile.token, target.token, "centre-to-centre").distance;
  if (!Number.isFinite(distance) || distance > requireRules().missileAttackRangeMu) {
    return { ...idle, reason: "out-of-range" };
  }
  const bearing = context.facing.bearingOf(missile.token, target.token);
  if (!missileCanAttack(distance, bearing)) {
    return { ...idle, reason: "in-rear-arc" };
  }

  // Point defence fires first: each PDS rolls one die and a 6 kills the missile.
  // Shared by every warhead type -- the interception step is warhead-agnostic.
  const pds = remainingPds(target.system ?? {});
  const pdsFaces = pds > 0 ? await context.dice.rollPool(pds, requireRules().dieSize) : [];
  if (pdsKillsVsMissiles(pdsFaces) > 0) {
    return { ...idle, intercepted: true };
  }

  // A surviving missile detonates its warhead.
  switch (warhead) {
    case "emp":
      return resolveEmpWarhead(target, context, idle);
    case "needle":
      return resolveNeedleWarhead(target, params.systemType, context, idle);
    default:
      return resolveNormalWarhead(target, context, idle);
  }
}

/**
 * Normal (nuclear) warhead: roll 2 dice, the TOTAL is the damage (screens do not
 * reduce; armour absorbs via the shared armour->hull->threshold path).
 * Source: More Thrust "Missile Warheads" — Normal.
 */
async function resolveNormalWarhead(
  target: MissileParams["target"],
  context: MissileContext,
  idle: Omit<MissileAttackReport, "reason">
): Promise<MissileAttackReport> {
  const warheadFaces = await context.dice.rollPool(requireRules().missileNormalWarheadDice, requireRules().dieSize);
  const damage = warheadFaces.reduce((sum, face) => sum + face, 0);

  const outcome = await applyDamageAndThreshold(target, damage, context.dice);

  return {
    ...idle,
    attacked: true,
    totalDamage: damage,
    destroyed: outcome.destroyed,
    thresholdsCrossed: outcome.thresholdsCrossed,
    systemsKnockedOut: outcome.systemsKnockedOut
  };
}

/**
 * EMP warhead: no hull damage. Roll one die minus the target's screen level;
 * 1-2 = no effect, 3-4 = every system rolls a threshold check knocked out on
 * 5-6, 5-6 = every system rolls knocked out on 4-6. Reuses the same surviving-
 * systems / threshold / knockout primitives as an ordinary threshold check.
 * Source: More Thrust "Missile Warheads" — EMP.
 */
async function resolveEmpWarhead(
  target: MissileParams["target"],
  context: MissileContext,
  idle: Omit<MissileAttackReport, "reason">
): Promise<MissileAttackReport> {
  const [effectFace = 0] = await context.dice.rollPool(requireRules().missileEmpWarheadDice, requireRules().dieSize);
  const effect = effectFace - remainingScreens(target.system ?? {});

  let killOn: number | null;
  if (effect <= requireRules().missileEmpNoEffectMax) killOn = null;
  else if (effect <= requireRules().missileEmpWeakMax) killOn = requireRules().missileEmpWeakKillOn;
  else killOn = requireRules().missileEmpStrongKillOn;

  let systemsKnockedOut = 0;
  if (killOn !== null) {
    const refs = enumerateSurvivingSystems(target.system ?? {});
    if (refs.length > 0) {
      const faces = await context.dice.rollPool(refs.length, requireRules().dieSize);
      const lostRefs = knockedOutIndices(faces, killOn).map((i) => refs[i]);
      systemsKnockedOut = lostRefs.length;
      if (lostRefs.length > 0) {
        await target.update(applySystemKnockouts(target.system ?? {}, lostRefs));
      }
    }
  }

  // No hull damage means no defeated-status change from this warhead, but the
  // knocked-out systems may cripple the ship -- reflect them on its token.
  await syncShipStatuses(target);

  return { ...idle, attacked: true, systemsKnockedOut };
}

/**
 * Needle warhead: nominate one system. Roll a die; its face is dealt as normal
 * damage (armour absorbs, screens bypassed, via the shared path), and on a 4-6
 * the nominated system is additionally knocked out. Reuses the same system-
 * knockout primitives as `combat/needle.ts`.
 * Source: More Thrust "Missile Warheads" — Needle. (Single-die reading; see the
 * MISSILE_NEEDLE_* constants for the alternative interpretation.)
 */
async function resolveNeedleWarhead(
  target: MissileParams["target"],
  systemType: SystemRef["type"] | undefined,
  context: MissileContext,
  idle: Omit<MissileAttackReport, "reason">
): Promise<MissileAttackReport> {
  const [face = 0] = await context.dice.rollPool(requireRules().missileNeedleWarheadDice, requireRules().dieSize);

  // The die is always dealt as normal damage (1-6), whether or not it hits.
  const outcome = await applyDamageAndThreshold(target, face, context.dice);

  let systemsKnockedOut = outcome.systemsKnockedOut;
  let nominatedSystemKnockedOut = false;

  if (!outcome.destroyed && face >= requireRules().missileNeedleKnockoutMin && systemType) {
    const ref = enumerateSurvivingSystems(target.system ?? {}).find((r) => r.type === systemType);
    if (ref) {
      await target.update(applySystemKnockouts(target.system ?? {}, [ref]));
      await syncShipStatuses(target);
      nominatedSystemKnockedOut = true;
      systemsKnockedOut += 1;
    }
  }

  return {
    ...idle,
    attacked: true,
    totalDamage: face,
    destroyed: outcome.destroyed,
    thresholdsCrossed: outcome.thresholdsCrossed,
    systemsKnockedOut,
    nominatedSystemKnockedOut
  };
}
