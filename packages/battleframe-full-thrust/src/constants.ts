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

/**
 * Scene flag holding the list of active independent missiles (position, course,
 * life, warhead, owning side). Missiles are fire-and-forget craft advanced in
 * their own phase; storing them on the Scene keeps the board state persistent +
 * synced (per the project's turn-state rule) without a per-missile Actor.
 */
export const ACTIVE_MISSILES_FLAG = "activeMissiles";

/** Actor flag holding a ship's accumulated Wave Gun charge (fires at 6+). */
export const WAVE_GUN_CHARGE_FLAG = "waveGunCharge";

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

// --- Fighter pilot quality (More Thrust: Aces and Turkeys) ------------------

/**
 * Pilot quality is diced 1D6 per group at the start of the game: "6 = the group
 * contains an Ace; 1 = the group is a Turkey group; 2-5 = average."
 */
export const PILOT_QUALITY_ACE_ROLL = 6;
export const PILOT_QUALITY_TURKEY_ROLL = 1;
/** Ace: "+1 die on all normal attacks (a full group of 6 rolls 7 dice)." */
export const PILOT_ACE_EXTRA_ATTACK_DICE = 1;
/** Ace: "-1 to all morale rolls." */
export const PILOT_ACE_MORALE_MODIFIER = -1;
/** Turkey: "+1 to all morale rolls (must roll even at full strength)." */
export const PILOT_TURKEY_MORALE_MODIFIER = 1;
/**
 * Consecutive failed attack rolls that break a group's morale: a Turkey "Bugs
 * out after only TWO consecutive failed attack rolls (vs three for average)."
 */
export const PILOT_TURKEY_MORALE_BREAK_FAILS = 2;
export const PILOT_STANDARD_MORALE_BREAK_FAILS = 3;
/** Turkey: "-1 to every die roll when in a dogfight (ship attacks are unaffected)." */
export const PILOT_TURKEY_DOGFIGHT_DIE_MODIFIER = -1;
/**
 * Fleet Book 1 initiative use: "+1 to the initiative roll per Ace in action,
 * -1 per Turkey group."
 */
export const PILOT_ACE_INITIATIVE_MODIFIER = 1;
export const PILOT_TURKEY_INITIATIVE_MODIFIER = -1;

// --- Specialised fighter types: Fast & Torpedo (More Thrust) ----------------

/** Fast: "move 18 mu instead of 12." (The standard 12 is FIGHTER_MOVE_MU.) */
export const FIGHTER_MOVE_FAST_MU = 18;
/** Torpedo attack run: "each needs 4+ to hit". */
export const TORPEDO_HIT_MIN = 4;
/**
 * Attack fighters (and a spent-Torpedo group) "in a dogfight kills only on a 6
 * (one kill)" -- a single kill per 6, never the universal table's 2.
 */
export const ATTACK_FIGHTER_DOGFIGHT_KILL_ON = 6;

// --- Independent missile warhead variants: EMP & Needle (More Thrust) --------

/**
 * EMP warhead. Source (user's "Missile Warheads" note): "Scrambles systems
 * without structural damage. Roll ONE die, subtracting 1 per level of the
 * target's screens, then: 1-2 = no effect. 3-4 = roll for EVERY system as a
 * Threshold Check; systems knocked out on 5-6. 5-6 = roll for every system as
 * threshold, but knocked out on 4, 5 or 6."
 *
 * Note the apparent tension with the note's header "All three ignore Screens":
 * the EMP does NO hull damage (so "damage bypasses screens" is vacuous for it),
 * yet its EFFECT die is explicitly reduced by screen level -- that specific rule
 * is what these constants encode.
 */
