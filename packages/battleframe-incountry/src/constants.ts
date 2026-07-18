/**
 * INCOUNTRY (INX) 2.0 rules numbers. Sourced from the INX 2.0 rulebook by Echo
 * Dark Studios. Every rules value the module uses lives here so a correction is
 * a one-line edit. VTT artefacts (measurement tolerances, etc.) do NOT belong
 * here -- this file's contract is "INX numbers only".
 *
 * This module ships NO ruleset content: no rulebook prose, no proprietary unit
 * stat blocks, no weapon tables. It implements the mechanics; the user supplies
 * their own unit data. (Same clean-room stance as Simple Skirmish shipping "no
 * artwork".)
 */

export const MODULE_ID = "battleframe-incountry";

/** This ruleset's Actor subtype, namespaced by module id as Foundry requires. */
export const UNIT_ACTOR_TYPE = "unit";

/** INX resolves everything on the ten-sided die. */
export const INX_DIE_SIZE = 10;

/**
 * Armor tiers. An armor check rolls `dice` d10, adds `modifier`, and the model
 * SURVIVES iff the total is strictly greater than the incoming damage (a tie
 * destroys -- rulebook H.3).
 *
 * The card prints "Destroyed by damage X+", which is shorthand for
 * `modifier = X - 1` on a single die: Unarmored 5+ -> +4, Body Armor 6+ -> +5,
 * Advanced Armor 7+ -> +6. Shields are a trait, not a tier.
 */
export type ArmorType = "unarmored" | "body" | "advanced";

export const ARMOR_MODIFIER: Readonly<Record<ArmorType, number>> = {
  unarmored: 4,
  body: 5,
  advanced: 6
};

/** Infantry armor rolls one d10 unless a trait says otherwise. */
export const ARMOR_DICE_DEFAULT = 1;

/**
 * The "Injury"/optional-lethality threshold: passing an armor check against
 * damage >= this value still leaves the model injured (rulebook H.5). Carried
 * for the advanced toggle; the core game does not apply it.
 */
export const INJURY_DAMAGE_THRESHOLD = 5;
