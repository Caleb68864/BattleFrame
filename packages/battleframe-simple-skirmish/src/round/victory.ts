export interface VictoryUnit {
  playerId: string;
  isDestroyed: boolean;
}

export type VictoryOutcome =
  | { result: "winner"; playerId: string }
  | { result: "continue" }
  | { result: "draw" };

/**
 * The Basic Game deathmatch (QSR "Ending the Game"): "the loser is the first to
 * have no models remaining." A side is alive while any one of its units still
 * has models. One side alive -> it wins; both alive -> play on; neither alive ->
 * a draw, reported honestly rather than as a manufactured winner (the QSR does
 * not resolve a simultaneous wipe-out -- the same restraint GREATHELM applies to
 * its own unspecified cases).
 *
 * Pass units live-read (an `isDestroyed` snapshot per call), so a unit removed
 * between calls changes the outcome without any cached state.
 */
export function checkVictory(units: readonly VictoryUnit[]): VictoryOutcome {
  const aliveSides = new Set<string>();

  for (const unit of units) {
    if (!unit.isDestroyed) {
      aliveSides.add(unit.playerId);
    }
  }

  if (aliveSides.size === 1) {
    return { result: "winner", playerId: [...aliveSides][0] };
  }

  if (aliveSides.size === 0) {
    return { result: "draw" };
  }

  return { result: "continue" };
}
