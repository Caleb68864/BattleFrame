import { MODULE_ID } from "../constants";

/**
 * A10 — one round of alternating UNIT activation (build plan §4, §7).
 *
 * Iteration is over `dirtside-ii.unit` grouping actors, NOT elements — the
 * activation loop walks units while fire (later) resolves the elements beneath
 * them (the two-tier bet, plan risk #4). This extends Simple Skirmish's
 * `createSkirmishRound` base loop (alternate, skip an exhausted side, restore
 * from a serialized flag) with two DSII policies kept as ruleset rules, never
 * engine: the fewer-units side chooses first (`firstChooser`), and a side may
 * pass only while outnumbered in remaining activations (`canPass`/`pass`).
 *
 * State lives on the Combat document (a flag) via serialize/restore — never a
 * module-scoped variable — so a round survives reload and syncs to clients.
 */

export interface DirtsideUnit {
  id: string;
  playerId: string;
  /** Live query — true once the unit is destroyed. Re-read every call. */
  isDestroyed?: () => boolean;
}

export class IllegalActivationError extends Error {
  constructor(message: string) {
    super(`${MODULE_ID} | ${message}`);
    this.name = "IllegalActivationError";
  }
}

export interface DirtsideRoundState {
  firstPlayerId: string;
  activatedIds: string[];
  /** Index into the ordered sides — whose turn is next. */
  turnPointer: number;
}

export interface DirtsideRound {
  /** Whose turn to activate, or undefined once every unit is resolved. */
  activePlayerId(): string | undefined;
  /** Activates `unitId`; throws on out-of-turn, repeat, or unknown activation. */
  activate(unitId: string): void;
  /** Yields the turn without spending a unit; throws when passing is illegal. */
  pass(playerId: string): void;
  /** True when `playerId` may pass: it is their turn AND they are outnumbered. */
  canPass(playerId: string): boolean;
  isActivated(unitId: string): boolean;
  /** The ids of `playerId`'s units not yet activated this round. */
  unactivated(playerId: string): string[];
  isComplete(): boolean;
  serialize(): DirtsideRoundState;
}

/**
 * The side that chooses who activates first: the one with FEWER un-destroyed
 * units on the table. Returns `null` on a tie so the caller rolls off (guessing
 * a winner would invent a rule — same discipline as `determineFirstPlayer`).
 */
export function firstChooser(units: readonly DirtsideUnit[]): string | null {
  const counts = new Map<string, number>();
  for (const unit of units) {
    if (unit.isDestroyed?.() === true) {
      continue;
    }
    counts.set(unit.playerId, (counts.get(unit.playerId) ?? 0) + 1);
  }

  let best: { playerId: string; count: number } | undefined;
  let tied = false;
  for (const [playerId, count] of counts) {
    if (!best || count < best.count) {
      best = { playerId, count };
      tied = false;
    } else if (count === best.count) {
      tied = true;
    }
  }

  return best && !tied ? best.playerId : null;
}

export function createDirtsideRound(
  allUnits: readonly DirtsideUnit[],
  firstPlayerId: string,
  initial?: { activatedIds?: readonly string[]; turnPointer?: number }
): DirtsideRound {
  const playerIds = orderedPlayers(allUnits, firstPlayerId);
  const unitById = new Map(allUnits.map((unit) => [unit.id, unit]));
  const activated = new Set<string>(initial?.activatedIds ?? []);
  let turnPointer = initial?.turnPointer ?? 0;

  const isDestroyed = (unit: DirtsideUnit): boolean => unit.isDestroyed?.() === true;
  const isResolved = (unit: DirtsideUnit): boolean => activated.has(unit.id) || isDestroyed(unit);

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

  /** Un-activated units controlled by everyone EXCEPT `playerId` (the opponent). */
  function opponentUnactivated(playerId: string): number {
    return playerIds
      .filter((id) => id !== playerId)
      .reduce((sum, id) => sum + unactivated(id).length, 0);
  }

  function yieldTurn(fromPlayerId: string): void {
    turnPointer = (playerIds.indexOf(fromPlayerId) + 1) % playerIds.length;
  }

  function canPass(playerId: string): boolean {
    if (activePlayerId() !== playerId) {
      return false;
    }
    return unactivated(playerId).length < opponentUnactivated(playerId);
  }

  return {
    activePlayerId,
    isActivated: (unitId) => activated.has(unitId),
    unactivated,
    canPass,
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
      yieldTurn(unit.playerId);
    },
    pass(playerId) {
      if (activePlayerId() !== playerId) {
        throw new IllegalActivationError(`it is not ${playerId}'s turn to pass`);
      }
      if (!canPass(playerId)) {
        throw new IllegalActivationError(
          `${playerId} may not pass without fewer un-activated units than the opponent`
        );
      }
      yieldTurn(playerId);
    },
    serialize: () => ({
      firstPlayerId,
      activatedIds: [...activated],
      turnPointer,
    }),
  };
}

export function restoreDirtsideRound(
  allUnits: readonly DirtsideUnit[],
  state: DirtsideRoundState
): DirtsideRound {
  return createDirtsideRound(allUnits, state.firstPlayerId, {
    activatedIds: state.activatedIds,
    turnPointer: state.turnPointer,
  });
}

function orderedPlayers(units: readonly DirtsideUnit[], firstPlayerId: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const unit of units) {
    if (!seen.has(unit.playerId)) {
      seen.add(unit.playerId);
      order.push(unit.playerId);
    }
  }

  const index = order.indexOf(firstPlayerId);
  // Fail loud rather than silently starting the wrong side.
  if (index < 0) {
    throw new IllegalActivationError(
      `firstPlayerId "${firstPlayerId}" controls none of the units in this round`
    );
  }
  return index === 0 ? order : [...order.slice(index), ...order.slice(0, index)];
}
