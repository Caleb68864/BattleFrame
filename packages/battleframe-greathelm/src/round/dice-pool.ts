import {
  DICE_POOL_PER_KNIGHT_BONUS,
  MIN_DICE_POOL_FLOOR,
} from "../constants";

/**
 * Pool size = knights currently in play + 1, optionally floored at
 * `MIN_DICE_POOL_FLOOR` when the (off-by-default) Kickstarter-only
 * setting is enabled. See constants.ts for provenance of both numbers.
 */
export function computeDicePoolSize(
  knightsInPlay: number,
  minFloorEnabled: boolean
): number {
  const base = Math.max(0, knightsInPlay) + DICE_POOL_PER_KNIGHT_BONUS;

  if (minFloorEnabled) {
    return Math.max(base, MIN_DICE_POOL_FLOOR);
  }

  return base;
}

export interface RolledDie {
  face: number;
}

/**
 * Counts of each face value 1-6 within a rolled pool. Index 0 is unused so
 * that `counts[6]` reads as "how many 6s".
 */
export function countFaces(dice: readonly RolledDie[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];

  for (const die of dice) {
    if (die.face >= 1 && die.face <= 6) {
      counts[die.face] += 1;
    }
  }

  return counts;
}

export type InitiativeOutcome =
  | { result: "choose"; playerId: string }
  | { result: "forced-first"; playerId: string }
  | { result: "tie" };

/**
 * Determines initiative between exactly two players' rolled pools, per QSR
 * p1: most 6s chooses first/second; if neither has 6s, compare 5s, then
 * 4s, and so on; if only one player has any 6s, that player is FORCED to
 * go first (no choice). Source:
 * vault/greathelm/initiative-order-determination.md.
 *
 * Exact ties (equal counts at every face) are NOT specified in QSR v0.4 --
 * this is a genuinely open question (see
 * vault/greathelm/open-questions.md #15). This function returns
 * `{ result: "tie" }` rather than guessing; callers are expected to
 * re-roll on a tie. That re-roll-on-tie behavior is an INVENTED HOUSE
 * RULE, not a rule from the rulebook -- see the "Decisions (SS-10)" note
 * in docs/specs/2026-07-16-battleframe-core-mvp.md and the entry recorded
 * in vault/greathelm/open-questions.md.
 */
export function determineInitiative(
  playerAId: string,
  playerADice: readonly RolledDie[],
  playerBId: string,
  playerBDice: readonly RolledDie[]
): InitiativeOutcome {
  const countsA = countFaces(playerADice);
  const countsB = countFaces(playerBDice);

  for (let face = 6; face >= 1; face -= 1) {
    const a = countsA[face];
    const b = countsB[face];

    // Equal counts at this face -- whether both zero or both the same nonzero
    // number -- decide nothing; descend to the next face. A full tie (equal at
    // every face, all the way down) falls out of the loop to `{ result: "tie" }`.
    if (a === b) {
      continue;
    }

    const winner = a > b ? playerAId : playerBId;
    const winnerSixes = a > b ? countsA[6] : countsB[6];
    const loserSixes = a > b ? countsB[6] : countsA[6];

    if (face === 6 && winnerSixes > 0 && loserSixes === 0) {
      return { result: "forced-first", playerId: winner };
    }

    return { result: "choose", playerId: winner };
  }

  return { result: "tie" };
}
