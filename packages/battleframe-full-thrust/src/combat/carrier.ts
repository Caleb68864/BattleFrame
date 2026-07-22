/**
 * The pure carrier fighter-operations core (roadmap P2 #14): bay capacity, the
 * per-turn launch and recovery limits, the reach-home rendezvous test, and
 * endurance depletion with the "return or be lost" threshold. All the state
 * bookkeeping a Foundry orchestrator drives -- which actual token launches,
 * whose flag records "aboard", the constant-course order -- lives above; this
 * file is only the numbers and predicates it calls.
 *
 * It deliberately REUSES the existing cores instead of re-deriving them:
 *   - endurance math (`enduranceAfterActiveTurn`, `enduranceExhausted`,
 *     `enduranceForType`) from combat/fighters.ts, and
 *   - the movement reach geometry (`canReachToAttack`) from movement/fighter-move.ts,
 * so distance/endurance are defined in exactly one place each.
 *
 * Sources (user's notes): "Carriers & Fighter Bays" (capacity, launch/recovery
 * limits, constant-course rendezvous) and "Fighter Endurance" (per-active-turn
 * depletion, exhaustion forces a return, More Thrust "lost within 3 turns").
 */

import {
  FIGHTERS_PER_BAY,
  CARRIER_LAUNCH_PER_TURN,
  SHIP_LAUNCH_PER_TURN,
  FIGHTER_RECOVER_PER_TURN,
  FIGHTER_RETURN_GRACE_TURNS
} from "../constants";
import {
  enduranceAfterActiveTurn,
  enduranceExhausted,
  enduranceForType
} from "./fighters";
import { canReachToAttack, type Point } from "../movement/fighter-move";

/** A carrier's fighter-handling state for a turn (the counters an orchestrator keeps). */
export interface CarrierState {
  /** Functional (un-knocked-out) fighter bays; each holds one group. */
  bays: number;
  /** Groups currently docked in bays (available to launch; a free bay is a landing slot). */
  aboard: number;
  /** True for an actual carrier (launches two groups/turn); false for any other ship (one). */
  isTrueCarrier: boolean;
  /** Groups already launched this turn (against the launch limit). */
  launchedThisTurn: number;
  /** Groups already recovered this turn (against the recovery limit). */
  recoveredThisTurn: number;
}

/** The minimum a group needs for endurance math; extra fields are preserved by the helpers. */
export interface EnduranceGroup {
  endurance: number;
  fighterType?: string;
}

/**
 * A carrier's capacity, in both units the note states: one 6-fighter group per
 * functional bay. So `groups` = bays and `fighters` = bays x 6. Passing the bay
 * count (rather than a ship class) keeps this damage-aware -- a knocked-out bay
 * simply lowers the count, matching "each lost bay reduces capacity by six".
 */
export function bayCapacity(bays: number): { groups: number; fighters: number } {
  return { groups: bays, fighters: bays * FIGHTERS_PER_BAY };
}

/** Groups a ship may launch per turn: 2 for an actual carrier, 1 for anything else. */
export function launchLimit(isTrueCarrier: boolean): number {
  return isTrueCarrier ? CARRIER_LAUNCH_PER_TURN : SHIP_LAUNCH_PER_TURN;
}

/**
 * Whether the carrier may launch another group this turn: it has a group aboard
 * and has not yet hit its launch limit. (The rule that the carrier must hold a
 * constant course/velocity to launch is the orchestrator's to enforce on the
 * ship's move; it is not a fighter-side number.)
 */
export function canLaunch(carrier: CarrierState): boolean {
  return carrier.aboard > 0 && carrier.launchedThisTurn < launchLimit(carrier.isTrueCarrier);
}

/**
 * Whether the carrier may accept a returning group this turn: it has not yet
 * used its single recovery and has a free bay to land it in. Any fighter-carrying
 * ship recovers only one group per turn ("All fighter-carrying ships may recover
 * only 1 group per turn"). This is the capacity side of recovery; `canRecover`
 * below is the geometric side (can the group physically reach the carrier).
 */
export function carrierCanRecover(carrier: CarrierState): boolean {
  return carrier.recoveredThisTurn < FIGHTER_RECOVER_PER_TURN && carrier.aboard < carrier.bays;
}

/**
 * Whether a deployed group can reach its carrier and dock this turn -- the
 * end-of-move rendezvous ("the group is moved to meet it at the END of the
 * move"). Reuses the movement core's `canReachToAttack` geometry: the group can
 * dock exactly when it can end its move within `dockRangeMu` of the carrier,
 * using its type's movement allowance (Fast 18mu, else 12mu).
 *
 * ASSUMPTION (docking tolerance): the notes give no explicit docking distance, so
 * the default `dockRangeMu` is 0 -- the group must be able to land on the
 * carrier's point within its movement allowance (i.e. straight-line distance <=
 * its move). A base-to-base contact tolerance can be supplied by the caller if a
 * later geometry layer wants token radii folded in.
 */
export function canRecover(
  groupPos: Point,
  carrierPos: Point,
  fighterType?: string,
  dockRangeMu: number = 0
): boolean {
  return canReachToAttack(groupPos, carrierPos, fighterType, dockRangeMu).canAttack;
}

/**
 * A group's endurance after a turn. An ACTIVE turn (the group attacked or was
 * attacked) spends one endurance; a turn of pure movement/loitering spends
 * nothing ("Turns spent merely loitering or moving without combat cost
 * nothing"). Defaults to an active turn. Other group fields pass through
 * unchanged.
 */
export function enduranceAfterTurn<G extends EnduranceGroup>(group: G, active: boolean = true): G {
  if (!active) return group;
  return { ...group, endurance: enduranceAfterActiveTurn(group.endurance) };
}

/**
 * Whether a group is out of fuel and MUST head back to a carrier ("Once
 * endurance is used up the group MUST head back ... to rearm and refuel").
 */
export function mustReturn(group: EnduranceGroup): boolean {
  return enduranceExhausted(group.endurance);
}

/**
 * Whether an exhausted group that still has not rendezvoused is lost. More Thrust
 * gives it a grace of `FIGHTER_RETURN_GRACE_TURNS` turns after running dry; once
 * that many turns have elapsed without reaching a carrier the group is lost.
 * (Fleet Book 1 imposes no such limit -- see the constant's note -- so this
 * predicate is for the More Thrust endurance variant only.)
 */
export function isLost(turnsSinceExhausted: number): boolean {
  return turnsSinceExhausted >= FIGHTER_RETURN_GRACE_TURNS;
}

/**
 * Recover a group into a bay: rearm and refuel restores its endurance to its
 * type's full allowance (Long-Range 5, every other type 3). Other group fields
 * pass through unchanged. The docking itself (decrementing `aboard`/free bays)
 * is the orchestrator's bookkeeping on `CarrierState`; morale is deliberately
 * NOT touched, as the notes describe only rearm/refuel, not a morale reset.
 */
export function recover<G extends EnduranceGroup>(group: G): G {
  return { ...group, endurance: enduranceForType(group.fighterType) };
}