export const MISSILE_EMP_WARHEAD_DICE = 1;
/** Screen-modified effect die at or below this = no effect (the "1-2" band). */
export const MISSILE_EMP_NO_EFFECT_MAX = 2;
/** Top of the weak effect band ("3-4"); above it is the strong band ("5-6"). */
export const MISSILE_EMP_WEAK_MAX = 4;
/** Weak band ("3-4"): each system's threshold roll knocks it out on 5-6. */
export const MISSILE_EMP_WEAK_KILL_ON = 5;
/** Strong band ("5-6"): each system's threshold roll knocks it out on 4-6. */
export const MISSILE_EMP_STRONG_KILL_ON = 4;

/**
 * Needle warhead. Source (user's "Missile Warheads" note): "Like a Needle Beam,
 * seeks one nominated system. Owner picks the target system and rolls a die:
 * 1-3 = misses that system but does ONE die-score of normal damage (1-6 points).
 * 4-6 = knocks out that specific system AND does 1 die of normal damage."
 *
 * ASSUMPTION (number of dice): the note says "rolls a die" (singular) and, in
 * BOTH branches, "does ... 1 die of normal damage". We model this as a SINGLE
 * die whose face is dealt as normal damage (armour absorbs, screens bypassed)
 * AND, on a 4-6, also knocks out the nominated system. The parenthetical
 * "(1-6 points)" is read as defining "one die-score of normal damage" = a d6.
 * The alternative reading (a separate to-hit die plus an independent 1d6 damage
 * die) is possible; if the intent was two dice this is a one-line change.
 */
export const MISSILE_NEEDLE_WARHEAD_DICE = 1;
/** The nominated system is knocked out on a die of this or higher (the "4-6"). */
export const MISSILE_NEEDLE_KNOCKOUT_MIN = 4;

// --- Fleet Book variable hull strength (Fleet Book 1) -----------------------

/**
 * Fleet Book hull-integrity grades: each takes a percentage of the ship's total
 * MASS, and "that same MASS figure becomes the ship's damage (hull) boxes".
 * Source (user's "Variable Hull Strength" note table): Fragile 10, Weak 20,
 * Average 30, Strong 40, Super 50 (percent of total MASS).
 */
export const VARIABLE_HULL_GRADE_PERCENT = {
  fragile: 10,
  weak: 20,
  average: 30,
  strong: 40,
  super: 50
} as const;

/**
 * Hull-integrity points cost per unit MASS. Source (Variable Hull Strength):
 * "Points cost of the hull integrity is always 2 x the MASS used on it."
 */
export const VARIABLE_HULL_POINTS_PER_MASS = 2;

/**
 * Rows the variable damage track is split into. Source (Variable Hull Strength):
 * "Damage boxes are split into 4 rows ... if not divisible by 4, extra boxes go
 * in the upper rows."
 */
export const VARIABLE_HULL_ROWS = 4;

// --- Carriers & fighter bays (roadmap P2 #14) -------------------------------

/**
 * Each fighter bay holds exactly one 6-fighter group; a lost bay costs six
 * fighters. So a carrier's group capacity equals its functional bays and its
 * fighter capacity is that times six. Source (user's "Carriers & Fighter Bays"
 * note): "each bay holds one 6-fighter group ... each lost bay reduces capacity
 * by six fighters." The note's class table falls straight out of this:
 * Battledreadnought 1 bay (6), Superdreadnought 2 (12), Light Carrier 4 (24),
 * Fleet / Attack Carrier 6 (36).
 */
export const FIGHTERS_PER_BAY = 6;

/**
 * Groups launchable per turn: an actual carrier launches two, any other
 * fighter-carrying ship one. Source ("Carriers & Fighter Bays"): "Actual
 * carriers may launch 2 groups per turn; other ships only 1."
 */
export const CARRIER_LAUNCH_PER_TURN = 2;
export const SHIP_LAUNCH_PER_TURN = 1;

/**
 * Groups recoverable per turn: every fighter-carrying ship, carrier or not,
 * lands at most one. Source ("Carriers & Fighter Bays"): "All fighter-carrying
 * ships may recover only 1 group per turn."
 */
export const FIGHTER_RECOVER_PER_TURN = 1;

