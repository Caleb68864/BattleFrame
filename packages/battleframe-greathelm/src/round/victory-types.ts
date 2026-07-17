/** A knight as the game-end check needs it: whose it is, and whether it is still in play. */
export interface CheckVictoryKnight {
  playerId: string;
  /** Live query, matching `RoundSessionKnight`. Absent means "in play". */
  isRemoved?: () => boolean;
}

export type VictoryOutcome =
  /** Exactly one player has knights left. QSR p2: "they win!". */
  | { result: "winner"; playerId: string }
  /** More than one player has knights. QSR p2: "start a new round from the initiative phase." */
  | { result: "continue" }
  /**
   * Nobody has knights left. **Not a rule** -- QSR v0.4 says "only one player
   * has knights remaining", which a mutual wipe-out is not, and the rulebook
   * does not address it. Surfaced, never guessed at.
   */
  | { result: "mutual-elimination-unresolved" };
