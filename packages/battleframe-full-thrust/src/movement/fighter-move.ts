/**
 * The pure fighter-movement core: the geometry a later Foundry token orchestrator
 * drives (who moves, when, and the actual token nudge live in the orchestrator,
 * exactly as path.ts / vector.ts leave the token move out).
 *
 * Fighters move UNLIKE ships. A ship traces a cinematic pivot-move path bounded by
 * a turning cap (path.ts); a fighter GROUP instead moves a FLAT distance in ANY
 * direction each turn -- 12 mu standard, 18 mu Fast -- tracking no course or
 * velocity and ignoring ship turning limits entirely. Source (user's "Fighter
 * Groups" note): "in the fighter movement portion of the turn you simply move any
 * or all operational groups up to 12 mu in any direction ... Groups need no
 * written movement orders and you do not track their course or velocity." The Fast
 * type's 18 mu is requireRules().fighterMoveFastMu ("Specialised Fighter Types").
 *
 * Positions are {x, y} in mu, screen space: x right, y DOWN (so "up" is -y) -- the
 * SAME convention as vector.ts and path.ts, just named x/y for a plain point.
 *
 * FORE ARC: to strike, the target must lie in the fighters' FORE arc and all
 * fighters must engage one ship within 6 mu (user's "Fighter Attacks" note). But a
 * group tracks NO facing ("you do not track their course or velocity"), so it may
 * freely orient at the end of its move to place the target in its own fore arc.
 * The fore-arc rule therefore imposes NO positional reachability constraint here;
 * only the move + strike RANGE gates the attack. (Assumption, stated because the
 * two notes are in tension: fore arc required, yet no facing tracked -- resolved
 * in favour of "free orientation", the only reading consistent with both.)
 *
 * NOT modelled here (deliberately): move + strike happen in the SAME turn in the
 * normal fighter flow (the notes give no "move OR attack" restriction for a strike
 * run), so nothing blocks it; morale, endurance, dogfighting and anti-fighter
 * defences are separate concerns handled elsewhere.
 */

import { fighterMoveForType } from "../combat/fighter-types";
import { velocityMagnitude } from "./vector";
import { requireRules } from "../rules-profile";

/** A position in mu, screen space (x right, y DOWN). */
export interface Point {
  x: number;
  y: number;
}

/** The result of testing whether a group can move into strike range this turn. */
export interface AttackReach {
  /** True if the group can end its move within the attack range of the target. */
  canAttack: boolean;
  /** Where the group ends its move: at the edge of strike range, or its full advance if it falls short. */
  intercept: Point;
  /** Straight-line mu gap remaining from the intercept to the target. */
  distanceToTarget: number;
}

/**
 * A group's movement allowance this turn (mu): Fast gets 18, every other type the
 * standard 12. Reuses `fighterMoveForType` so the type table lives in one place.
 */
export function fighterMaxMove(fighterType?: string): number {
  return fighterMoveForType(fighterType);
}

/**
 * Straight-line distance (mu) between two points. Reuses vector.ts's
 * `velocityMagnitude` (the magnitude of the displacement vector) rather than
 * re-deriving hypot -- there is no two-point distance helper to share, only this
 * single-vector magnitude, so the reuse is genuine and not a duplicate.
 */
export function distance(from: Point, to: Point): number {
  return velocityMagnitude({ vx: to.x - from.x, vy: to.y - from.y });
}

/**
 * The new position after moving up to `maxMu` in a straight line toward `to`. If
 * the target is within reach the group LANDS ON it (fighters move in any
 * direction, so there is no turning penalty); otherwise it advances exactly
 * `maxMu` along the line. A zero (or negative) allowance, or a target on top of
 * the group, leaves it in place.
 */
export function moveToward(from: Point, to: Point, maxMu: number): Point {
  const gap = distance(from, to);
  if (maxMu <= 0 || gap === 0) return { x: from.x, y: from.y };
  if (gap <= maxMu) return { x: to.x, y: to.y };
  const t = maxMu / gap;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/**
 * Whether the group can end its move within `attackRangeMu` of `target` this turn
 * (move + strike), and where it would end up (the intercept). It closes only far
 * enough to reach the edge of strike range -- never overshooting onto the ship --
 * so a group already in range does not move at all. If the target is beyond the
 * combined move + strike reach the group still advances its full allowance toward
 * it (`canAttack: false`), which is the best a token orchestrator can do this turn.
 *
 * The fore-arc requirement is not tested here: a group tracks no facing and orients
 * freely at end of move (see the file header), so range alone gates the strike.
 */
export function canReachToAttack(
  from: Point,
  target: Point,
  fighterType?: string,
  attackRangeMu: number = requireRules().fighterAttackRangeMu
): AttackReach {
  const maxMove = fighterMaxMove(fighterType);
  const gap = distance(from, target);
  // Distance the group must actually cover to bring the target inside strike range.
  const needed = Math.max(0, gap - attackRangeMu);
  const travel = Math.min(maxMove, needed);
  const intercept = moveToward(from, target, travel);
  const distanceToTarget = distance(intercept, target);
  // Epsilon guards the exact-limit case (float drift when travel === needed).
  return {
    canAttack: distanceToTarget <= attackRangeMu + 1e-9,
    intercept,
    distanceToTarget
  };
}