/**
 * More Thrust "return or be lost" grace: an exhausted group that cannot reach
 * its carrier within this many turns of running dry is lost (pilots eject).
 * Source (user's "Fighter Endurance" note, More Thrust edition): "A group that
 * cannot rendezvous within 3 turns of exhaustion is lost."
 *
 * NOTE (edition-specific + boundary assumption): this grace is a More Thrust
 * rule only -- Fleet Book 1 has NO time limit once exhausted (the same note:
 * "there is NO time limit to return once exhausted"). The count is read as
 * completed turns since endurance hit zero, so the group is lost once three
 * such turns have elapsed without a rendezvous (>= 3). Callers using Fleet Book
 * endurance should not consult this constant.
 */
export const FIGHTER_RETURN_GRACE_TURNS = 3;

// --- Kra'Vak kinetic weapons (Fleet Book 2 — Xeno File 1; roadmap P2 #20) ----

/**
 * K-gun (railgun) range/to-hit. All K-gun CLASSES share one to-hit table; class
 * only sets the damage a penetrating hit does. These numbers coincide with the
 * pulse-torpedo table but are an independently-sourced Kra'Vak rule (mirroring
 * how PDS keeps its own constants), so they live here in their own block.
 * Source (user's "K-guns" note): "To hit (roll 1 die per K-gun): 0-6mu 2+, 6-12
 * 3+, 12-18 4+, 18-24 5+, 24-30 6." and "All classes share the same range bands
 * and to-hit numbers; class only affects the damage a penetrating hit does."
 */
export const KGUN_MAX_RANGE_MU = 30;
export const KGUN_BAND_MU = 6;
export const KGUN_TO_HIT_BY_BAND = [2, 3, 4, 5, 6] as const;

/**
 * K-gun penetration/damage: on a hit a second die is rolled against gun class.
 * Source (user's "K-guns" note): "roll greater than gun class -> damage = class;
 * roll <= class -> damage = class x 2. A natural 6 always = class (even for
 * K-6+)." and the worked examples "class-3 K-gun does 6 DP on 1-3, 3 DP on 4-6.
 * Class-5 does 10 DP on 1-5, 5 DP on 6." The natural-6 cap uses DIE_SIZE.
 */
export const KGUN_DAMAGE_MULTIPLIER = 2;

/**
 * K-gun armour piercing. Source (user's "K-guns" / "Kra'Vak Armour" notes):
 * "only the first DP of each single hit is taken on armour/carapace; the entire
 * remainder goes straight to hull. (Per-hit, not per-salvo.)"
 */
export const KGUN_ARMOUR_PIERCE_DP = 1;

/**
 * K-1 limited point-defence mode. Source (user's "K-guns" note): the K-1 "can
 * also fire in a limited point-defence mode (hit on 5-6, one kill per hit, no
 * rerolls, can't also do anti-ship fire that turn)."
 */
export const KGUN_K1_POINT_DEFENCE_KILL_ON = 5;

/**
 * Multiple Kinetic Penetrator (MKP) Pack: a one-shot Kra'Vak kinetic weapon.
 * Source (user's "K-guns" note): "12mu, 1 arc, roll 1 die (4-5 = 1 hit, 6 = 2
 * hits), each hit = 4 DP resolved like a class-4 K-gun. 1 MASS, 4 pts." The "4
 * DP" is flat (not rolled); "resolved like a class-4 K-gun" means the pierce
 * rule applies (1 DP to armour, remainder to hull) -- see applyKgunHit.
 */
export const MKP_RANGE_MU = 12;
export const MKP_ONE_HIT_MIN = 4;
export const MKP_TWO_HIT = 6;
export const MKP_HIT_DP = 4;

/**
 * Scattergun: the Kra'Vak one-shot, all-arc, no-fire-control kinetic PD weapon;
 * 6mu in every mode. Source (user's "Scatterguns" note, Fleet Book 2): "Range:
 * 6mu in point-defence / area-defence / anti-ship modes."
 */
