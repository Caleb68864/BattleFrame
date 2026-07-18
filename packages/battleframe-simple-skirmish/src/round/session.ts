import { MODULE_ID } from "../constants";

export interface SkirmishUnit {
  id: string;
  playerId: string;
}

export interface InitiativeRoll {
  playerId: string;
  roll: number;
}

export class IllegalActivationError extends Error {
  constructor(message: string) {
    super(`${MODULE_ID} | ${message}`);
    this.name = "IllegalActivationError";
  }
}

/**
 * The first player of a round: highest initiative roll chooses to go first
 * (QSR "Order of Play"). Returns `null` on a tie so the caller re-rolls -- the
 * QSR does not resolve ties, so guessing a winner would invent a rule.
 */
export function determineFirstPlayer(rolls: readonly InitiativeRoll[]): string | null {
  let best: InitiativeRoll | undefined;
  let tied = false;

  for (const entry of rolls) {
    if (!best || entry.roll > best.roll) {
      best = entry;
      tied = false;
    } else if (entry.roll === best.roll) {
      tied = true;
    }
  }

  return best && !tied ? best.playerId : null;
}

export interface SkirmishRound {
  /** Whose turn it is to activate a unit, or undefined once every unit is activated. */
  activePlayerId(): string | undefined;
  /** Activates `unitId`; throws on an out-of-turn, repeat, or unknown activation. */
  activate(unitId: string): void;
  isActivated(unitId: string): boolean;
  /** The ids of `playerId`'s units that have not yet been activated this round. */
  unactivated(playerId: string): string[];
  /** True once every unit has been activated (the round is over). */
  isComplete(): boolean;
}

/**
 * One round of alternating activation (QSR "Turn"): players alternate, each turn
 * activating one of their own un-activated units, until every unit is
 * activated. Alternation is continuous -- a player with no un-activated units
 * left is skipped, and the other continues -- the same shape GREATHELM's battle
 * phase uses, minus the descending dice steps.
 */
export function createSkirmishRound(
  allUnits: readonly SkirmishUnit[],
  firstPlayerId: string
): SkirmishRound {
  const playerIds = orderedPlayers(allUnits, firstPlayerId);
  const unitById = new Map(allUnits.map((unit) => [unit.id, unit]));
  const activated = new Set<string>();
  let turnPointer = 0;

  function unactivated(playerId: string): string[] {
    return allUnits
      .filter((unit) => unit.playerId === playerId && !activated.has(unit.id))
      .map((unit) => unit.id);
  }

  function activePlayerId(): string | undefined {
    for (let step = 0; step < playerIds.length; step += 1) {
      const playerId = playerIds[(turnPointer + step) % playerIds.length];
      if (unactivated(playerId).length > 0) {
        return playerId;
      }
    }

    return undefined;
  }

  return {
    activePlayerId,
    isActivated: (unitId) => activated.has(unitId),
    unactivated,
    isComplete: () => activated.size === unitById.size,
    activate(unitId) {
      const unit = unitById.get(unitId);

      if (!unit) {
        throw new IllegalActivationError(`unknown unit: ${unitId}`);
      }

      if (activated.has(unitId)) {
        throw new IllegalActivationError(`unit ${unitId} is already activated this round`);
      }

      const expected = activePlayerId();

      if (unit.playerId !== expected) {
        throw new IllegalActivationError(
          `it is not ${unit.playerId}'s turn to activate (expected ${expected ?? "no one"})`
        );
      }

      activated.add(unitId);
      // Advance to the other side; activePlayerId() skips a side with nothing left.
      turnPointer = (playerIds.indexOf(unit.playerId) + 1) % playerIds.length;
    }
  };
}

function orderedPlayers(units: readonly SkirmishUnit[], firstPlayerId: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];

  for (const unit of units) {
    if (!seen.has(unit.playerId)) {
      seen.add(unit.playerId);
      order.push(unit.playerId);
    }
  }

  const index = order.indexOf(firstPlayerId);

  return index <= 0 ? order : [...order.slice(index), ...order.slice(0, index)];
}
