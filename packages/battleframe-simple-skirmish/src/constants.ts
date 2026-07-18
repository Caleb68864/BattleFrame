/**
 * Simple Skirmish rules numbers, sourced from *Simple Fantasy Skirmish* by
 * Peter Vodden (CC BY-NC 4.0). Every rules number the module uses lives here,
 * so a rules correction is a one-line edit and never a value duplicated into a
 * language file or a view. VTT artefacts (measurement tolerances, etc.) do NOT
 * belong here -- this file's contract is "Simple Skirmish numbers only".
 */

export const MODULE_ID = "battleframe-simple-skirmish";

/** This ruleset's Actor subtype, namespaced by module id as Foundry requires. */
export const UNIT_ACTOR_TYPE = "unit";

/**
 * Move speeds in inches (QSR "Moving & Measuring"): the three unit-card speeds.
 * A unit's own speed is one of these; the labels are the game's own.
 */
export const MOVE_SHAMBLING_INCHES = 3;
export const MOVE_STANDARD_INCHES = 6;
export const MOVE_FAST_INCHES = 9;

export type MoveSpeed = "shambling" | "standard" | "fast";

export const MOVE_SPEED_INCHES: Readonly<Record<MoveSpeed, number>> = {
  shambling: MOVE_SHAMBLING_INCHES,
  standard: MOVE_STANDARD_INCHES,
  fast: MOVE_FAST_INCHES
};

/** Default Ranged/Magic range in inches when a unit card gives none (QSR: "up to 12""). */
export const DEFAULT_RANGE_INCHES = 12;

/** The die every Basic Game roll uses (Champions use larger dice -- Advanced Game). */
export const BASIC_DIE_SIZE = 6;

/**
 * The three attack types a unit may have. Each has its own Attack target (and
 * optionally its own Save target for defending against it), per the unit card.
 */
export type AttackType = "melee" | "ranged" | "magic";

export const ATTACK_TYPES: readonly AttackType[] = ["melee", "ranged", "magic"];