export const SCATTERGUN_RANGE_MU = 6;

/**
 * Scattergun vs fighters / salvo missiles. Source (user's "Scatterguns" note):
 * "Vs fighters / salvo missiles: kills 1D6 elements (halve, round up, vs heavy
 * fighters)." The die roll itself is the kill count; heavy fighters halve it
 * (round up) via this divisor.
 */
export const SCATTERGUN_HEAVY_FIGHTER_DIVISOR = 2;

/**
 * Scattergun vs plasma bolts. Source (user's "Scatterguns" note): "Vs plasma
 * bolts: 4-5 reduces bolt strength by 1, 6 reduces by 2 (no rerolls)."
 */
export const SCATTERGUN_PLASMA_ONE_REDUCE_MIN = 4;
export const SCATTERGUN_PLASMA_TWO_REDUCE = 6;

/**
 * Scattergun point-blank anti-ship fire (kinetic, but NOT armour-piercing --
 * unlike a K-gun the burst is absorbed by armour normally). Source (user's
 * "Scatterguns" note): "Vs ships ...: 4-5 = 1 DP, 6 = 2 DP (two separate hits,
 * so both taken on armour if present). No rerolls." The two hits of a 6 absorb
 * identically to one 2-DP hit against non-piercing armour, so the applier takes
 * the total.
 */
export const SCATTERGUN_SHIP_ONE_DP_MIN = 4;
export const SCATTERGUN_SHIP_TWO_DP = 6;

/**
 * Scattergun area-defence friendly-fire quirk. Source (user's "Scatterguns"
 * note): "in area-defence, an effect roll of 1 means stray projectiles hit the
 * defended ship for 1 DP."
 */
export const SCATTERGUN_FRIENDLY_FIRE_ON = 1;

// --- Sa'Vasku bio-systems (Fleet Book 2 — Xeno File 2; roadmap P2 #20) -------

/**
 * The Sa'Vasku power pool itself needs no numeric constant: its size is just the
 * summed MASS of the ship's still-functioning Power Generators. Source (user's
 * "Sa'Vasku Power Points" note): "A Sa'Vasku ship's total power each turn is the
 * sum of its still-functioning Power Generators (each generator's value = its
 * MASS; 1 MASS = 1 point)." "Power not spent by end of turn is wasted; there is
 * no storage." Generators die automatically when their damage-track row is gone
 * (no threshold roll), which simply removes their MASS from the sum next turn.
 */

/**
 * Movement pool: powering the Main Drive Node. Source ("Sa'Vasku Power Points"):
 * "Thrust cost = 2% x thrust x ship MASS (rounded up); a damaged drive costs
 * double (4%)." (FTL jump cost = the FTL node's MASS, so it needs no constant.)
 */
export const SAVASKU_THRUST_COST_PERCENT = 2;
export const SAVASKU_DAMAGED_DRIVE_MULTIPLIER = 2;

/**
 * Defence pool: energising a Screen Node. Source ("Sa'Vasku Systems"): "cost =
 * node MASS = 5% ship MASS, min 3 MASS; max two effective at once, as with human
 * Screens." ASSUMPTION: the note gives no rounding for the 5% figure; modelled as
 * rounded UP (as the other Sa'Vasku percentage cost, thrust, is), then floored at
 * 3 MASS — a one-line change if the intent was round-to-nearest.
 */
export const SAVASKU_SCREEN_NODE_MASS_PERCENT = 5;
export const SAVASKU_SCREEN_NODE_MIN_MASS = 3;
export const SAVASKU_MAX_EFFECTIVE_SCREENS = 2;

/**
 * Attack pool: Spicule point-defence. Source ("Sa'Vasku Systems"): "Spicules:
 * the Sa'Vasku Point Defence System — 1 PP (from A pool) per shot, all-arc ...
 * rolls exactly like a PDS." The roll itself reuses the shared PDS die table
 * (PDS_FIGHTER_* / PDS_MISSILE_KILL_ON above); only the per-shot cost is new.
 */
