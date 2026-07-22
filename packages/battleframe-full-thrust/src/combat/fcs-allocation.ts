/**
 * Multi-FCS fire-splitting (roadmap P2 #18).
 *
 * Each working Fire Control System directs fire at ONE target ship per turn, so
 * a ship with N working FCS may split its weapons across up to N distinct
 * targets — dividing its weapons in any combination — with every weapon assigned
 * only to a target it bears on AND is in range of. If all FCS are lost the ship
 * may not fire at all. A single weapon's dice may NOT be split: a weapon fires
 * wholly at one target. Source: "Fire Control System (FCS)" —
 *   "Each functioning FCS icon lets the ship engage ONE target ship in a turn …
 *    A ship with several FCS may split its fire among that many separate targets,
 *    dividing its weapons in any combination between them. If a ship loses all
 *    its FCS to damage, it may not fire at all."
 *
 * PURE: no Foundry, no dice. The caller supplies the working-FCS count (from
 * `ship/systems.ts` `remainingFcs` at the call site) and each candidate target's
 * already-measured distance + bearing (mirroring `combat/targeting.ts`
 * `previewTargeting`). Whether a weapon bears + is in range of a target is decided
 * by REUSING `previewTargeting` (a weapon can engage a target iff its row is
 * `will-fire`) — the arc/range logic is never re-derived here.
 *
 * ALLOCATION STRATEGY (greedy, caller-priority-ordered). Targets are consumed in
 * the order the caller supplies them (`targets[0]` = highest priority). Weapons
 * are consumed in mount order. Each weapon goes to the highest-priority target it
 * can engage that is ALREADY engaged, so fire concentrates and FCS slots are
 * conserved; only if no engaged target bears/ranges does it open a new FCS slot
 * on the highest-priority eligible target (while engaged < N). A weapon that can
 * engage some target but finds every FCS committed elsewhere is left unassigned
 * with reason `fcs-cap`. This yields a VALID (never optimal) split; concentrating
 * fire matches typical tactical intent, and priority order is the caller's lever.
 */

import type { WeaponMount } from "./fire";
import { previewTargeting, type TargetingStatus } from "./targeting";

/** A candidate target with geometry the caller has already measured. */
export interface AllocationTarget {
  /** Caller's stable identifier (token/actor id) for the target ship. */
  id: string;
  /** Base-to-base distance to the target, mu. */
  distanceMu: number;
  /** Bearing to the target, degrees clockwise, 0 = dead ahead. */
  bearing: number;
}

/** Why a weapon could not be assigned to any target. */
export type UnassignableReason =
  | "destroyed"
  | "spent"
  | "no-class"
  /** Bears on / is in range of no candidate target. */
  | "no-target"
  /** Could engage a target, but every working FCS is committed elsewhere. */
  | "fcs-cap";

export interface UnassignedWeapon {
  index: number;
  reason: UnassignableReason;
}

/** One FCS's worth of fire: the weapons directed at a single target. */
export interface TargetAssignment {
  targetId: string;
  /** Mount indexes of the weapons firing at this target, in mount order. */
  weaponIndexes: number[];
}

export interface FcsAllocationResult {
  /** One entry per engaged target (≤ fcsCount entries), in engage order. */
  assignments: TargetAssignment[];
  /** Weapons that fire at nothing this turn, each with why. */
  unassigned: UnassignedWeapon[];
}

export interface AllocateFcsFireParams {
  /** Working FCS count — the number of distinct targets that may be engaged. */
  fcsCount: number;
  weapons: readonly WeaponMount[];
  /** Candidate targets in caller-priority order (index 0 = highest priority). */
  targets: readonly AllocationTarget[];
}

/**
 * Target-independent unavailability of a weapon, used to label an unassignable
 * weapon when there is no candidate target to preview it against. This inspects
 * the mount's own availability flags (destroyed / spent / classless) — NOT arc or
 * range, which stay owned by `previewTargeting`.
 */
function intrinsicStatus(weapon: WeaponMount): TargetingStatus {
  if (weapon.destroyed) return "destroyed";
  if (weapon.spent) return "spent";
  if (weapon.kind === "beam" && (!weapon.weaponClass || weapon.weaponClass < 1)) return "no-class";
  return "out-of-range"; // a generic "cannot engage" stand-in
}

/** Map a non-`will-fire` targeting status to the weapon's unassignable reason. */
function reasonFor(status: TargetingStatus): UnassignableReason {
  switch (status) {
    case "destroyed":
      return "destroyed";
    case "spent":
      return "spent";
    case "no-class":
      return "no-class";
    default:
      // out-of-arc / out-of-range for every candidate → bears/ranges nothing.
      return "no-target";
  }
}

/**
 * Build the engageability matrix: `status[w][t]` is weapon `w`'s targeting status
 * against target `t`, computed by reusing `previewTargeting` per target. A weapon
 * can engage target `t` iff `status[w][t] === "will-fire"`.
 */
