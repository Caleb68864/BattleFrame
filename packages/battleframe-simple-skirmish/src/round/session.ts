import { MODULE_ID } from "../constants";

export interface SkirmishUnit {
  id: string;
  playerId: string;
  /**
   * Live query -- true once the unit is destroyed (0 models). A destroyed unit
   * neither needs activation nor can be activated, so the round treats it as
   * already resolved. Optional; absent means "still on the table", the shape the
   * pure activation tests use. Re-read every call, never snapshotted, the same
   * discipline as GREATHELM's `isRemoved`.
   */
  isDestroyed?: () => boolean;
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

/**
 * A round's serializable state -- everything needed to reconstruct the round
 * machine. This is what lives on the `Combat` document (a flag), so a round
 * survives a reload and syncs to other clients instead of dying with a
 * module-scoped variable.
 */
export interface SkirmishRoundState {
  firstPlayerId: string;
  activatedIds: string[];
  /** Index into the ordered sides -- whose turn is next. */
  turnPointer: number;
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
  /** The state to persist on the Combat document; restore with `restoreSkirmishRound`. */
  serialize(): SkirmishRoundState;
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
  firstPlayerId: string,
  initial?: { activatedIds?: readonly string[]; turnPointer?: number }
): SkirmishRound {
  const playerIds = orderedPlayers(allUnits, firstPlayerId);
  const unitById = new Map(allUnits.map((unit) => [unit.id, unit]));
  const activated = new Set<string>(initial?.activatedIds ?? []);
  let turnPointer = initial?.turnPointer ?? 0;

  const isDestroyed = (unit: SkirmishUnit): boolean => unit.isDestroyed?.() === true;

  /** A unit is "resolved" once activated OR destroyed -- either way it needs no turn. */
  const isResolved = (unit: SkirmishUnit): boolean => activated.has(unit.id) || isDestroyed(unit);

  function unactivated(playerId: string): string[] {
    return allUnits
      .filter((unit) => unit.playerId === playerId && !isResolved(unit))
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
    isComplete: () => allUnits.every(isResolved),
    activate(unitId) {
      const unit = unitById.get(unitId);

      if (!unit) {
        throw new IllegalActivationError(`unknown unit: ${unitId}`);
      }

      if (activated.has(unitId)) {
        throw new IllegalActivationError(`unit ${unitId} is already activated this round`);
      }

      if (isDestroyed(unit)) {
        throw new IllegalActivationError(`unit ${unitId} is destroyed and cannot be activated`);
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
    },
    serialize: () => ({
      firstPlayerId,
      activatedIds: [...activated],
      turnPointer
    })
  };
}

/**
 * Rebuilds a round from the state persisted on the Combat document. The inverse
 * of `SkirmishRound#serialize` -- the round machine is stateless between control
 * clicks; its state lives on the document and is restored here each time.
 */
export function restoreSkirmishRound(
  allUnits: readonly SkirmishUnit[],
  state: SkirmishRoundState
): SkirmishRound {
  return createSkirmishRound(allUnits, state.firstPlayerId, {
    activatedIds: state.activatedIds,
    turnPointer: state.turnPointer
  });
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

  // Fail loud rather than silently starting with the wrong side: a `firstPlayerId`
  // that names no unit's player (a typo, or a stale initiative winner from a
  // prior round) is a caller bug, and `indexOf` returning -1 would otherwise be
  // treated identically to index 0 -- a plausible-but-wrong turn order.
  if (index < 0) {
    throw new IllegalActivationError(
      `firstPlayerId "${firstPlayerId}" controls none of the units in this round`
    );
  }

  return index === 0 ? order : [...order.slice(index), ...order.slice(0, index)];
}