export const SAVASKU_SPICULE_COST = 1;

/**
 * Stinger beam node: output scales with the Attack power spent, the power needed
 * per hit-die doubling each 12mu band. Source ("Sa'Vasku Systems"): "Power per
 * hit-die by range: 0-12mu 1 PP, 12-24 2, 24-36 4, 36-48 8, 48-60 16, 60-72 32
 * (doubling each band)." The dice themselves "read as standard Beam Weapons ...
 * Screens (and Phalon shrouds) apply normally", so per-die damage reuses beam.ts
 * (`poolBeamDamage`); this block only adds the power->dice conversion.
 */
export const SAVASKU_STINGER_BAND_MU = 12;
export const SAVASKU_STINGER_MAX_RANGE_MU = 72;
export const SAVASKU_STINGER_POWER_PER_DIE_BY_BAND = [1, 2, 4, 8, 16, 32] as const;

/**
 * Pod Launcher munitions each cost Attack power PLUS one consumed biomass to fire
 * one munition/turn. Source ("Sa'Vasku Systems"): "Single-arc launchers that
 * consume 1 biomass plus Attack-pool power ... Lance Pod (3 PP) ... Leech Pod
 * (3 PP) ... Interceptor Pod (3 PP)."
 */
export const SAVASKU_POD_BIOMASS_COST = 1;
export const SAVASKU_LANCE_POD_COST = 3;
export const SAVASKU_LEECH_POD_COST = 3;
export const SAVASKU_INTERCEPTOR_POD_COST = 3;

/**
 * Lance Pod: the carapace/armour-piercer. Source ("Sa'Vasku Systems"): "Hit
 * 0-6mu 3+, 6-12 4+, 12-18 5+, 18-24 6; damage = second die roll, only the first
 * DP taken on armour, rest to hull. No rerolls." The pierce rule ("first DP on
 * armour, rest to hull") is exactly the K-gun rule, so the applier reuses
 * applyKgunHit; damage per hit is simply the rolled face.
 */
export const SAVASKU_LANCE_POD_MAX_RANGE_MU = 24;
export const SAVASKU_LANCE_POD_BAND_MU = 6;
export const SAVASKU_LANCE_POD_TO_HIT_BY_BAND = [3, 4, 5, 6] as const;
export const SAVASKU_LANCE_POD_ARMOUR_PIERCE_DP = 1;

/**
 * Leech Pod: burns on turn after turn until cleared. Source ("Sa'Vasku Systems"):
 * "2 DP on impact, then 2 more DP every following turn until killed off
 * (damage-control roll for crewed ships; 1-3 R-pool points for Sa'Vasku).
 * Non-penetrating (spreads over armour first)." Non-penetrating means both the
 * impact and the ongoing damage go through the ordinary armour-first applier
 * (applyDamageWithArmour), not the pierce applier.
 */
export const SAVASKU_LEECH_POD_IMPACT_DP = 2;
export const SAVASKU_LEECH_POD_ONGOING_DP = 2;
export const SAVASKU_LEECH_CLEAR_MIN = 1;
export const SAVASKU_LEECH_CLEAR_MAX = 3;

/**
 * Interceptor Pod: area point-defence. Source ("Sa'Vasku Systems"): "area-
 * defence, 12mu, hits any fighter/missile/plasma-bolt within range (need not be
 * in arc). Effect = a Kra'Vak scattergun." The effect reuses the scattergun
 * functions in kravak.ts (scattergunFighterKills / scattergunPlasmaReduction);
 * only the range is new here.
 */
export const SAVASKU_INTERCEPTOR_POD_RANGE_MU = 12;

/**
 * Repair pool: a system-repair attempt. Source ("Sa'Vasku Power Points"):
 * "system-repair attempts (points = MASS of the system, plus a 4+ roll)" and
 * ("Sa'Vasku Systems"): "regrown via Repair-pool power (points = node MASS, plus
 * a 4+ roll, consuming 1 biomass on success)."
 */