function engageabilityMatrix(
  weapons: readonly WeaponMount[],
  targets: readonly AllocationTarget[]
): TargetingStatus[][] {
  const perTarget = targets.map((t) =>
    previewTargeting({ weapons, distanceMu: t.distanceMu, bearing: t.bearing })
  );
  return weapons.map((_, w) => perTarget.map((rows) => rows[w].status));
}

/**
 * Allocate a ship's weapons across up to `fcsCount` targets (see file header for
 * the strategy). Returns per-target weapon lists plus any unassignable weapons.
 */
export function allocateFcsFire(params: AllocateFcsFireParams): FcsAllocationResult {
  const { fcsCount, weapons, targets } = params;
  const cap = Math.max(0, Math.floor(fcsCount));
  const status = engageabilityMatrix(weapons, targets);

  const assignments: TargetAssignment[] = [];
  const unassigned: UnassignedWeapon[] = [];
  // Engaged target index -> its assignment, so weapons pack onto opened slots.
  const engaged = new Map<number, TargetAssignment>();

  for (let w = 0; w < weapons.length; w++) {
    // Eligible targets for this weapon, already in caller-priority order.
    const eligible: number[] = [];
    for (let t = 0; t < targets.length; t++) {
      if (status[w][t] === "will-fire") eligible.push(t);
    }

    if (eligible.length === 0) {
      const s = targets.length > 0 ? status[w][0] : intrinsicStatus(weapons[w]);
      unassigned.push({ index: w, reason: reasonFor(s) });
      continue;
    }

    // Prefer the highest-priority target that is already engaged (concentrate
    // fire, conserve FCS slots); tie-break is caller order via `eligible`.
    const alreadyEngaged = eligible.find((t) => engaged.has(t));
    if (alreadyEngaged !== undefined) {
      engaged.get(alreadyEngaged)!.weaponIndexes.push(w);
      continue;
    }

    // No engaged target bears — open a new FCS slot if one is free.
    if (engaged.size < cap) {
      const t = eligible[0];
      const assignment: TargetAssignment = { targetId: targets[t].id, weaponIndexes: [w] };
      assignments.push(assignment);
      engaged.set(t, assignment);
      continue;
    }

    // Bears on a target, but every FCS is directed elsewhere.
    unassigned.push({ index: w, reason: "fcs-cap" });
  }

  return { assignments, unassigned };
}

/** A rule an allocation broke. An empty violation list means the allocation is legal. */
export type AllocationViolation =
  | { type: "fcs-cap-exceeded"; engaged: number; cap: number }
  | { type: "unknown-target"; targetId: string }
  | { type: "cannot-engage"; weaponIndex: number; targetId: string; status: TargetingStatus }
  | { type: "duplicate-weapon"; weaponIndex: number };

export interface ValidateAllocationParams {
  fcsCount: number;
  weapons: readonly WeaponMount[];
  targets: readonly AllocationTarget[];
  assignments: readonly TargetAssignment[];
}

/**
 * Check an allocation against the FCS rules, returning every violation (empty =
 * legal). Rejects: engaging more distinct targets than the working-FCS cap;
 * assigning a weapon to a target it does not bear on / is out of range of;
 * assigning to an unknown target id; and splitting one weapon across two targets.
 */
export function validateAllocation(params: ValidateAllocationParams): AllocationViolation[] {
  const { fcsCount, weapons, targets, assignments } = params;
  const cap = Math.max(0, Math.floor(fcsCount));
  const violations: AllocationViolation[] = [];

  const targetById = new Map(targets.map((t) => [t.id, t]));

  // (a) FCS cap: count distinct targets that actually have a weapon on them.
  const engagedIds = new Set<string>();
  for (const a of assignments) {
    if (a.weaponIndexes.length > 0) engagedIds.add(a.targetId);
  }
  if (engagedIds.size > cap) {
    violations.push({ type: "fcs-cap-exceeded", engaged: engagedIds.size, cap });
  }

  // (b) Per-weapon bearing/range, unknown targets, and single-target dice rule.
  const weaponTargetCount = new Map<number, number>();
  for (const a of assignments) {
    const target = targetById.get(a.targetId);
    if (!target) {
      violations.push({ type: "unknown-target", targetId: a.targetId });
      continue; // cannot check engageability without geometry
    }
    const rows = previewTargeting({
      weapons,
      distanceMu: target.distanceMu,
      bearing: target.bearing
    });
    for (const w of a.weaponIndexes) {
      weaponTargetCount.set(w, (weaponTargetCount.get(w) ?? 0) + 1);
      const s = rows[w]?.status ?? intrinsicStatus(weapons[w]);
      if (s !== "will-fire") {
        violations.push({ type: "cannot-engage", weaponIndex: w, targetId: a.targetId, status: s });
      }
    }
  }

  // (c) A weapon's dice cannot split: it may appear on at most one target.
  for (const [w, count] of weaponTargetCount) {
    if (count > 1) violations.push({ type: "duplicate-weapon", weaponIndex: w });
  }

  return violations;
}
