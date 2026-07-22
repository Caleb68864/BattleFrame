/**
 * Dirtside II (GZG) module identity + geometry constants.
 *
 * This module ships NO ruleset content: no rulebook prose, no cost tables, no
 * colour-validity tables, no signature→die tables, no proprietary stat blocks.
 * It implements the MECHANISMS; the user supplies every number (band distances,
 * signature→die map, chit pot composition, colour meanings, kill totals) as a
 * data-model field or a Foundry Document they populate.
 *
 * Only VTT / geometry constants (arc half-angles, the die-ladder rungs) live
 * here — those are engine artefacts, not GZG design data.
 */

export const MODULE_ID = "battleframe-dirtside";

/**
 * The three element/grouping Actor subtypes this module registers. Foundry
 * namespaces each as `<MODULE_ID>.<subtype>` (e.g. `battleframe-dirtside.unit`);
 * that full string is the Actor `type` and the `CONFIG.Actor.dataModels` key.
 *
 * NOTE (naming reconciliation): the build plan writes these as `dirtside-ii.*`,
 * but Foundry v14 keys module document subtypes by the manifest `id`, which is
 * `battleframe-dirtside`. The subtype namespace therefore MUST be the module id,
 * exactly as InCountry registers `battleframe-incountry.unit`. Flag scope is the
 * same string for the same reason (`actor.setFlag(MODULE_ID, "unitId", …)`).
 */
export const VEHICLE_ACTOR_TYPE = "vehicle";
export const INFANTRY_ACTOR_TYPE = "infantry";
export const UNIT_ACTOR_TYPE = "unit";

/** The flag key on an element Actor that points up to its owning unit Actor. */
export const UNIT_ID_FLAG = "unitId";

/**
 * The symmetric die ladder DSII (and SG2) walk. Lowercase `dN` so the strings
 * drop straight into a Foundry `Roll("1d10")` formula. Shared Tier-0 atom — see
 * `src/dice/ladder.ts`.
 */
export const DIE_LADDER = ["d4", "d6", "d8", "d10", "d12"] as const;
