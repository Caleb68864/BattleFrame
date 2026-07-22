/**
 * Cinematic course-change EXECUTION: the pivot-move-pivot-move path a ship
 * traces when it turns. `applyOrder` gives the final velocity + heading; this
 * computes WHERE the ship ends up, which a turn changes (not just its facing).
 *
 * Procedure (Making Course Changes): pivot half the total turn rounded DOWN,
 * move half the (resulting) velocity straight ahead, pivot the remaining turn,
 * move the remaining half. So a 1-point turn happens entirely at the mid-point.
 *
 * Output displacements are in scene distance units (mu), from the ship's start,
 * in screen space: x right, y DOWN, so course 12 ("up") is -y. A course N faces
 * (N mod 12) x 30 degrees clockwise from up. Pure -- the mu->pixel conversion and
 * the token move/rotate live in the orchestrator.
 *
 * Sources: FT2 "Making Course Changes", "Cinematic Movement", "Course & the
 * Clockface".
 */

import { COURSE_POINT_DEGREES, COURSES } from "../constants";
import { parseOrder, applyOrder, type MovementState, type ApplyOrderResult } from "./orders";

export interface Displacement {
  dx: number;
  dy: number;
}

export interface MovementPath {
  legal: boolean;
  reason?: ApplyOrderResult["reason"];
  /** Resulting velocity (post-order) -- the distance moved this turn. */
  velocity: number;
  /** Final heading (course 1-12). */
  course: number;
  /** Heading after the first (rounded-down) half of the turn. */
  midCourse: number;
  /** Displacement to the mid-point of the move (after the first half-move). */
  waypoint: Displacement;
  /** Total displacement to the ship's final position. */
  end: Displacement;
}

/** The heading of a course as an angle in degrees, clockwise from up. */
function courseHeadingDegrees(course: number): number {
  return (course % COURSES) * COURSE_POINT_DEGREES;
}

/** Displacement of moving `distance` mu along `headingDeg` (screen space, y-down). */
function move(distance: number, headingDeg: number): Displacement {
  const radians = (headingDeg * Math.PI) / 180;
  return { dx: distance * Math.sin(radians), dy: -distance * Math.cos(radians) };
}

/** Wraps a course number into the 1..12 clockface range. */
function wrapCourse(course: number): number {
  return ((course - 1) % COURSES + COURSES) % COURSES + 1;
}

/**
 * Computes the ship's pivot-move-pivot-move path for a plotted order. Returns
 * `legal: false` with a reason (and no path) for an order that breaks the thrust
 * budget, mirroring `applyOrder`.
 */
export function plotMovementPath(
  start: MovementState,
  orderText: string,
  thrust: number
): MovementPath {
  const order = parseOrder(orderText);
  const applied = applyOrder(start, order, thrust);

  const idle: MovementPath = {
    legal: applied.legal,
    reason: applied.reason,
    velocity: applied.velocity,
    course: applied.course,
    midCourse: start.course,
    waypoint: { dx: 0, dy: 0 },
    end: { dx: 0, dy: 0 }
  };

  if (!applied.legal) {
    return idle;
  }

  // Split the turn: half at the start (rounded DOWN), the rest at the mid-point.
  const firstTurn = Math.trunc(Math.abs(order.turn) / 2) * Math.sign(order.turn);
  const midCourse = wrapCourse(start.course + firstTurn);
  const finalCourse = applied.course;

  const half = applied.velocity / 2;
  const first = move(half, courseHeadingDegrees(midCourse));
  const second = move(half, courseHeadingDegrees(finalCourse));

  return {
    legal: true,
    velocity: applied.velocity,
    course: finalCourse,
    midCourse,
    waypoint: { dx: first.dx, dy: first.dy },
    end: { dx: first.dx + second.dx, dy: first.dy + second.dy }
  };
}
