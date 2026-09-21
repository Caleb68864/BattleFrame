import { MODULE_ID, SETTING_RULES_PROFILE, type ActionId, type DieFace } from "../../src/constants";
import { BLANK_PROFILE, type RulesProfile } from "../../src/rules-profile";

/**
 * A world that has answered for its own rules numbers.
 *
 * This module ships none, so a test that rolls, moves or wounds has to supply
 * them the same way a user does. That is the point rather than an
 * inconvenience: if this helper defaulted to the rulebook's values, the
 * published table would live here instead of in `constants.ts` and the strip
 * would be cosmetic.
 *
 * {@link TEST_PROFILE} is therefore **deliberately not GREATHELM's table**. The
 * face-to-action mapping is reversed, the distances and damages are different
 * numbers, and the clash set is a different pair. Anything asserting mechanics
 * works against it; anything that only passed because it matched the rulebook
 * fails, which is exactly the signal wanted.
 */

/**
 * An invented profile. Every number differs from the published one, on purpose.
 *
 * Face 1 buys the longest move and 6 the shortest -- the inverse of the shape
 * the rulebook uses -- so a test that quietly depends on "6 is the big one"
 * shows up rather than passing by coincidence.
 */
export const TEST_PROFILE: RulesProfile = {
  dicePoolPerKnightBonus: 2,
  openingDicePoolSize: 9,
  minDicePoolFloor: 4,
  faceToAction: {
    1: "sprint",
    2: "encircle",
    3: "shift",
    4: "bash",
    5: "light",
    6: "heavy"
  },
  clashTestActions: ["light", "heavy"],
  actions: {
    sprint: { moveInches: 7, momentumGain: 3 },
    encircle: { moveInches: 4, momentumGain: 1 },
    shift: { moveInches: 2 },
    bash: { moveInches: 5, stripsDefenderMomentum: true },
    light: { damage: 3 },
    heavy: { damage: 5 }
  }
};

/**
 * A conventional invented ruleset, for tests about the round loop rather than
 * about where the numbers come from.
 *
 * Behavioural tests script exact dice and assert what falls out, so they need a
 * profile whose shape their scripts were written against: high faces buy
 * movement, low faces buy attacks, and the pool is knights plus one. Using
 * {@link TEST_PROFILE} for those would mean re-tuning every dice script to
 * prove something they are not about.
 *
 * It is an invented ruleset like {@link TEST_PROFILE}, and some of its values
 * coincide with published ones. That is not an assertion about any rulebook:
 * the test that actually pins the face-to-action mapping lives in
 * `dice-pool.test.ts` and deliberately runs against {@link TEST_PROFILE}, whose
 * mapping is not GREATHELM's.
 */
export const SCENARIO_PROFILE: RulesProfile = {
  dicePoolPerKnightBonus: 1,
  openingDicePoolSize: 0,
  minDicePoolFloor: 3,
  faceToAction: {
    6: "sprint",
    5: "encircle",
    4: "bash",
    3: "shift",
    2: "light",
    1: "heavy"
  },
  clashTestActions: ["bash", "light", "heavy"],
  actions: {
    sprint: { moveInches: 5, momentumGain: 2 },
    encircle: { moveInches: 3, momentumGain: 1 },
    shift: { moveInches: 1 },
    bash: { moveInches: 3, stripsDefenderMomentum: true },
    light: { damage: 1 },
    heavy: { damage: 2 }
  }
};

interface SettingsStub {
  register: () => void;
  get: (namespace: string, key: string) => unknown;
  set: (namespace: string, key: string, value: unknown) => Promise<unknown>;
}

/**
 * Installs a `game.settings` stub carrying a rules profile for the duration of
 * a test, and returns the teardown.
 *
 * @param profile The world's profile. Omit for {@link TEST_PROFILE}; pass
 *   {@link BLANK_PROFILE} to model a world that has entered nothing.
 */
export function withProfile(profile: RulesProfile = TEST_PROFILE): () => void {
  const globalScope = globalThis as unknown as {
    game?: { settings?: SettingsStub } & Record<string, unknown>;
  };
  const previous = globalScope.game;
  let stored: unknown = profile;

  globalScope.game = {
    ...(previous ?? {}),
    settings: {
      register: () => {},
      get: (namespace: string, key: string) =>
        namespace === MODULE_ID && key === SETTING_RULES_PROFILE ? stored : undefined,
      set: async (namespace: string, key: string, value: unknown) => {
        if (namespace === MODULE_ID && key === SETTING_RULES_PROFILE) {
          stored = value;
        }
        return value;
      }
    }
  };

  return () => {
    globalScope.game = previous;
  };
}

/** A world that has entered no rules numbers at all. */
export function withBlankProfile(): () => void {
  return withProfile(BLANK_PROFILE);
}

/** The action {@link TEST_PROFILE} puts on a face, for tests that need one. */
export function testActionForFace(face: DieFace): ActionId {
  const action = TEST_PROFILE.faceToAction[face];
  if (!action) {
    throw new Error(`TEST_PROFILE maps no action to face ${face}`);
  }
  return action;
}

/** A face that {@link TEST_PROFILE} maps to a clash action. */
export const TEST_CLASH_FACE: DieFace = 5;

/** A face that {@link TEST_PROFILE} maps to a movement action. */
export const TEST_MOVE_FACE: DieFace = 1;

/** Installs {@link SCENARIO_PROFILE}: the conventional ruleset behavioural tests play under. */
export function withScenarioProfile(): () => void {
  return withProfile(SCENARIO_PROFILE);
}
