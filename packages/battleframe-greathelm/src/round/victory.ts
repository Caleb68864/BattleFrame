/**
 * The quickstart's game-end check. QSR p2, verbatim:
 *
 * > **round and game ends**
 * > If only one player has knights remaining in the play area, they win! If
 * > not, start a new round from the initiative phase.
 *
 * That one sentence is both the victory condition and the round loop, which is
 * why they live in the same module.
 *
 * ## Scope -- read before extending this
 *
 * This is the **quickstart's scenario only**, not GREATHELM's scoring system.
 * QSR p1 says so outright: "a simple scenario objective: Last man standing!".
 * There is no VP, no objective, and no round limit in the QSR, and the full
 * game evidently has all three (Goonhammer: "Each scenario will tell you how
 * many rounds to play"). **Do not design scoring from this module.** See
 * `vault/greathelm/victory-condition-quickstart.md`.
 */
import type { CheckVictoryKnight, VictoryOutcome } from "./victory-types";

export type { CheckVictoryKnight, VictoryOutcome } from "./victory-types";

/**
 * Which players still have at least one knight in the play area.
 *
 * A knight leaves by damage (3 markers) or by fleeing a failed courage test.
 * QSR p2 treats both identically; `round/removal.ts` is where that lives, and
 * callers are expected to build `isRemoved` from it (see
 * `round-control.toVictoryKnights`). This module only counts.
 *
 * Knights with no `isRemoved` are in play, matching `RoundSessionKnight`'s
 * default -- which makes a caller that forgets to supply one read as "nobody
 * has been removed" rather than failing. That is exactly how victory came to
 * be unreachable once; `toVictoryKnights` exists so no caller hand-rolls it.
 */
function playersWithKnightsRemaining(
  knights: readonly CheckVictoryKnight[]
): string[] {
  const remaining = new Set<string>();

  for (const knight of knights) {
    if (!knight.isRemoved?.()) {
      remaining.add(knight.playerId);
    }
  }

  return [...remaining];
}

/**
 * Applies the QSR p2 game-end check. Checked **after the courage phase**, once
 * per round -- not mid-round, because a knight removed mid-round can still be
 * the last one standing when a later courage test removes an opponent.
 *
 * Three outcomes, and the third is not a rule:
 *
 * - `winner` -- exactly one player has knights left. The documented case.
 * - `continue` -- more than one player has knights. "Start a new round from
 *   the initiative phase."
 * - `mutual-elimination-unresolved` -- **nobody** has knights left. The QSR is
 *   phrased "only one player has knights remaining", so a mutual wipe-out is
 *   not a win for either side, and the rulebook does not say what it is.
 *   `not found` in QSR v0.4.
 *
 * The third case returns a distinct outcome rather than guessing a draw, for
 * the same reason `determineInitiative` returns `"tie"` rather than picking a
 * winner: inventing a rule and presenting it as GREATHELM's is worse than
 * saying the rulebook is silent. The caller surfaces it; it does not decide it.
 */
export function checkVictory(
  knights: readonly CheckVictoryKnight[]
): VictoryOutcome {
  const remaining = playersWithKnightsRemaining(knights);

  if (remaining.length === 1) {
    return { result: "winner", playerId: remaining[0] as string };
  }

  if (remaining.length === 0) {
    return { result: "mutual-elimination-unresolved" };
  }

  return { result: "continue" };
}
