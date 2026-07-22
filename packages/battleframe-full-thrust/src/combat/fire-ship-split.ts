/**
 * Multi-FCS fire-splitting orchestrator (roadmap P2 #18). One ship with N
 * working Fire Control Systems splits its weapons across up to N targets in a
 * single turn -- each FCS directs fire at one target, dividing the weapons in any
 * combination. This ties the pure allocator (`fcs-allocation.ts`) to the existing
 * per-target fire + damage pipeline (`fire.ts` + `apply-damage.ts`), mirroring
 * `fire-ship.ts` (`fireShipAtTarget`) but for MANY targets at once.
 *
 * As with `fireShipAtTarget`, the engine services (geometry + dice) are injected
 * as `context`, so the whole split resolves without Foundry; the scene-control
 * glue passes the real `game.battleframe.measure/facing/dice` and supplies the
 * candidate targets in priority order.
 *
 * Sources: "Fire Control System (FCS)" (a ship with several FCS may split its
 * fire among that many targets), FT2 "Sequence of Play", "Weapon Ranges & Damage
 * Rolls", "Threshold Check".
 */

import { allocateFcsFire, type UnassignedWeapon } from "./fcs-allocation";
import { resolveWeaponFire, type WeaponMount, type WeaponShot } from "./fire";
import { applyDamageAndThreshold } from "./apply-damage";
import { remainingFcs, remainingScreens } from "../ship/systems";
import type { FireContext, FiringShip } from "./fire-ship";

/** One target's slice of a split: the outcome of the weapons directed at it. */
export interface SplitTargetReport {
  /** Stable id of the engaged target (token id, or its array index as a string). */
  targetId: string;
  /** The target actor's display name, when it has one. */
  targetName?: string;
  distance: number;
  bearing: number;
  totalDamage: number;
  /** Per-weapon shots, with `index` remapped to the attacker's REAL mount index. */
  shots: WeaponShot[];
  destroyed: boolean;
  thresholdsCrossed: number[];
  /** How many of the target's systems the threshold check knocked out. */
  systemsKnockedOut: number;
}

export interface FireShipSplitParams {
  attacker: FiringShip & { name?: string };
  /** Candidate targets in caller-priority order (index 0 = highest priority). */
  targets: ReadonlyArray<FiringShip & { name?: string }>;
  context: FireContext;
  /** Fleet Book optional layer: beams do penetrating (rerolling) damage. */
  penetrating?: boolean;
}

export interface FireShipSplitReport {
  /** Working-FCS count that bounded the split (missing `fcs` defaults to 1). */
  fcsCount: number;
  /** One entry per ENGAGED target, in engage order. A target that ends up with no
   *  weapon assigned to it is omitted entirely (it never appears in an assignment,
   *  so there is no empty report to emit). */
  perTarget: SplitTargetReport[];
  /** Weapons that fired at nothing this turn, each with why (from the allocator). */
  unassigned: UnassignedWeapon[];
  /** Set when the ship could not fire at all (it has lost all fire control). */
  refused?: "no-fcs";
}

/**
 * Resolve one ship firing at several targets, its weapons split across its
 * working FCS. Measures each target, allocates weapons via `allocateFcsFire`,
 * then fires + applies damage per engaged target -- remapping the sub-list-relative
 * shot/spent indexes back to the attacker's true mount indexes so reports and the
 * single spent-write reference real mounts.
 */
export async function fireShipSplit(params: FireShipSplitParams): Promise<FireShipSplitReport> {
  const { attacker, targets, context, penetrating } = params;

  // A ship that has lost ALL its fire control may not fire, even with working
  // weapons. A missing fcs field defaults to "able" (1), exactly like
  // `fireShipAtTarget`, so only a ship whose remaining FCS is zero refuses.
  const fcsCount = attacker.system?.fcs === undefined ? 1 : remainingFcs(attacker.system);
  if (fcsCount < 1) {
    return { fcsCount, perTarget: [], unassigned: [], refused: "no-fcs" };
  }

  // Measure each candidate once (centre-to-centre, per FT), deriving a stable id.
  const measured = targets.map((target, i) => {
    const tokenId = (target.token as { id?: unknown } | null | undefined)?.id;
    const id = tokenId == null ? String(i) : String(tokenId);
    const distance = context.measure.between(attacker.token, target.token, "centre-to-centre").distance;
    const bearing = context.facing.bearingOf(attacker.token, target.token);
    return { id, target, distance, bearing };
  });
  const byId = new Map(measured.map((m) => [m.id, m]));

  const weapons = (attacker.system?.weapons ?? []) as WeaponMount[];
  const allocation = allocateFcsFire({
    fcsCount,
    weapons,
    targets: measured.map((m) => ({ id: m.id, distanceMu: m.distance, bearing: m.bearing }))
  });

  // Accumulate spent one-shot weapons (by REAL mount index) across every target,
  // so they land in ONE `attacker.update` like `fireShipAtTarget` does.
  const spentReal = new Set<number>();
  const perTarget: SplitTargetReport[] = [];

  for (const assignment of allocation.assignments) {
    const m = byId.get(assignment.targetId);
    if (!m) continue; // allocator only ever returns ids we supplied; defensive.

    const { weaponIndexes } = assignment;
    const subList = weaponIndexes.map((i) => weapons[i]);
    // REMAINING screen level (design − knocked-out generators), matching fireShipAtTarget.
    const targetScreenLevel = remainingScreens(m.target.system ?? {});

    const fire = await resolveWeaponFire({
      weapons: subList,
      distanceMu: m.distance,
      bearing: m.bearing,
      targetScreenLevel,
      dice: context.dice,
      penetrating
    });

    // resolveWeaponFire indexes shots + spent against the SUB-LIST; remap both back
    // to the attacker's real mount indexes for reports and the spent-write.
    const shots: WeaponShot[] = fire.shots.map((s) => ({ ...s, index: weaponIndexes[s.index] }));
    for (const subIdx of fire.spent) spentReal.add(weaponIndexes[subIdx]);

    const outcome = await applyDamageAndThreshold(m.target, fire.totalDamage, context.dice, fire.piercingHits);

    perTarget.push({
      targetId: m.id,
      targetName: m.target.name,
      distance: m.distance,
      bearing: m.bearing,
      totalDamage: fire.totalDamage,
      shots,
      destroyed: outcome.destroyed,
      thresholdsCrossed: outcome.thresholdsCrossed,
      systemsKnockedOut: outcome.systemsKnockedOut
    });
  }

  if (spentReal.size > 0) {
    const spentUpdate: Record<string, boolean> = {};
    for (const i of spentReal) spentUpdate[`system.weapons.${i}.spent`] = true;
    await attacker.update(spentUpdate);
  }

  return { fcsCount, perTarget, unassigned: allocation.unassigned };
}
