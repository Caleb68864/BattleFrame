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

/**
 * Document flag holding the weapons-fire phase state (initiative winner, which
 * ships have fired, whose turn). Stored on a Document (the active Combat, else
 * the Scene) so it survives reload and syncs, per the project's turn-state rule.
 */
export const FIRE_PHASE_FLAG = "firePhase";

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
  "submunition",
  "salvo"
] as const;
export type WeaponKind = (typeof WEAPON_KINDS)[number];

/** Salvo missile launcher: fires a salvo of 6 one-turn missiles; standard range 24mu. */
export const SALVO_SIZE = 6;
export const SALVO_RANGE_MU = 24;

// --- Independent (More Thrust) missiles -------------------------------------

/**
 * Independent missiles are one-shot AI craft (distinct from salvo missiles):
 * launched in a dedicated missile phase forward along the firing ship's course,
 * they move as craft for a few turns and strike a ship that ends its move nearby.
 * Source: More Thrust "Missiles (Basic)".
 */
/** Missile move per turn (mu). */
export const MISSILE_MOVE_MU = 18;
/** The single mid-point course change a missile may make, in course points (60°). */
export const MISSILE_TURN_POINTS = 2;
/** Missile life span before it runs out of power and is removed (turns). */
export const MISSILE_LIFE_TURNS = 3;
/** A ship must FINISH within this range of an active missile to be attacked (mu). */
export const MISSILE_ATTACK_RANGE_MU = 6;
/**
 * The missile's rear arc: a target lying in the "A" arc relative to the missile's
 * own facing is behind it and cannot be attacked (the missile does not turn back).
 */
export const MISSILE_REAR_ARC: FireArc = "A";
/**
 * Normal (nuclear) warhead: on a successful attack roll this many dice; the TOTAL
 * score is the damage inflicted (2-12). Ignores screens (armour still absorbs).
 * Source: More Thrust "Missile Warheads" — Normal.
 */
export const MISSILE_NORMAL_WARHEAD_DICE = 2;

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

// --- Spinal-mount Nova Cannon (FT2 "VERY optional" mega-weapon) --------------

/**
 * The spinal-mount Nova Cannon: a capital-only forward mega-weapon. Its self-
 * sustaining plasma "sun" arms 6mu ahead of the bow then a template sweeps
 * straight forward over a 3-turn life, widening while its damage falls off.
 * Damage per die = the actual face rolled (like pulse torpedoes); screens give
 * NO protection, so the module carries no screen parameter for it.
 *
 * Sources (user's FT2 notes, "Spinal-Mount Nova Cannon"): "MASS 16, 50 Points.",
 * "Projectile arms 6mu ahead of the bow", and the per-turn sweep table:
 *   Turn 1: 2" template, move 18" (24" total), 6D6.
 *   Turn 2: 4" template, move 24", 4D6.
 *   Turn 3: 6" template, move 24", 2D6, then burns out.
 * "Damage per die = the face rolled (6D6 = 6-36 points on turn 1). Screens give
 * no protection."
 */
export const NOVA_CANNON_MASS = 16;
export const NOVA_CANNON_POINTS = 50;
export const NOVA_CANNON_LIFE_TURNS = 3;
/** The plasma arms this far ahead of the bow before the sweep begins (mu). */
export const NOVA_CANNON_ARMING_OFFSET_MU = 6;
/** Damage dice by turn of life (index 0 = turn 1): 6D6, 4D6, 2D6. */
export const NOVA_CANNON_DICE_BY_TURN = [6, 4, 2] as const;
/** Template diameter (inches) by turn of life (index 0 = turn 1): 2", 4", 6". */
export const NOVA_CANNON_TEMPLATE_INCHES_BY_TURN = [2, 4, 6] as const;
/**
 * How far the template travels each turn (mu), index 0 = turn 1. Turn 1 travels
 * 18mu from the 6mu arming point (24mu total from the bow); turns 2 and 3 travel
 * 24mu each. ASSUMPTION: the note gives an explicit "24" total" only for turn 1;
 * turns 2 and 3 are modelled as continuing from the previous turn's end point
 * (a contiguous forward sweep), which matches "replace with a [wider] template,
 * move it 24"" — the plasma keeps moving forward, it does not restart at the bow.
 */
