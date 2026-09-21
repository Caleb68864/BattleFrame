/**
 * Vector movement: the optional, physics-accurate FT2 / Fleet Book alternative to
 * the cinematic system in `./path`. A ship's motion is a PERSISTENT velocity
 * vector: each turn the ship first advances by its current velocity (facing
 * unchanged), then thrust NUDGES the vector. Because the vector persists and
 * thrust only bends it, a ship's FACING and its COURSE (the direction it is
 * actually moving) can differ -- the defining contrast with cinematic play, where
 * they are always the same.
 *
 * Vectors are `{vx, vy}` in scene distance units (mu), screen space: x right, y
 * DOWN, so "up" / course 12 is -y -- the same convention as `./path`. A course N
 * faces (N mod 12) x 30 degrees clockwise from up. Everything here is pure vector
 * geometry; the canvas glue (a Vector-mode scene tool that reads a marker,
 * advances the token, and rotates it) is OUT OF SCOPE and DEFERRED to an
 * orchestrator, exactly as `./path` leaves the token move to `ui/round-control`.
 *
 * Two thrust systems act on the vector:
 *  - the MAIN DRIVE (rating = the ship's Thrust) burns along the ship's FACING;
 *  - MANOEUVRING THRUSTERS (rating = half the main drive, rounded DOWN) either
 *    ROTATE the facing (1 point for any heading, course/velocity untouched) or
 *    PUSH the vector sideways/backwards (1 point = 1 mu, facing untouched).
 * Thruster spend is ON TOP of full main-drive thrust, and manoeuvres apply in the
 * exact written order (`TP2, MD6` differs from `MD6, TP2`).
 *
 * SIMPLIFICATION: on the tabletop the new velocity is re-measured with a ruler and
 * rounded to the nearest mu each turn, then the marker is realigned. Here the
 * velocity vector is kept EXACTLY (a VTT has no ruler-reading error); `velocityMagnitude`
 * / `nearestCourse` expose the rounded speed + marker course for display only.
 *
 * Sources: FT2 "Vector Movement" (optional); Fleet Book 1 "Vector Movement System"
 * + "Manoeuvring Thrusters"; "Thrust Points"; "Course & the Clockface".
 */
import { requireRules } from "../rules-profile";

/** A 2D vector in mu, screen space (x right, y DOWN). Used for position and velocity. */
export interface Vector {
  vx: number;
  vy: number;
}

/** A ship's full vector-movement state: where it is, how it's moving, where it points. */
export interface VectorMovementState {
  /** Position in mu (screen space), typically a displacement from the ship's origin. */
  position: Vector;
  /** Persistent velocity vector in mu/turn. */
  velocity: Vector;
  /** Facing as a course 1-12 (the direction the hull points; may differ from course of motion). */
  facing: number;
}

/** Push direction relative to facing: Port (left), Starboard (right), Reverse (retros). */
export type PushDirection = "P" | "S" | "R";

/**
 * A single ordered manoeuvre. `main-drive` burns `points` mu along facing;
 * `rotate` turns facing `points` course points (starboard +, port -) for a flat 1
 * thruster point; `push` shifts the vector `points` mu in `direction` at 1
 * thruster point per mu.
 */
export type Manoeuvre =
  | { kind: "main-drive"; points: number }
  | { kind: "rotate"; points: number }
  | { kind: "push"; direction: PushDirection; points: number };

/** Manoeuvre budget check result; `reason` names the first rule broken. */
export interface ManoeuvreCheck {
  legal: boolean;
  reason?:
    | "main-drive-budget"
    | "manoeuvre-budget"
    | "too-many-rotations"
    | "too-many-pushes";
}

/** Push offsets, in course points, from facing: port is -3 (anticlockwise 90deg), etc. */
const PUSH_OFFSET: Record<PushDirection, number> = { P: -3, S: 3, R: 6 };

/**
 * A vector of length `magnitude` along the heading of `course` (screen space,
 * y-down): {sin, -cos}, matching `./path`'s `move`. Trig is periodic, so any
 * integer course works without wrapping (course 0 == 12, 15 == 3).
 */
export function headingVector(course: number, magnitude = 1): Vector {
  const radians = ((course % requireRules().courses) * requireRules().coursePointDegrees * Math.PI) / 180;
  return { vx: magnitude * Math.sin(radians), vy: -magnitude * Math.cos(radians) };
}

/** Wraps a course number into the 1..12 clockface range. */
function wrapCourse(course: number): number {
  return ((course - 1) % requireRules().courses + requireRules().courses) % requireRules().courses + 1;
}

/**
 * The turn's first step: advance the ship's position by its current velocity,
 * leaving velocity and facing untouched. This is the "carried by the vector" move
 * that happens BEFORE any thrust is applied.
 */
export function advance(state: VectorMovementState): VectorMovementState {
  return {
    ...state,
    position: {
      vx: state.position.vx + state.velocity.vx,
      vy: state.position.vy + state.velocity.vy
    }
  };
}

/** Burns the main drive: adds `points` mu of velocity along the ship's FACING. */
export function applyMainDrive(state: VectorMovementState, points: number): VectorMovementState {
  const dv = headingVector(state.facing, points);
  return {
    ...state,
    velocity: { vx: state.velocity.vx + dv.vx, vy: state.velocity.vy + dv.vy }
  };
}

/**
 * Fires a manoeuvring thruster PUSH: shifts the velocity `points` mu Port/Starboard/
 * Reverse relative to facing (1 point = 1 mu). Changes course/velocity only, never
 * facing.
 */
