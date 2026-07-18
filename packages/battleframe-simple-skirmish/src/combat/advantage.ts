/**
 * Advantage points (QSR "Advantage Points"). Cover, height and fighting over
 * obstacles each grant points; **points on both sides cancel out**, and each
 * OVERALL NET point grants the right to alter one die result by one, own or
 * enemy.
 *
 * This module owns the two mechanical pieces: the net calculation and a single
 * die alteration. *Which* dice a player alters with their net points is a player
 * choice made at the table (Advanced Game), so it is not automated here -- the
 * same restraint GREATHELM applies to the choices its rules leave to a player.
 */

export interface AdvantageTally {
  attacker: number;
  defender: number;
}

export interface NetAdvantage {
  beneficiary: "attacker" | "defender" | "none";
  points: number;
}

/** The net advantage after both sides' points cancel. */
export function netAdvantage(tally: AdvantageTally): NetAdvantage {
  const diff = tally.attacker - tally.defender;

  if (diff > 0) {
    return { beneficiary: "attacker", points: diff };
  }

  if (diff < 0) {
    return { beneficiary: "defender", points: -diff };
  }

  return { beneficiary: "none", points: 0 };
}

/**
 * Alters a single die result by `direction` (+1 or -1), clamped to the die's
 * faces (1..dieSize). One net advantage point spends one such alteration.
 */
export function alterDie(roll: number, direction: 1 | -1, dieSize: number): number {
  return Math.min(dieSize, Math.max(1, roll + direction));
}