export const NOVA_CANNON_TRAVEL_MU_BY_TURN = [18, 24, 24] as const;

// --- Wave Gun (More Thrust: the tamer Nova Cannon variant) -------------------

/**
 * The Wave Gun: a smaller forward plasma weapon that expands as it travels along
 * the ship's axis, resolved in a single turn (life = 1 turn). Like the Nova
 * Cannon its damage = the actual die score and neither screens nor armour reduce
 * it, so no screen parameter. It must be charged first: each charging turn rolls
 * 1d6 and accumulates; at 6+ stored it is fully charged and may fire on any later
 * turn, and firing fully discharges it. If knocked out while charging/charged the
 * ship takes damage equal to the stored charge.
 *
 * Sources (user's More Thrust notes, "Wave Gun"): "Full range: 36mu" with bands
 *   0-12mu: 2" template, 4D6.
 *   12-24mu: 3" template, 3D6.
 *   24-36mu: 4" template, 2D6.
 * "Damage = actual score on each die." "Charging: each turn noted as charging,
 * roll one die and accumulate; at 6+ total it is fully charged... Firing fully
 * discharges it (recharge from zero)." "If knocked out... while charging/charged,
 * the ship takes damage equal to the current stored charge." "MASS 10, 30 Points."
 */
export const WAVE_GUN_MASS = 10;
export const WAVE_GUN_POINTS = 30;
export const WAVE_GUN_MAX_RANGE_MU = 36;
/** Range band width (mu); index 0 = 0-12mu. */
export const WAVE_GUN_BAND_MU = 12;
/** Damage dice by range band (index 0 = 0-12mu): 4D6, 3D6, 2D6. */
export const WAVE_GUN_DICE_BY_BAND = [4, 3, 2] as const;
/** Template diameter (inches) by range band (index 0 = 0-12mu): 2", 3", 4". */
export const WAVE_GUN_TEMPLATE_INCHES_BY_BAND = [2, 3, 4] as const;
/** Stored-charge total at or above which the Wave Gun is fully charged. */
export const WAVE_GUN_FULL_CHARGE = 6;

// --- Vector movement (optional FT2 / Fleet Book system) ---------------------

/**
 * Manoeuvring-thruster rating = the main-drive Thrust divided by this, rounded
 * DOWN (a TR-6 ship has 3 thruster points, TR-5 has 2). Thruster spend is on top
 * of full main-drive thrust. See `movement/vector.ts`. (Fleet Book rounds the
 * vector-mode turning allowance DOWN, the mirror of cinematic `turningCap`'s UP.)
 */
export const MANOEUVRING_THRUSTER_DIVISOR = 2;
/** A manoeuvring-thruster PUSH costs 1 point per 1 mu of displacement. */
export const PUSH_MU_PER_POINT = 1;
/** A facing ROTATION costs a flat 1 thruster point for any heading change. */
export const ROTATION_THRUSTER_COST = 1;

// --- Fleet Book optional damage layers (roadmap P2 #19) ---------------------

/**
 * Core Systems (Fleet Book 1, optional): the three deep-buried systems (Command
 * Bridge, Power Core, Life Support) roll at +1 to the current threshold kill
 * number, one step tougher than surface systems. 1st threshold: surface lost on
 * 6, core on "7" = safe; 2nd: surface 5-6, core 6; 3rd: surface 4-6, core 5-6. A
 * core kill number above DIE_SIZE (6) is unreachable on a d6 -- i.e. immune.
 * Source (user's "Core Systems" note): "At each Threshold Check, core systems
 * roll at +1 to the current threshold number, so they are one step tougher than
 * surface systems ... 1st threshold (surface lost on 6): core lost only on a '7'".
 *
 * The reroll / penetrating-damage and armour-bypass layers (also Fleet Book 1)
 * introduce NO new damage numbers: the reroll die scores on the ordinary
 * unscreened per-die table (DIE_ONE_DAMAGE_* / DIE_TWO_DAMAGE above) and a rolled
 * 6 (DIE_TWO_DAMAGE) is the reroll trigger, so `ship/fleet-book.ts` builds on
 * those existing constants rather than adding duplicates here.
 */
export const CORE_SYSTEM_THRESHOLD_BONUS = 1;
