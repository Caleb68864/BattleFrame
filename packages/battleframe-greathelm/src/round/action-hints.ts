import { MODULE_ID, type ActionId } from "../constants";
import { getProfile } from "../rules-profile";

/**
 * One line telling a player what a die actually does, for someone who has
 * never read the rulebook.
 *
 * Every number is **interpolated from the world's rules profile**, never typed
 * into the language file. It used to be interpolated from `constants.ts` for
 * the same reason -- a number duplicated into `lang/en.json` would leave the UI
 * confidently telling the player the old value with nothing failing -- and the
 * argument survives the move: the profile is now the one place a correction
 * lands.
 *
 * A profile that gives an action no numbers yields no placeholders, so the
 * localised string falls back to whatever it reads without them.
 */
function hintValues(action: ActionId): Record<string, number> {
  const effect = getProfile().actions[action] ?? {};
  const values: Record<string, number> = {};

  if (effect.moveInches !== undefined) values.move = effect.moveInches;
  if (effect.momentumGain !== undefined) values.momentum = effect.momentumGain;
  if (effect.damage !== undefined) values.damage = effect.damage;

  return values;
}

type Localizer = (key: string, data?: Record<string, number>) => string;

function resolveLocalizer(): Localizer {
  const globalScope = globalThis as unknown as {
    game?: {
      i18n?: {
        format?: (key: string, data?: Record<string, number>) => string;
        localize?: (key: string) => string;
      };
    };
  };
  const i18n = globalScope.game?.i18n;

  return (key, data) => {
    if (data && typeof i18n?.format === "function") {
      return i18n.format(key, data);
    }

    return i18n?.localize?.(key) ?? key;
  };
}

/**
 * The player-facing description of an action, with the world's own rules
 * numbers filled in (e.g. `Move up to N". Gains M momentum.`).
 *
 * The example is written with placeholders rather than figures on purpose:
 * this module ships no rules numbers, and a worked example in a docstring is
 * still a rules number in the repository.
 */
export function actionHint(action: ActionId, localize?: Localizer): string {
  const resolved = localize ?? resolveLocalizer();

  return resolved(`${MODULE_ID}.actionHint.${action}`, hintValues(action));
}
