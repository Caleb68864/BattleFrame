import {
  ActionId,
  BASH_DEFENDER_MOVE_INCHES,
  CLASH_TEST_ACTIONS,
  DieFace,
  DIE_FACE_TO_ACTION,
  ENCIRCLE_MOMENTUM_GAIN,
  ENCIRCLE_MOVE_INCHES,
  HEAVY_ATTACK_DAMAGE,
  LIGHT_ATTACK_DAMAGE,
  SHIFT_MOVE_INCHES,
  SPRINT_MOMENTUM_GAIN,
  SPRINT_MOVE_INCHES,
} from "../constants";

/** Resolves the action a given die face buys. See constants.ts DIE_FACE_TO_ACTION. */
export function actionForFace(face: DieFace): ActionId {
  return DIE_FACE_TO_ACTION[face];
}

/** Faces 4, 2, 1 require base contact and a clash-test roll-off; 6, 5, 3 always succeed. */
export function requiresClashTest(action: ActionId): boolean {
  return CLASH_TEST_ACTIONS.includes(action);
}

export interface ActionEffect {
  action: ActionId;
  moveInches?: number;
  momentumGain?: number;
  damage?: number;
  /** Bash strips all momentum from the defender and repositions them. */
  stripsDefenderMomentum?: boolean;
}

/**
 * Describes each action's effect purely in terms of its own die -- clash
 * resolution and defender interaction for Bash/Light/Heavy is out of scope
 * for SS-10 (see SS-11: round loop, clash resolution). Here we only encode
 * what each face intrinsically buys.
 */
export function describeAction(action: ActionId): ActionEffect {
  switch (action) {
    case "sprint":
      return { action, moveInches: SPRINT_MOVE_INCHES, momentumGain: SPRINT_MOMENTUM_GAIN };
    case "encircle":
      return { action, moveInches: ENCIRCLE_MOVE_INCHES, momentumGain: ENCIRCLE_MOMENTUM_GAIN };
    case "shift":
      return { action, moveInches: SHIFT_MOVE_INCHES };
    case "bash":
      return { action, moveInches: BASH_DEFENDER_MOVE_INCHES, stripsDefenderMomentum: true };
    case "light":
      return { action, damage: LIGHT_ATTACK_DAMAGE };
    case "heavy":
      return { action, damage: HEAVY_ATTACK_DAMAGE };
    default:
      throw new Error(`Unknown GREATHELM action: ${action satisfies never}`);
  }
}
