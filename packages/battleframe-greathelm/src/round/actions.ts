import { ActionId, DieFace } from "../constants";
import { getProfile, requireProfile, type RulesProfile } from "../rules-profile";

/**
 * What a die face buys, and what the action it buys does.
 *
 * Every number these functions used to return was a constant read out of the
 * rulebook. They now come from the world's rules profile, which the owner of
 * that rulebook fills in (`rules-profile.ts`, and
 * `docs/rules-content-audit.md` for why).
 *
 * The functions read the profile rather than taking it as a parameter. That is
 * the shape the sibling InCountry module settled on, and it is what keeps this
 * change from threading an argument through six files of UI and session code
 * that have no other interest in it. Tests install a world with `withProfile`.
 */

/**
 * The action a die face buys, or `undefined` where the profile maps that face
 * to nothing.
 *
 * Returning `undefined` rather than throwing is deliberate: this is called from
 * render paths (the pool panel, the highlight layer), and a face nobody has
 * mapped is an incomplete profile rather than a broken one. A hard failure here
 * would blank the UI that is supposed to show the user what still needs filling
 * in.
 */
export function actionForFace(face: DieFace): ActionId | undefined {
  return getProfile().faceToAction[face];
}

/**
 * Whether an action needs a clash test rather than succeeding outright.
 *
 * `undefined` reads as false: an unmapped face buys no action, and no action
 * needs no test.
 */
export function requiresClashTest(action: ActionId | undefined): boolean {
  if (action === undefined) {
    return false;
  }
  return getProfile().clashTestActions.includes(action);
}

export interface ActionEffect {
  action: ActionId;
  moveInches?: number;
  momentumGain?: number;
  damage?: number;
  /** Strips all momentum from the defender and repositions them. */
  stripsDefenderMomentum?: boolean;
}

/**
 * What an action does, from the profile.
 *
 * This one requires a profile rather than tolerating a blank, because it is on
 * the path that actually moves a knight and deals damage. Returning an empty
 * effect would let a world with no numbers play a silent game where nothing
 * moves and nothing lands, which is worse than being told the profile is empty.
 *
 * @throws {RulesProfileNotSetError} When the world has entered no profile.
 */
export function describeAction(action: ActionId): ActionEffect {
  const profile: RulesProfile = requireProfile();
  const effect = profile.actions[action] ?? {};

  return {
    action,
    ...(effect.moveInches !== undefined ? { moveInches: effect.moveInches } : {}),
    ...(effect.momentumGain !== undefined ? { momentumGain: effect.momentumGain } : {}),
    ...(effect.damage !== undefined ? { damage: effect.damage } : {}),
    ...(effect.stripsDefenderMomentum !== undefined
      ? { stripsDefenderMomentum: effect.stripsDefenderMomentum }
      : {})
  };
}

/** The damage an action deals, or zero where the profile gives it none. */
export function damageForAction(action: ActionId): number {
  return requireProfile().actions[action]?.damage ?? 0;
}
