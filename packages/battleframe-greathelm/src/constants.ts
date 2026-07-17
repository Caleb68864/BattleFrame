/**
 * All GREATHELM numbers live here, and only here. Source is
 * `GREATHELM-QSR.pdf` v0.4 (Malev quickstart rules, pre-1.0, explicitly
 * "introductory") -- see vault/greathelm/version-discrepancies-qsr-vs-kickstarter.md.
 * Every constant below is provisional and may change once the shipped
 * v1.0 rulebook is available. Do not hard-code these values anywhere
 * else in this package.
 */

export const MODULE_ID = "battleframe-greathelm";

export const KNIGHT_ACTOR_TYPE = "knight";

/**
 * Dice pool = knights currently in play + this bonus.
 * Source: vault/greathelm/initiative-dice-pool-size.md ("gain 1 initiative
 * dice for every knight you control in the play area, plus 1").
 */
export const DICE_POOL_PER_KNIGHT_BONUS = 1;

/**
 * Kickstarter-only floor ("to a minimum of 3 dice"), NOT present in QSR
 * v0.4. Confidence: partial -- confirmed only by the designer's Kickstarter
 * campaign copy, not the rulebook itself. Implemented behind the
 * `minDicePoolFloor` world setting, which defaults OFF so the system does
 * not silently apply a house-of-cards rule the QSR never stated.
 * See vault/greathelm/initiative-dice-pool-size.md and
 * vault/greathelm/version-discrepancies-qsr-vs-kickstarter.md.
 */
export const MIN_DICE_POOL_FLOOR = 3;

export const SETTING_MIN_DICE_POOL_FLOOR_ENABLED = "minDicePoolFloorEnabled";

/**
 * Opening pool for a fresh 6-knight warband, per QSR p1 ("Each player
 * starts the game with 7").
 */
export const OPENING_DICE_POOL_SIZE = 7;

export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;

export type ActionId = "sprint" | "encircle" | "bash" | "shift" | "light" | "heavy";

/**
 * The central table: a die's face value hard-selects which action it may
 * buy. Source: vault/greathelm/dice-face-to-action-mapping.md, QSR p1
 * verbatim (p1 names used; p5 reference-card aliases are Run/Walk/Step for
 * Sprint/Encircle/Shift -- the QSR is internally inconsistent about naming,
 * see version-discrepancies note).
 *
 * Face -> action: 6=Sprint, 5=Encircle, 4=Bash, 3=Shift, 2=Light, 1=Heavy.
 */
export const DIE_FACE_TO_ACTION: Readonly<Record<DieFace, ActionId>> = {
  6: "sprint",
  5: "encircle",
  4: "bash",
  3: "shift",
  2: "light",
  1: "heavy",
};

/** Faces 4, 2, and 1 require a clash test; 6, 5, 3 auto-succeed as movement. */
export const CLASH_TEST_ACTIONS: readonly ActionId[] = ["bash", "light", "heavy"];

/** Movement distances, in inches. QSR v0.4 says Sprint = 5" (not 6", per Goonhammer). */
export const SPRINT_MOVE_INCHES = 5;
export const ENCIRCLE_MOVE_INCHES = 3;
export const SHIFT_MOVE_INCHES = 1;
export const BASH_DEFENDER_MOVE_INCHES = 3;

/** Momentum gained by movement actions. Cap is out of scope for SS-10 (see actions.ts). */
export const SPRINT_MOMENTUM_GAIN = 2;
export const ENCIRCLE_MOMENTUM_GAIN = 1;

/** Damage dealt by successful melee clash tests. */
export const LIGHT_ATTACK_DAMAGE = 1;
export const HEAVY_ATTACK_DAMAGE = 2;

/*
 * ---------------------------------------------------------------------------
 * Module settings -- NOT GREATHELM rules.
 *
 * The two keys below configure this module's UI (whether it interrupts the
 * round to ask a player something QSR p1 says is theirs to decide). Their
 * *defaults* are not rulebook numbers either -- they are this engine's
 * documented fallback when a prompt is switched off, recorded here only so
 * ui/choice-prompts.ts and lang/en.json have one shared source instead of a
 * magic "first" typed in three places. Keep them out of the section above:
 * that section's contract is QSR-sourced numbers only.
 * ---------------------------------------------------------------------------
 */

/** World setting: prompt the initiative winner first-or-second (QSR p1 "choose"). Default ON. */
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
