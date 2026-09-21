/**
 * Full Thrust module identity, vocabulary and flag keys.
 *
 * This file used to hold every Full Thrust rules number -- 147 constants
 * covering the universal per-die damage table, the FT2 threshold ladder, the
 * pulse-torpedo and K-gun to-hit tables by range band, every weapon range, the
 * ship-design caps, and the Nova Cannon's MASS and points cost -- along with
 * runs of the rulebook quoted verbatim in the comments. It holds none of that
 * now; see `docs/rules-content-audit.md`.
 *
 * The numbers live in the world's rules profile (`rules-profile.ts`), which the
 * owner of the rulebook fills in or imports. Twenty-six of them turned out to
 * have no caller at all -- every points and MASS value among them -- and were
 * simply deleted.
 *
 * What remains is identity and vocabulary: the module id, the Actor subtypes,
 * the document flag keys, and the three closed sets this module's types are
 * built from (fire arcs, weapon kinds, hull grades). Those are the shape of the
 * game this module implements rather than values it asserts -- a profile that
 * could rename them would be a different module, not a configured one -- and the
 * flag keys are Foundry storage addresses no rulebook has an opinion about.
 */

export const MODULE_ID = "battleframe-full-thrust";

/** World setting holding the user's rules profile. See `rules-profile.ts`. */
export const SETTING_RULES_PROFILE = "rulesProfile";

// --- Actor subtypes ---------------------------------------------------------

export const SHIP_ACTOR_TYPE = "ship";
export const FIGHTER_GROUP_ACTOR_TYPE = "fighter-group";

// --- Document flags ---------------------------------------------------------

/**
 * Actor flag holding a ship's secretly-plotted movement order (the `+4,P2`
 * text) during the Order Plotting phase. Stored on the actor so only its owner
 * and the GM can read it -- an opponent with no permission never receives it,
 * which is what keeps plotting hidden until maneuvers are executed.
 */
export const PLOTTED_ORDER_FLAG = "plottedOrder";

/**
 * Document flag holding the weapons-fire phase state (initiative winner, which
 * ships have fired, whose turn). Stored on a Document (the active Combat, else
 * the Scene) so it survives reload and syncs, per the project's turn-state rule.
 */
export const FIRE_PHASE_FLAG = "firePhase";

/**
 * Scene flag holding the list of active independent missiles (position, course,
 * life, warhead, owning side). Missiles are fire-and-forget craft advanced in
 * their own phase; storing them on the Scene keeps the board state persistent +
 * synced (per the project's turn-state rule) without a per-missile Actor.
 */
export const ACTIVE_MISSILES_FLAG = "activeMissiles";

/**
 * Actor flag marking a ship "done / held" for the current phase, set by the
 * Hold/Done token-HUD button. A held ship is excluded from the premature-ready
 * guard's pending list (the player has deliberately chosen to skip it), and the
 * flag clears on every phase transition. This is a per-ship, per-turn INTENT
 * (not a battlefield condition like defeated/suppressed), so it stays a plain
 * owner/GM-readable actor flag rather than a CONFIG.statusEffects entry.
 */
export const HELD_FLAG = "held";

/** Actor flag holding a ship's accumulated Wave Gun charge. */
export const WAVE_GUN_CHARGE_FLAG = "waveGunCharge";

/** Actor flag: how many fighter groups a carrier currently has deployed (vs its bays). */
export const LAUNCHED_GROUPS_FLAG = "launchedGroups";

// --- Vocabulary -------------------------------------------------------------

/**
 * The fire arcs, named clockwise from dead ahead.
 *
 * Names, not numbers: how many degrees each spans is the world's
 * (`arcDegrees`), but the set of arcs and their order is the geometry this
 * module draws and tests against.
 */
export const FIRE_ARCS = ["F", "FS", "AS", "A", "AP", "FP"] as const;
export type FireArc = (typeof FIRE_ARCS)[number];

/** The weapon kinds this module implements mechanics for. */
export const WEAPON_KINDS = [
  "beam",
  "torpedo",
  "needle",
  "submunition",
  "salvo",
  "kgun"
] as const;
export type WeaponKind = (typeof WEAPON_KINDS)[number];

/**
 * The hull-integrity grade names, weakest to toughest.
 *
 * What percentage of MASS each grade costs is the world's
 * (`variableHullGradePercent`); the set of grades is the shape of the system.
 * `HullGrade` used to be derived as `keyof typeof VARIABLE_HULL_GRADE_PERCENT`,
 * which stopped being possible once the percentages became a value the user
 * supplies at runtime.
 */
export const HULL_GRADES = ["fragile", "weak", "average", "strong", "super"] as const;
export type HullGrade = (typeof HULL_GRADES)[number];
