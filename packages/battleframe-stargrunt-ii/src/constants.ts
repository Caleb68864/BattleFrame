/**
 * Stargrunt II module constants. This module ships NO ruleset content: no
 * rulebook prose, no proprietary stat blocks, no weapon/armour/points tables.
 * It implements the mechanics; the user supplies their own unit data.
 *
 * VTT artefacts (measurement tolerances, etc.) do NOT belong here.
 */

export const MODULE_ID = "battleframe-stargrunt-ii";

/** This ruleset's Actor subtypes, namespaced by module id as Foundry requires. */
export const UNIT_ACTOR_TYPE = "unit";
export const VEHICLE_ACTOR_TYPE = "vehicle";

/**
 * The polyhedral die-type ladder, lowest to highest. Stargrunt II resolves
 * almost everything by comparing single polyhedral dice and by shifting a die up
 * or down this ladder. Lowercase `"d4".."d12"` is deliberate: a `DieType` drops
 * straight into `dice.roll(`1${die}`)` with no case-map at the call site.
 *
 * This is the shared cross-module contract (identical in the Dirtside module);
 * its long-term home is the engine `dice` service (`dice.shift`).
 */
export const DIE_TYPES = ["d4", "d6", "d8", "d10", "d12"] as const;
