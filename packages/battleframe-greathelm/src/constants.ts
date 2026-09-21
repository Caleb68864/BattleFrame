/**
 * GREATHELM module identity, vocabulary and setting keys.
 *
 * This file used to hold every GREATHELM rules number, read out of
 * `GREATHELM-QSR.pdf` v0.4. It holds none now -- see
 * `docs/rules-content-audit.md`. The numbers live in the world's rules profile
 * (`rules-profile.ts`), which the owner of the rulebook fills in or imports.
 *
 * The repository's own `.gitignore` already scrubbed `vault/` -- the source
 * rulebooks -- from tracking *and history*, on the stated grounds that they were
 * "never redistributable anyway -- copyrighted". That handled the PDFs. The
 * numbers taken out of them stayed here until this change.
 *
 * What remains is the module's vocabulary and identity: the six action ids, the
 * six die faces, the Actor subtype, and the setting keys. Those are the shape of
 * the game this module implements rather than values it asserts -- a profile
 * that could rename them would be a different module, not a configured one.
 */

export const MODULE_ID = "battleframe-greathelm";

export const KNIGHT_ACTOR_TYPE = "knight";

export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

export type ActionId = "sprint" | "encircle" | "bash" | "shift" | "light" | "heavy";

/**
 * The module's own vocabulary, kept when the rules numbers were stripped.
 *
 * The numbers that used to sit beside them -- which face buys which action, how
 * far each moves, what each deals -- are the user's, and live in
 * `rules-profile.ts`.
 */
export const ACTION_IDS: readonly ActionId[] = [
  "sprint",
  "encircle",
  "bash",
  "shift",
  "light",
  "heavy"
];

/** The faces a die offers, as keys for the user's face-to-action mapping. */
export const DIE_FACES: readonly DieFace[] = [1, 2, 3, 4, 5, 6];

/** World setting holding the user's rules profile. See `rules-profile.ts`. */
export const SETTING_RULES_PROFILE = "rulesProfile";

/**
 * World setting: apply the profile's minimum dice-pool floor.
 *
 * Kept as a setting rather than folded into the profile because it is a
 * question about *whether a rule applies*, not what its number is. The number
 * moved to the profile; the toggle stays here, and still defaults OFF so no
 * optional rule is applied to a table that did not ask for it.
 */
export const SETTING_MIN_DICE_POOL_FLOOR_ENABLED = "minDicePoolFloorEnabled";

/*
 * ---------------------------------------------------------------------------
 * UI settings -- NOT GREATHELM rules.
 *
 * The two keys below configure this module's UI: whether it interrupts the
 * round to ask a player something the rulebook says is theirs to decide. Their
 * *defaults* are not rulebook values either -- they are this engine's
 * documented fallback when a prompt is switched off, recorded here so
 * ui/choice-prompts.ts and lang/en.json share one source instead of a magic
 * "first" typed in three places.
 * ---------------------------------------------------------------------------
 */

/** World setting: prompt the initiative winner first-or-second. Default ON. */
export const SETTING_PROMPT_FIRST_OR_SECOND = "promptFirstOrSecond";

/** World setting: prompt the attacker which touching enemy to hit when 2+ qualify. Default ON. */
export const SETTING_PROMPT_ATTACK_TARGET = "promptAttackTarget";

/** Engine fallback for `SETTING_PROMPT_FIRST_OR_SECOND` when that prompt is disabled. */
export const DEFAULT_FIRST_OR_SECOND_CHOICE = "first";

/**
 * Engine fallback for `SETTING_PROMPT_ATTACK_TARGET` when that prompt is
 * disabled: the first touching enemy offered to the prompt, i.e. whichever
 * candidate the caller (round-control.ts nearestEnemy) found first.
 */
export const DEFAULT_ATTACK_TARGET_CHOICE = "first";