export function applyPush(
  state: VectorMovementState,
  direction: PushDirection,
  points: number
): VectorMovementState {
  const dv = headingVector(state.facing + PUSH_OFFSET[direction], points);
  return {
    ...state,
    velocity: { vx: state.velocity.vx + dv.vx, vy: state.velocity.vy + dv.vy }
  };
}

/**
 * Rotates a facing by `points` course points (starboard +, port -), wrapping to
 * 1..12. Under vector movement rotation changes FACING ONLY -- the velocity vector
 * is unaffected -- so this returns just the new facing.
 */
export function rotateFacing(facing: number, points: number): number {
  return wrapCourse(facing + points);
}

/** Manoeuvring-thruster rating: half the main-drive thrust, rounded DOWN. */
export function manoeuvringThrusters(thrust: number): number {
  return Math.floor(thrust / requireRules().manoeuvringThrusterDivisor);
}

/**
 * Parses vector-movement shorthand into ordered manoeuvres. Tokens (any order,
 * spaces/commas tolerated): `MDn` main drive n mu; `TPn`/`TSn` rotate n points to
 * Port/Starboard; `PPn`/`PSn`/`PRn` push n mu Port/Starboard/Reverse. Unknown
 * tokens are ignored; an empty string yields no manoeuvres. Written order is
 * preserved -- it is load-bearing for vector movement.
 */
export function parseVectorOrder(text: string): Manoeuvre[] {
  const tokens = String(text ?? "").toUpperCase().match(/MD\d+|T[PS]\d+|P[PSR]\d+/g) ?? [];
  const manoeuvres: Manoeuvre[] = [];
  for (const token of tokens) {
    const value = parseInt(token.slice(2), 10);
    if (token.startsWith("MD")) {
      manoeuvres.push({ kind: "main-drive", points: value });
    } else if (token.startsWith("TP")) {
      manoeuvres.push({ kind: "rotate", points: -value });
    } else if (token.startsWith("TS")) {
      manoeuvres.push({ kind: "rotate", points: value });
    } else {
      // PP / PS / PR
      manoeuvres.push({ kind: "push", direction: token[1] as PushDirection, points: value });
    }
  }
  return manoeuvres;
}

/**
 * Checks a manoeuvre list against a ship's thrust. Main-drive mu must total <=
 * thrust; thruster spend (each rotation costs a flat 1 regardless of how far it
 * turns, each push costs its mu) must total <= half thrust (rounded down); and at
 * most one rotation and one push are allowed per turn. Returns the first rule
 * broken as `reason`.
 */
export function checkManoeuvres(manoeuvres: Manoeuvre[], thrust: number): ManoeuvreCheck {
  let mainDrive = 0;
  let thrusterSpend = 0;
  let rotations = 0;
  let pushes = 0;

  for (const m of manoeuvres) {
    switch (m.kind) {
      case "main-drive":
        mainDrive += Math.abs(m.points);
        break;
      case "rotate":
        rotations += 1;
        thrusterSpend += requireRules().rotationThrusterCost; // 1 point for any heading change
        break;
      case "push":
        pushes += 1;
        thrusterSpend += Math.abs(m.points) * requireRules().pushMuPerPoint;
        break;
    }
  }

  if (rotations > 1) return { legal: false, reason: "too-many-rotations" };
  if (pushes > 1) return { legal: false, reason: "too-many-pushes" };
  if (mainDrive > thrust) return { legal: false, reason: "main-drive-budget" };
  if (thrusterSpend > manoeuvringThrusters(thrust)) {
    return { legal: false, reason: "manoeuvre-budget" };
  }
  return { legal: true };
}

/** Applies a single manoeuvre to a state (dispatch over the union). */
export function applyManoeuvre(state: VectorMovementState, m: Manoeuvre): VectorMovementState {
  switch (m.kind) {
    case "main-drive":
      return applyMainDrive(state, m.points);
    case "rotate":
      return { ...state, facing: rotateFacing(state.facing, m.points) };
    case "push":
      return applyPush(state, m.direction, m.points);
  }
}

/**
 * Resolves a full vector-movement turn: advance the position by the current
 * velocity FIRST, then fold the manoeuvres in written order (which is why order
 * matters). Does NOT itself enforce the thrust budget -- run `checkManoeuvres`
 * first if you need legality.
 */
export function resolveTurn(
  state: VectorMovementState,
  manoeuvres: Manoeuvre[]
): VectorMovementState {
  let next = advance(state);
  for (const m of manoeuvres) {
    next = applyManoeuvre(next, m);
  }
  return next;
}

/** The straight-line speed (mu) of a velocity vector -- the tabletop "new velocity". */
export function velocityMagnitude(velocity: Vector): number {
  return Math.hypot(velocity.vx, velocity.vy);
}

/**
 * The nearest clockface course (1-12) a velocity vector points along -- the
 * direction the ship's course MARKER is realigned to. A zero vector has no
 * direction; we default it to course 12 (up).
 */
export function nearestCourse(velocity: Vector): number {
  if (velocity.vx === 0 && velocity.vy === 0) return 12;
  // Angle clockwise from up: heading vector is {sin, -cos}, so angle = atan2(vx, -vy).
  const degrees = (Math.atan2(velocity.vx, -velocity.vy) * 180) / Math.PI;
  const point = Math.round(degrees / requireRules().coursePointDegrees);
  return wrapCourse(point === 0 ? requireRules().courses : point);
}
