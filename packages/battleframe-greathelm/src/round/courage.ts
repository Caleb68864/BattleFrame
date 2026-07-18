import { MODULE_ID } from "../constants";
import type { DiceApiLike } from "../combat/clash";

export type { DiceApiLike };

export interface CourageKnight {
  id: string;
  ownerId: string;
  damage: number;
  inBaseContactWithEnemy: boolean;
}

export interface WarbandDamageState {
  playerId: string;
  totalDamage: number;
  knightsRemaining: number;
}

/**
 * QSR p2: "Any damaged knight in base contact with an enemy must take a
 * courage test." Both conditions are required -- an undamaged knight
 * never tests, and a damaged knight standing alone never tests (see
 * vault/greathelm/courage-phase.md).
 */
export function knightsRequiringCourageTest(
  knights: readonly CourageKnight[]
): CourageKnight[] {
  return knights.filter((knight) => knight.damage >= 1 && knight.inBaseContactWithEnemy);
}

export function summarizeWarbandDamage(
  playerId: string,
  knights: readonly CourageKnight[]
): WarbandDamageState {
  return {
    playerId,
    totalDamage: knights.reduce((sum, knight) => sum + knight.damage, 0),
    knightsRemaining: knights.length,
  };
}

/**
 * QSR p2, verbatim: "The player with the most total damage markers on
 * their knights takes all of their tests first. If tied, player with
 * fewest remaining knights tests first." Total damage is counted across
 * the whole warband, not just the testing knights.
 */
export function determineCourageTestOrder(
  warbands: readonly WarbandDamageState[]
): string[] {
  return [...warbands]
    .sort((a, b) => {
      if (b.totalDamage !== a.totalDamage) {
        return b.totalDamage - a.totalDamage;
      }

      return a.knightsRemaining - b.knightsRemaining;
    })
    .map((warband) => warband.playerId);
}

/**
 * QSR p2 difficulty formula: +1 per allied knight removed from play,
 * +1 per damage marker on the testing knight.
 */
export function courageDifficulty(
  alliedKnightsRemovedFromPlay: number,
  damageOnKnight: number
): number {
  return Math.max(0, alliedKnightsRemovedFromPlay) + Math.max(0, damageOnKnight);
}

export interface CourageTestOutcome {
  roll: number;
  difficulty: number;
  passed: boolean;
}

/**
 * QSR p2: roll >= difficulty passes; a natural 6 always passes
 * regardless of difficulty.
 */
export function evaluateCourageRoll(roll: number, difficulty: number): CourageTestOutcome {
  return { roll, difficulty, passed: roll === 6 || roll >= difficulty };
}

export async function runCourageTest(
  dice: DiceApiLike,
  knight: CourageKnight,
  alliedKnightsRemovedFromPlay: number
): Promise<CourageTestOutcome> {
  const difficulty = courageDifficulty(alliedKnightsRemovedFromPlay, knight.damage);
  const result = await dice.roll(
    "1d6",
    {},
    { rulesetId: MODULE_ID, flavor: `courage test (${knight.id})` }
  );

  return evaluateCourageRoll(result.total, difficulty);
}

/**
 * Runs the courage phase in full: only damaged + in-contact knights test
 * (knightsRequiringCourageTest), the losing-most-damaged player tests
 * first (determineCourageTestOrder), and a failed test raises the
 * difficulty for that same player's remaining tests this phase -- a
 * fleeing knight is "removed from play" immediately (QSR p2), and removal
 * is one of the two inputs to the next test's difficulty. See the
 * "cascade" note in vault/greathelm/courage-test.md.
 */
export async function runCouragePhase(
  dice: DiceApiLike,
  warbandsKnights: ReadonlyMap<string, readonly CourageKnight[]>,
  initialAlliedRemoved: ReadonlyMap<string, number> = new Map()
): Promise<Map<string, CourageTestOutcome>> {
  // Test order is computed from the *whole* warband -- QSR p2 counts total
  // damage markers on all of a player's knights and, on a tie, all of their
  // remaining knights. Filtering to testers here would hide damage on knights
  // that are out of base contact. Only the tests themselves are filtered.
  const warbands = [...warbandsKnights.entries()].map(([playerId, knights]) =>
    summarizeWarbandDamage(playerId, knights)
  );
  const order = determineCourageTestOrder(warbands);
  const outcomes = new Map<string, CourageTestOutcome>();

  for (const playerId of order) {
    const testers = knightsRequiringCourageTest(warbandsKnights.get(playerId) ?? []);
    let removed = initialAlliedRemoved.get(playerId) ?? 0;

    for (const knight of testers) {
      const outcome = await runCourageTest(dice, knight, removed);
      outcomes.set(knight.id, outcome);

      if (!outcome.passed) {
        removed += 1;
      }
    }
  }

  return outcomes;
}
