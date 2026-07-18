/**
 * The Command Phase: each side secretly picks a command choice, both reveal,
 * and the LOWER initiative number wins (INX goes low-first). CP gained that
 * round is the choice's control value; a couple of cards adjust it (Close Out
 * grants +2 CP to the side that loses initiative). CP never carries over.
 */

export interface CommandChoice {
  sideId: string;
  /** Lower wins. */
  initiative: number;
  /** Control Points granted this round. */
  control: number;
  /** Extra CP granted only if this side LOSES initiative (Close Out = 2). */
  bonusOnLosingInitiative?: number;
}

export type InitiativeOutcome = { winner: string } | { tie: true };

/**
 * The lower initiative wins. A shared lowest is a tie, which the caller breaks
 * with a d10 roll-off (rulebook B.1) -- returning a guessed winner would invent
 * a rule.
 */
export function resolveInitiative(choices: readonly CommandChoice[]): InitiativeOutcome {
  let best: CommandChoice | undefined;
  let tied = false;

  for (const choice of choices) {
    if (!best || choice.initiative < best.initiative) {
      best = choice;
      tied = false;
    } else if (choice.initiative === best.initiative) {
      tied = true;
    }
  }

  if (!best || tied) {
    return { tie: true };
  }
  return { winner: best.sideId };
}

/**
 * CP for a side this round: the choice's control value, plus its
 * losing-initiative bonus when `wonInitiative` is false. `wonInitiative` may be
 * omitted when no bonus is in play.
 */
export function controlPointsFor(choice: CommandChoice, wonInitiative?: boolean): number {
  const bonus = !wonInitiative && choice.bonusOnLosingInitiative ? choice.bonusOnLosingInitiative : 0;
  return choice.control + bonus;
}
