import {
  BASH_DEFENDER_MOVE_INCHES,
  ENCIRCLE_MOMENTUM_GAIN,
  ENCIRCLE_MOVE_INCHES,
  HEAVY_ATTACK_DAMAGE,
  LIGHT_ATTACK_DAMAGE,
  MODULE_ID,
  SHIFT_MOVE_INCHES,
  SPRINT_MOMENTUM_GAIN,
  SPRINT_MOVE_INCHES,
  type ActionId
} from "../constants";

/**
 * One line telling a player what a die actually does, for someone who has
 * never read the rulebook.
 *
 * Every number is **interpolated from `constants.ts`**, never typed into the
 * language file. The QSR is v0.4 and pre-1.0 -- Sprint is already 5" here and
 * 6" in Goonhammer's write-up -- so a rules correction is a one-line change in
 * constants.ts. If the numbers were duplicated in `lang/en.json`, that
 * correction would leave the UI confidently telling the player the old value,
 * with nothing failing. The placeholders make that drift impossible.
 */
const HINT_VALUES: Readonly<Record<ActionId, Readonly<Record<string, number>>>> = {
  sprint: { move: SPRINT_MOVE_INCHES, momentum: SPRINT_MOMENTUM_GAIN },
  encircle: { move: ENCIRCLE_MOVE_INCHES, momentum: ENCIRCLE_MOMENTUM_GAIN },
  bash: { move: BASH_DEFENDER_MOVE_INCHES },
  shift: { move: SHIFT_MOVE_INCHES },
  light: { damage: LIGHT_ATTACK_DAMAGE },
  heavy: { damage: HEAVY_ATTACK_DAMAGE }
};

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
 * The player-facing description of an action, with its rules numbers filled in
 * (e.g. `Move up to 5". Gains 2 momentum.`).
 */
export function actionHint(action: ActionId, localize?: Localizer): string {
  const resolved = localize ?? resolveLocalizer();

  return resolved(`${MODULE_ID}.actionHint.${action}`, HINT_VALUES[action]);
}
