/**
 * Full Thrust rules numbers, sourced from the user's distilled Full Thrust rules
 * notes (their own writing) covering Full Thrust 2nd Edition + Full Thrust Light,
 * by Jon Tuffley / Ground Zero Games. Every rules number the module uses lives
 * here, so a rules correction is a one-line edit and never a value duplicated
 * into a language file or a view. VTT artefacts (pixel tolerances, etc.) do NOT
 * belong here -- this file's contract is "Full Thrust numbers only".
 *
 * Edition baseline: FT2 core (a superset of FTL). Where FTL and FT2 disagree we
 * take FT2 -- notably the threshold check rolls HIGH (see THRESHOLD_KILL_ON).
 */

export const MODULE_ID = "battleframe-full-thrust";

/** This ruleset's Actor subtypes, namespaced by module id as Foundry requires. */
export const SHIP_ACTOR_TYPE = "ship";
export const FIGHTER_GROUP_ACTOR_TYPE = "fighter-group";

/**
 * Actor flag holding a ship's secretly-plotted movement order (the `+4,P2`
 * text) during the Order Plotting phase. Stored on the actor so only its owner
 * and the GM can read it -- an opponent with no permission never receives it,
 * which is what keeps plotting hidden until maneuvers are executed.
 */
export const PLOTTED_ORDER_FLAG = "plottedOrder";

/** The die every Full Thrust roll uses. */
export const DIE_SIZE = 6;

// --- Measurement & movement -------------------------------------------------

/**
 * A beam range band is 12 mu wide; a Class-N beam rolls N dice in the first band
 * and one die fewer per further band, so its reach is N x 12 mu.
 */
export const BEAM_RANGE_BAND_MU = 12;

/** The 6 fire arcs, 60 degrees each, named clockwise from dead ahead. */
export const ARC_DEGREES = 60;
export const FIRE_ARCS = ["F", "FS", "AS", "A", "AP", "FP"] as const;
export type FireArc = (typeof FIRE_ARCS)[number];

/** A course point / turn step is 30 degrees (12 courses around the clock). */
export const COURSE_POINT_DEGREES = 30;
export const COURSES = 12;

/** Max thrust rating any ship may have (FT2 ship-design cap). */
export const MAX_THRUST = 8;

// --- Beam / per-die damage table --------------------------------------------

/**
 * The universal Full Thrust per-die result table (beams, fighters, submunitions).
 * Unscreened: 1-3 miss, 4-5 = 1 damage, 6 = 2 damage.
 */
export const DIE_MISS_MAX = 3;
export const DIE_ONE_DAMAGE_MIN = 4;
export const DIE_ONE_DAMAGE_MAX = 5;
export const DIE_TWO_DAMAGE = 6;

// --- Weapon kinds -----------------------------------------------------------

export const WEAPON_KINDS = [
  "beam",
  "torpedo",
  "needle",
  "submunition"
] as const;
export type WeaponKind = (typeof WEAPON_KINDS)[number];

// --- Pulse torpedoes --------------------------------------------------------

/** Pulse torpedo maximum range (mu) and per-band to-hit numbers. */
export const TORPEDO_MAX_RANGE_MU = 30;
export const TORPEDO_BAND_MU = 6;
/**
 * To-hit target number by 6mu band, index 0 = 0-6mu. 2+, 3+, 4+, 5+, 6.
 */
export const TORPEDO_TO_HIT_BY_BAND = [2, 3, 4, 5, 6] as const;

// --- Needle beams -----------------------------------------------------------

/** Needle beam max range (mu, FT2) and the roll that knocks out the target system. */
export const NEEDLE_MAX_RANGE_MU = 9;
export const NEEDLE_KILL_ON = 6;

// --- Submunition packs ------------------------------------------------------

/** Submunition pack max range and dice-per-band (index 0 = 0-6mu). Ignores screens. */
export const SUBMUNITION_MAX_RANGE_MU = 18;
export const SUBMUNITION_BAND_MU = 6;
export const SUBMUNITION_DICE_BY_BAND = [3, 2, 1] as const;

// --- Screens ----------------------------------------------------------------

/** Screen level range: 0 (none) to 3 (max, FT2). */
export const MAX_SCREEN_LEVEL = 3;

// --- Threshold check --------------------------------------------------------

/**
 * FT2 threshold check rolls HIGH: a surviving system is knocked out on a roll of
 * this-or-higher, indexed by threshold number (1st row = index 0). 1st: 6,
 * 2nd: 5-6, 3rd: 4-6. Passing multiple thresholds in one attack rolls only the
 * worst reached, minus 1 to the kill number per extra threshold passed.
 */
export const THRESHOLD_KILL_ON = [6, 5, 4] as const;

// --- Point defence ----------------------------------------------------------

/** PDS/anti-fighter range (mu). */
export const PDS_RANGE_MU = 6;
/** PDS vs fighters: 4-5 = 1 kill, 6 = 2 kills (same as the beam table). */
export const PDS_FIGHTER_ONE_KILL_MIN = 4;
export const PDS_FIGHTER_TWO_KILL = 6;
/** PDS vs missiles: only a 6 kills, one missile per system per turn. */
export const PDS_MISSILE_KILL_ON = 6;

// --- Fighters ---------------------------------------------------------------

/** A fighter group is 1-6 craft. */
export const FIGHTER_GROUP_MAX = 6;
/** Fighter group move (mu) and attack range (mu, fore arc only). */
export const FIGHTER_MOVE_MU = 12;
export const FIGHTER_ATTACK_RANGE_MU = 6;
