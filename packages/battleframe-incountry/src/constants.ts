/**
 * INCOUNTRY (INX) module identity and setting keys.
 *
 * This module ships NO ruleset content: no rulebook prose, no proprietary unit
 * stat blocks, no weapon tables, and -- since the rules-content audit -- no
 * rules numbers either. It implements the MECHANISMS; the user supplies every
 * number from the INX rulebook they own, as a data-model field on the unit or
 * as a module setting.
 *
 * What was here and where it went:
 *
 * - `INX_DIE_SIZE` (10) -- now {@link SETTING_DIE_SIZE}, which ships UNSET. The
 *   die a game resolves on is that game's design, not a VTT artefact; the
 *   ladder of dice Foundry can roll is the artefact, and this module never
 *   needed the ladder.
 * - `ARMOR_MODIFIER` (a tier -> modifier table) and `ARMOR_DICE_DEFAULT` (1) --
 *   now the `armorModifier` and `armorDice` fields on the unit data model. The
 *   card was always the source of these; the tier names were a lookup this
 *   module performed on the user's behalf, using numbers it had no business
 *   shipping. Every other value on that schema -- move, morale, both Attack
 *   values, every weapon profile -- was already user-entered. `armorType` was
 *   the one field whose value came from the repository rather than the card.
 * - `INJURY_DAMAGE_THRESHOLD` (5) -- deleted outright. Nothing imported it.
 *
 * See `docs/rules-content-audit.md`. The rule this file now follows: keep a
 * constant only if it is an engine or VTT artefact -- the same number whatever
 * game were loaded. A module id and an Actor subtype name qualify. A die size,
 * a range, a to-hit number and a damage result do not.
 */

export const MODULE_ID = "battleframe-incountry";

/** This ruleset's Actor subtype, namespaced by module id as Foundry requires. */
export const UNIT_ACTOR_TYPE = "unit";

/**
 * World setting: the die every INX roll uses, as entered by the user.
 *
 * Ships as {@link DIE_SIZE_UNSET} rather than a working default on purpose. A
 * default that happened to be the published value would put the number straight
 * back into the repository -- the migration would read as done while changing
 * nothing -- so the module refuses to roll until a world sets it. See
 * `requireDieSize` in `settings.ts`.
 */
export const SETTING_DIE_SIZE = "dieSize";

/** The die-size setting's shipped value: no die chosen yet. */
export const DIE_SIZE_UNSET = 0;
