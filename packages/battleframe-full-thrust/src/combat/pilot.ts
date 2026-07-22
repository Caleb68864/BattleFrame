/**
 * Fighter pilot quality (More Thrust, Aces and Turkeys). Most groups are average;
 * a "6" on a 1D6 gives the group an Ace (crack pilot) and a "1" makes it a whole
 * Turkey group (raw pilots), with opposite effects on attack dice, morale, and
 * dogfight dice. Pure over the diced quality and the raw die faces; the rolling,
 * the group bookkeeping, and any Foundry surfacing live above.
 *
 * These modifiers STACK with (are orthogonal to) the specialised-fighter-type
 * modifiers in `fighter-types.ts`/`fighters.ts`: pilot quality changes the die
 * COUNT and morale, the fighter type changes the per-die face table.
 *
 * Source: More Thrust "Fighter Pilot Quality"; "Fighter Group Morale"; the Fleet
 * Book 1 initiative note.
 */

import {
  PILOT_QUALITY_ACE_ROLL,
  PILOT_QUALITY_TURKEY_ROLL,
  PILOT_ACE_EXTRA_ATTACK_DICE,
  PILOT_ACE_MORALE_MODIFIER,
  PILOT_TURKEY_MORALE_MODIFIER,
  PILOT_TURKEY_MORALE_BREAK_FAILS,
  PILOT_STANDARD_MORALE_BREAK_FAILS,
  PILOT_TURKEY_DOGFIGHT_DIE_MODIFIER,
  PILOT_ACE_INITIATIVE_MODIFIER,
  PILOT_TURKEY_INITIATIVE_MODIFIER,
  FIGHTER_GROUP_MAX
} from "../constants";

export type PilotQuality = "standard" | "ace" | "turkey";

/** The start-of-game 1D6: 6 = an Ace in the group, 1 = a Turkey group, 2-5 = average. */
export function pilotQualityForRoll(roll: number): PilotQuality {
  if (roll >= PILOT_QUALITY_ACE_ROLL) return "ace";
  if (roll <= PILOT_QUALITY_TURKEY_ROLL) return "turkey";
  return "standard";
}

/**
 * Attack dice a group throws: an Ace adds one extra die to all normal attacks
 * (a full group of 6 rolls 7). When the Ace instead snipes a specific system
 * that turn the group loses that extra die (`aceSystemSnipeDice` returns it).
 */
export function pilotAttackDice(
  size: number,
  quality: PilotQuality,
  options: { aceSnipesSystem?: boolean } = {}
): number {
  if (quality === "ace" && !options.aceSnipesSystem) {
    return size + PILOT_ACE_EXTRA_ATTACK_DICE;
  }
  return size;
}

/**
 * The single die an Ace may instead spend targeting a chosen system (Needle-Beam
 * style) while the rest of the group attacks normally; zero for other pilots.
 */
export function aceSystemSnipeDice(quality: PilotQuality): number {
  return quality === "ace" ? 1 : 0;
}

/** Modifier added to a morale roll: Ace -1, Turkey +1, standard 0. */
export function pilotMoraleModifier(quality: PilotQuality): number {
  if (quality === "ace") return PILOT_ACE_MORALE_MODIFIER;
  if (quality === "turkey") return PILOT_TURKEY_MORALE_MODIFIER;
  return 0;
}

/**
 * Whether a morale roll passes (the group attacks): the pilot-modified roll must
 * be at or under the fighters remaining. Mirrors `fighterMoralePasses` with the
 * Ace/Turkey adjustment folded in.
 */
export function pilotMoralePasses(roll: number, size: number, quality: PilotQuality): boolean {
  return roll + pilotMoraleModifier(quality) <= size;
}

/**
 * Whether a group must roll morale before attacking: any depleted group, and a
 * Turkey group even at full strength ("must roll even at full strength").
 */
export function pilotRequiresMoraleCheck(
  size: number,
  quality: PilotQuality,
  max: number = FIGHTER_GROUP_MAX
): boolean {
  return quality === "turkey" || size < max;
}

/** Consecutive failed attack rolls that break the group: Turkey 2, others 3. */
export function pilotMoraleBreakThreshold(quality: PilotQuality): number {
  return quality === "turkey"
    ? PILOT_TURKEY_MORALE_BREAK_FAILS
    : PILOT_STANDARD_MORALE_BREAK_FAILS;
}

/** Whether that many consecutive fails breaks the group's morale. */
export function pilotMoraleBreaks(consecutiveFails: number, quality: PilotQuality): boolean {
  return consecutiveFails >= pilotMoraleBreakThreshold(quality);
}

/**
 * Per-die modifier applied to a group's DOGFIGHT dice: a Turkey subtracts 1 from
 * every die (ship attacks are unaffected -- assumed computerised). Aces get their
 * extra die (see `pilotAttackDice`) rather than a per-die bonus, so 0 here.
 */
export function pilotDogfightDieModifier(quality: PilotQuality): number {
  return quality === "turkey" ? PILOT_TURKEY_DOGFIGHT_DIE_MODIFIER : 0;
}

/** Applies the dogfight die modifier to each rolled face (no clamping, as with fighter-type mods). */
export function pilotDogfightFaces(faces: readonly number[], quality: PilotQuality): number[] {
  const mod = pilotDogfightDieModifier(quality);
  return faces.map((f) => f + mod);
}

/** Fleet Book 1 initiative modifier: +1 per Ace in action, -1 per Turkey group, 0 standard. */
export function pilotInitiativeModifier(quality: PilotQuality): number {
  if (quality === "ace") return PILOT_ACE_INITIATIVE_MODIFIER;
  if (quality === "turkey") return PILOT_TURKEY_INITIATIVE_MODIFIER;
  return 0;
}
