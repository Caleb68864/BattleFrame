import { INX_DIE_SIZE, MODULE_ID } from "../constants";

export interface DiceRollResult {
  total: number;
}

export interface DiceApiLike {
  roll(
    formula: string,
    data?: Record<string, unknown>,
    options?: { rulesetId?: string; flavor?: string }
  ): Promise<DiceRollResult>;
  /** Rolls a whole d-pool as ONE Roll/one chat card and returns the faces. */
  rollPool(
    count: number,
    dieSize: number,
    options?: { rulesetId?: string; flavor?: string }
  ): Promise<number[]>;
}

/**
 * Hits: each d10 face **<= the Attack Value** is a hit (INX is roll-under, the
 * inverse of Simple Skirmish's roll-over). Cover is applied by the caller,
 * which passes the lower `attack.cover` value instead of `attack.clear`.
 */
export function countHits(faces: readonly number[], attackValue: number): number {
  return faces.reduce((hits, face) => (face <= attackValue ? hits + 1 : hits), 0);
}

/**
 * The Attack Total is the **sum of the hitting faces**, not their count
 * (rulebook D.1 worked example: 1,4,10 vs 7 -> 1+4 = 5). Missing faces
 * contribute nothing.
 */
export function attackTotal(faces: readonly number[], attackValue: number): number {
  return faces.reduce((total, face) => (face <= attackValue ? total + face : total), 0);
}

/**
 * Damage is the Attack Total plus the weapon's DMG, but only once at least one
 * hit landed. No hits means no damage, whatever the DMG.
 */
export function damageFrom(total: number, weaponDmg: number, hits: number): number {
  return hits > 0 ? total + weaponDmg : 0;
}

/**
 * Armor check: the target rolls its armor dice, adds the modifier, and the model
 * SURVIVES iff the total is **strictly greater** than the damage. A tie destroys
 * (rulebook H.3). The caller does not roll armor at all when there were no hits.
 */
export function survivesArmor(
  armorFaces: readonly number[],
  armorModifier: number,
  damage: number
): boolean {
  const total = armorFaces.reduce((sum, face) => sum + face, 0) + armorModifier;
  return total > damage;
}

export interface AttackResult {
  attackerFaces: number[];
  hits: number;
  attackTotal: number;
  damage: number;
  armorFaces: number[];
  armorTotal: number;
  destroyed: boolean;
}

export interface ResolveAttackParams {
  dice: DiceApiLike;
  /** Number of d10 the weapon throws (0D10 weapons auto-miss). */
  attackDice: number;
  /** Roll <= this to hit (pass `attack.cover` when the target is in cover). */
  attackValue: number;
  /** Added to the Attack Total once at least one hit lands. */
  weaponDmg: number;
  /** Number of d10 the target's armor throws. */
  armorDice: number;
  /** Added to the armor roll; survive on total > damage. */
  armorModifier: number;
  /** Prefixed onto the chat flavor so a played round reads as a sequence. */
  flavorPrefix?: string;
}

/**
 * One attack action against a single target model. Rolls the weapon's d10 pool,
 * counts hits and sums their faces, adds DMG, then -- only if something hit --
 * rolls the target's armor and compares. Every die is a separate `1d10` through
 * the shared dice API, so each face is read individually and Dice So Nice
 * animates each throw.
 */
export async function resolveAttack(params: ResolveAttackParams): Promise<AttackResult> {
  const { dice, attackDice, attackValue, weaponDmg, armorDice, armorModifier } = params;
  const prefix = params.flavorPrefix ? `${params.flavorPrefix} ` : "";

  const attackerFaces = await rollPool(dice, Math.max(0, attackDice), `${prefix}attack`);
  const hits = countHits(attackerFaces, attackValue);
  const total = attackTotal(attackerFaces, attackValue);
  const damage = damageFrom(total, weaponDmg, hits);

  if (hits === 0) {
    return {
      attackerFaces,
      hits,
      attackTotal: total,
      damage,
      armorFaces: [],
      armorTotal: 0,
      destroyed: false
    };
  }

  const armorFaces = await rollPool(dice, Math.max(0, armorDice), `${prefix}armor`);
  const armorTotal = armorFaces.reduce((sum, face) => sum + face, 0) + armorModifier;
  const destroyed = !survivesArmor(armorFaces, armorModifier, damage);

  return { attackerFaces, hits, attackTotal: total, damage, armorFaces, armorTotal, destroyed };
}

async function rollPool(
  dice: DiceApiLike,
  count: number,
  flavor: string
): Promise<number[]> {
  // One Roll for the whole pool -- one chat card, one Dice So Nice animation --
  // instead of N separate 1d10 rolls. The engine dice service reads the faces.
  return dice.rollPool(Math.max(0, count), INX_DIE_SIZE, { rulesetId: MODULE_ID, flavor });
}
