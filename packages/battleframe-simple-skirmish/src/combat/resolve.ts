import { BASIC_DIE_SIZE, MODULE_ID, type AttackType } from "../constants";

export interface DiceRollResult {
  total: number;
}

export interface DiceApiLike {
  roll(
    formula: string,
    data?: Record<string, unknown>,
    options?: { rulesetId?: string; flavor?: string }
  ): Promise<DiceRollResult>;
}

/**
 * Hits: a d6 roll **>= the attacker's Attack target** (QSR "Resolving Battle":
 * equal or greater is a hit).
 */
export function countHits(rolls: readonly number[], attackTarget: number): number {
  return rolls.reduce((hits, roll) => (roll >= attackTarget ? hits + 1 : hits), 0);
}

/**
 * Casualties from a set of save rolls: a d6 result **< the Save target** is one
 * casualty (QSR: "result lower than Save number = 1 casualty"). Lower Save is a
 * better save. A defender with no Save does not roll at all -- see
 * `resolveAttack`, which never calls this in that case.
 */
export function countUnsaved(saveRolls: readonly number[], saveTarget: number): number {
  return saveRolls.reduce((casualties, roll) => (roll < saveTarget ? casualties + 1 : casualties), 0);
}

export interface AttackResult {
  attackerRolls: number[];
  hits: number;
  defenderRolls: number[];
  casualties: number;
}

export interface ResolveAttackParams {
  dice: DiceApiLike;
  /** Attacking models: one attack die each (QSR: "rolls 1 die for each model"). */
  models: number;
  /** Roll >= this to hit. */
  attackTarget: number;
  /** Roll < this to be a casualty; null = no save, so every hit is a casualty. */
  saveTarget: number | null;
  type: AttackType;
  /**
   * Die faces to roll (default `BASIC_DIE_SIZE` = 6). Champions roll larger dice
   * (d8/d10/d12) for magical items -- the hit/save logic is unchanged, only the
   * die grows, because `countHits`/`countUnsaved` compare to a target regardless
   * of face count.
   */
  dieSize?: number;
  /** Prefixed onto the chat flavor so a played round reads as a sequence. */
  flavorPrefix?: string;
}

/**
 * One attack (Melee / Ranged / Magic -- resolved identically in the Basic
 * Game). Rolls the attacker's dice, counts hits, then rolls one save per hit
 * (unless there is no Save) and counts casualties.
 *
 * Each die is rolled through the shared `game.battleframe.dice` API as its own
 * `1d6`, never `Nd6` summed: the result is read by face (hit/miss, save/fail),
 * not by total, and per-die rolls are also what keep Dice So Nice animating.
 */
export async function resolveAttack(params: ResolveAttackParams): Promise<AttackResult> {
  const { dice, models, attackTarget, saveTarget, type } = params;
  const dieSize = params.dieSize ?? BASIC_DIE_SIZE;
  const prefix = params.flavorPrefix ? `${params.flavorPrefix} ` : "";

  const attackerRolls = await rollDice(dice, Math.max(0, models), dieSize, `${prefix}${type} attack`);
  const hits = countHits(attackerRolls, attackTarget);

  // No save means the roll is skipped entirely and every hit lands (QSR:
  // "Defender checks Save number (if any ...)"). Rolling zero-hit saves is also
  // skipped -- there is nothing to save against.
  if (saveTarget === null || hits === 0) {
    return { attackerRolls, hits, defenderRolls: [], casualties: saveTarget === null ? hits : 0 };
  }

  const defenderRolls = await rollDice(dice, hits, dieSize, `${prefix}${type} save`);
  const casualties = countUnsaved(defenderRolls, saveTarget);

  return { attackerRolls, hits, defenderRolls, casualties };
}

async function rollDice(
  dice: DiceApiLike,
  count: number,
  dieSize: number,
  flavor: string
): Promise<number[]> {
  const rolls: number[] = [];

  for (let index = 0; index < count; index += 1) {
    const result = await dice.roll(`1d${dieSize}`, {}, { rulesetId: MODULE_ID, flavor });
    rolls.push(result.total);
  }

  return rolls;
}