export const SAVASKU_REPAIR_SUCCESS_MIN = 4;
export const SAVASKU_REPAIR_BIOMASS_ON_SUCCESS = 1;

/**
 * Drone Wombs: grow fighter-equivalent Drones. Source ("Sa'Vasku Systems"):
 * "groups of 6. 1 biomass + 1 R-pool point per drone; 1 turn to grow, 1 to
 * launch ... Standard multirole drones: 24mu move, 1 die/drone, no morale
 * checks." Drone COMBAT reuses the standard fighter mechanics; only these growth
 * costs and stats are Sa'Vasku-specific.
 */
export const SAVASKU_DRONES_PER_GROUP = 6;
export const SAVASKU_DRONE_POWER_PER = 1;
export const SAVASKU_DRONE_BIOMASS_PER = 1;
export const SAVASKU_DRONE_MOVE_MU = 24;
export const SAVASKU_DRONE_DICE_PER = 1;

/**
 * Biomass: the living-hull damage track. Source ("Sa'Vasku" / "Sa'Vasku
 * Systems"): "biomass damage boxes (1 MASS, 2 pts). Consumed biomass does not
 * trigger threshold checks; only inflicted damage does. When consumed and
 * damaged boxes meet, the ship is dead." Carapace is "dead-biomass armour (1
 * MASS, 2 pts) ... behaves like Armour", so it reuses the ordinary armour path.
 */
export const SAVASKU_BIOMASS_MASS_PER_BOX = 1;
export const SAVASKU_BIOMASS_POINTS_PER_BOX = 2;

// --- Phalon bio-tech (Fleet Book 2 — Xeno File 3; roadmap P2 #20) ------------

/**
 * Plasma Bolt Launcher marker placement and burst/intercept radii. Source
 * (user's "Phalon Systems" note): "Launches a bolt marker ... up to 30mu" and
 * "any ship within 6mu of the marker may PDS it ... all ships within 6mu burst
 * radius take full dice of damage". Range/radius checks live in the firing
 * orchestration; these are exported for it, not used by the pure damage math.
 */
export const PLASMA_BOLT_MAX_RANGE_MU = 30;
export const PLASMA_BOLT_BURST_RADIUS_MU = 6;
export const PLASMA_BOLT_INTERCEPT_RADIUS_MU = 6;

/**
 * Plasma bolt interception: how PDS and scattergun/interceptor dice wear down a
 * bolt's strength before it bursts. Source (user's "Phalon Systems" note): "each
 * PDS 6 = -1 to bolt strength; scatterguns/interceptor pods roll like a beam
 * die, 4-5 = -1, 6 = -2". The 4/5/6 interceptor thresholds coincide with the
 * scattergun-vs-plasma numbers (SCATTERGUN_PLASMA_*) but are an
 * independently-sourced Phalon rule, so they live in this block.
 */
export const PLASMA_BOLT_PDS_REDUCE_ON = 6;
export const PLASMA_BOLT_INTERCEPT_ONE_REDUCE_MIN = 4;
export const PLASMA_BOLT_INTERCEPT_TWO_REDUCE = 6;

/**
 * Plasma bolt burst is "full dice" (DP = die score) and screens/shrouds negate
 * the high faces outright. Source (user's "Phalon Systems" note): "full dice of
 * damage (DP = die score) ... screens/shrouds negate high rolls (level-1 negates
 * 6s; level-2 / shroud negate 5s and 6s). No rerolls." The negated faces reuse
 * DIE_TWO_DAMAGE (6) and DIE_ONE_DAMAGE_MAX (5) above; a vapour shroud "acts as
 * a level-2 screen vs all energy attacks", so level 2 is the strongest entry.
 */
export const PLASMA_BOLT_SCREEN_MAX_LEVEL = 2;
