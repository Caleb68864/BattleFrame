/**
 * Independent-missile move EXECUTION: the move-pivot-move path a one-shot
 * More Thrust missile traces in its dedicated missile phase. It launches forward
 * along the firing ship's course and may run up to 18mu, taking ONE 2-point (60°)
 * course change at the MID-POINT of its move -- so, unlike a ship (whose turn is
 * split half-at-start / half-at-mid by `plotMovementPath`), the whole turn lands
 * at the mid-point: half the distance straight ahead, pivot, half on the new
 * course.
 *
 * Output displacements are in scene distance units (mu), from the launch point,
 * in screen space: x right, y DOWN, so course 12 ("up") is -y. A course N faces
 * (N mod 12) x 30 degrees clockwise from up. Pure -- the mu->pixel conversion and
 * the token move/rotate live in the (deferred) orchestrator.
 *
 * Sources: More Thrust "Missiles (Basic)" (18mu, one mid-point 2-point turn);
 * FT2 "Course & the Clockface".
 */
import { requireRules } from "../rules-profile";

export interface Displacement {
  dx: number;
  dy: number;
}

export interface MissileState {
  /** The missile's current heading (course 1-12). */
  course: number;
}

export interface MissilePath {
  legal: boolean;
  reason?: "turn-cap" | "over-range";
  /** Distance moved this turn (mu). */
  distance: number;
  /** Final heading (course 1-12), after the mid-point turn. */
  course: number;
  /** Heading during the first half of the move (== the launch course). */
  midCourse: number;
  /** Displacement to the mid-point (after the first half-move, before the turn). */
  waypoint: Displacement;
  /** Total displacement to the missile's final position. */
  end: Displacement;
}

/** The heading of a course as an angle in degrees, clockwise from up. */
function courseHeadingDegrees(course: number): number {
  return (course % requireRules().courses) * requireRules().coursePointDegrees;
}

/** Displacement of moving `distance` mu along `headingDeg` (screen space, y-down). */
function move(distance: number, headingDeg: number): Displacement {
  const radians = (headingDeg * Math.PI) / 180;
  return { dx: distance * Math.sin(radians), dy: -distance * Math.cos(radians) };
}

/** Wraps a course number into the 1..12 clockface range. */
function wrapCourse(course: number): number {
  return ((course - 1) % requireRules().courses + requireRules().courses) % requireRules().courses + 1;
}

/**
 * Plots a missile's move-pivot-move path: up to `distance` mu (<= 18) with a
 * single `turn` course-point change (|turn| <= 2, + starboard / - port) taken at
 * the mid-point. Returns `legal: false` with a reason (and no path) when the turn
 * exceeds one 2-point change or the distance exceeds the missile's move.
 */
export function plotMissilePath(
  start: MissileState,
  distance: number,
  turn: number
): MissilePath {
  const idle: MissilePath = {
    legal: true,
    distance,
    course: start.course,
    midCourse: start.course,
    waypoint: { dx: 0, dy: 0 },
    end: { dx: 0, dy: 0 }
  };

  if (Math.abs(turn) > requireRules().missileTurnPoints) {
    return { ...idle, legal: false, reason: "turn-cap" };
  }
  if (!Number.isFinite(distance) || distance < 0 || distance > requireRules().missileMoveMu) {
    return { ...idle, legal: false, reason: "over-range" };
  }

  const finalCourse = wrapCourse(start.course + turn);
  const half = distance / 2;
  // First half on the launch course, then pivot and run the rest on the new one.
  const first = move(half, courseHeadingDegrees(start.course));
  const second = move(half, courseHeadingDegrees(finalCourse));

  return {
    legal: true,
    distance,
    course: finalCourse,
    midCourse: start.course,
    waypoint: { dx: first.dx, dy: first.dy },
    end: { dx: first.dx + second.dx, dy: first.dy + second.dy }
  };
}
