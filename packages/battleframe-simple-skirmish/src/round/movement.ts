import { MOVE_SPEED_INCHES, type MoveSpeed } from "../constants";

/**
 * Movement distance in inches (QSR "Moving & Measuring").
 *
 * Base speed is the unit's move value (3/6/9 = shambling/standard/fast).
 * Terrain/obstacles reduce speed to half; vertical movement (up/down hill or a
 * building level) is also at half-speed. The QSR states each as an independent
 * "half", and does not say whether they stack, so the literal reading is taken:
 * each condition halves independently, so terrain *and* vertical is a quarter.
 * Flagged for the full rulebook -- do not present the stack as settled.
 *
 * Movement is never auto-applied to a token (there is no collision engine); this
 * reports the allowance, and the GM moves the model, the same as GREATHELM.
 */
export interface MovementConditions {
  throughTerrain?: boolean;
  vertical?: boolean;
}

export function effectiveMoveInches(baseInches: number, conditions: MovementConditions = {}): number {
  let inches = Math.max(0, baseInches);

  if (conditions.throughTerrain) {
    inches /= 2;
  }

  if (conditions.vertical) {
    inches /= 2;
  }

  return inches;
}

/** The inch allowance for a named move speed, before any terrain/vertical halving. */
export function moveSpeedInches(speed: MoveSpeed): number {
  return MOVE_SPEED_INCHES[speed];
}
