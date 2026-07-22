/**
 * Cinematic movement orders: parsing the shorthand a player writes (`+4,P2`),
 * checking it against the ship's thrust budget, and computing the resulting
 * velocity and course. Pure -- the token move/rotate on the canvas is the
 * orchestrator's job.
 *
 * Notation: `+N`/`-N` accelerate/decelerate N mu; `PN`/`SN` turn N course points
 * to Port (anticlockwise, -) / Starboard (clockwise, +). 1 TP = 1 mu OR 1 course
 * point. Total TP spent <= thrust; turning TP <= half thrust (FT2 rounds UP),
 * and turning thrust cannot also accelerate. Ships never move backwards.
 *
 * DEFERRED: `applyOrder` computes only the FINAL velocity and heading. The
 * cinematic "half the turn at the start of the move, half at the mid-point"
 * pivot-move-pivot-move path (Making Course Changes) affects the ship's final
 * *position*, not just its heading -- that displacement is currently executed by
 * dragging the token manually; only the heading is auto-applied (token rotated
 * to the new course). Auto-tracing the curved path on the canvas is a follow-up.
 *
 * Sources: FT2 "Movement Orders", "Thrust Points", "Making Course Changes",
 * "Course & the Clockface".
 */

import { COURSES } from "../constants";

export interface MovementOrder {
  /** Velocity change in mu: positive accelerates, negative decelerates. */
  accel: number;
  /** Course change in points: positive = starboard (clockwise), negative = port. */
  turn: number;
}

export interface MovementState {
  velocity: number;
  course: number;
}

export interface ApplyOrderResult extends MovementState {
  legal: boolean;
  reason?: "reverse" | "turn-cap" | "thrust-budget";
}

/** The maximum course points a ship of `thrust` may turn (half, rounded up). */
export function turningCap(thrust: number): number {
  return Math.ceil(thrust / 2);
}

/**
 * Parses a movement order string into accel + turn. Accepts the tokens in any
 * order, tolerates spaces and commas, and treats an empty string as no change.
 * Unknown tokens are ignored.
 */
export function parseOrder(text: string): MovementOrder {
  let accel = 0;
  let turn = 0;

  // Coerce defensively: the exported parser may be handed a nullish value.
  const tokens = String(text ?? "").toUpperCase().match(/[+-]\d+|[PS]\d+/g) ?? [];
  for (const token of tokens) {
    const value = parseInt(token.slice(1), 10);
    switch (token[0]) {
      case "+":
        accel += value;
        break;
      case "-":
        accel -= value;
        break;
      case "P":
        turn -= value;
        break;
      case "S":
        turn += value;
        break;
    }
  }

  return { accel, turn };
}

/** Wraps a course number into the 1..12 clockface range. */
function wrapCourse(course: number): number {
  return ((course - 1) % COURSES + COURSES) % COURSES + 1;
}

/**
 * Applies a movement order to a ship's state against its thrust budget. Returns
 * the resulting velocity/course and whether the order was legal (with a reason
 * when not). An illegal order still reports the *would-be* state so a caller can
 * surface it, but should not commit it.
 */
export function applyOrder(
  state: MovementState,
  order: MovementOrder,
  thrust: number
): ApplyOrderResult {
  const turnTP = Math.abs(order.turn);
  const accelTP = Math.abs(order.accel);
  const newVelocity = state.velocity + order.accel;
  const newCourse = wrapCourse(state.course + order.turn);

  const base = { velocity: Math.max(0, newVelocity), course: newCourse };

  if (newVelocity < 0) {
    return { ...base, legal: false, reason: "reverse" };
  }
  if (turnTP > turningCap(thrust)) {
    return { ...base, legal: false, reason: "turn-cap" };
  }
  if (accelTP + turnTP > thrust) {
    return { ...base, legal: false, reason: "thrust-budget" };
  }

  return { ...base, legal: true };
}
