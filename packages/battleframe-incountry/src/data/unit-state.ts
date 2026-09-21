/**
 * Pure reads over a unit's system data. The Foundry data model
 * (`data/unit.ts`) defines the schema; these helpers interpret it and are
 * testable without any Foundry globals.
 */

export interface WeaponProfile {
  name: string;
  /** How many models in the unit carry this weapon. */
  count: number;
  /** Damage added to the attack total once at least one hit lands. */
  dmg: number;
  /** d10 thrown on a normal attack. */
  attackDice: number;
  /** d10 thrown when reacting (overwatch / counterattack). 0 = cannot react. */
  owDice: number;
}

export interface UnitSystemData {
  /** Starting model count. */
  modelCount: number;
  /** Models still alive; the unit is destroyed at 0. */
  modelsRemaining: number;
  /** Movement allowance in inches. */
  move: number;
  /** Suppression resistance; the suppression check rolls against the best of these. */
  morale: number;
  /** Roll <= this to hit a target NOT in cover. */
  attackClear: number;
  /** Roll <= this to hit a target in cover (always <= clear). */
  attackCover: number;
  /** Added to the armor roll. The card prints "Destroyed by damage X+" = this + 1. */
  armorModifier: number;
  /** Dice thrown on an armor check. */
  armorDice: number;
  suppressed: boolean;
  weapons: WeaponProfile[];
}

/** A unit at zero models is destroyed and needs no activation. */
export function isDestroyed(data: Pick<UnitSystemData, "modelsRemaining">): boolean {
  return data.modelsRemaining <= 0;
}

/** The to-hit target for this unit, swapped to the cover value when in cover. */
export function attackValue(
  data: Pick<UnitSystemData, "attackClear" | "attackCover">,
  inCover: boolean
): number {
  return inCover ? data.attackCover : data.attackClear;
}

/**
 * The armor roll modifier this unit's card gives.
 *
 * A read rather than a lookup now. This used to index a shipped tier table by
 * `armorType`, which made the module the source of a published number; the
 * value comes off the user's card like every other rating.
 */
export function armorModifier(data: Pick<UnitSystemData, "armorModifier">): number {
  return data.armorModifier;
}

/** The dice this unit's card throws on an armor check. */
export function armorDice(data: Pick<UnitSystemData, "armorDice">): number {
  return data.armorDice;
}

/** A weapon can react only if it has an overwatch profile (owDice > 0). */
export function canReactWith(weapon: Pick<WeaponProfile, "owDice">): boolean {
  return weapon.owDice > 0;
}
