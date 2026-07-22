/**
 * The Tier-0 die-ladder shift atom — a neutral polyhedral-die primitive with no
 * game meaning of its own. LOCKED cross-module contract: this file is identical,
 * byte-for-byte, to the Dirtside module's `src/dice/ladder.ts`, so the eventual
 * promotion to the engine `dice` service (`dice.shift`) is a one-line swap.
 *
 * Keep this file ruleset-free — no Stargrunt II vocabulary in any signature.
 */

export type DieType = "d4" | "d6" | "d8" | "d10" | "d12";

/** The ordered ladder, lowest to highest. */
const LADDER: readonly DieType[] = ["d4", "d6", "d8", "d10", "d12"];

/**
 * Move `die` up (`steps > 0`) or down (`steps < 0`) the type ladder by `steps`
 * rungs. Returns the resulting die type, or `null` when the shift steps off
 * EITHER end (symmetric). Does NOT clamp — "off an end" is `null` so each caller
 * reads it its own way (`shift(...) ?? cap` to clamp; treat `null` as impossible
 * to make it a hard stop).
 */
export function shift(die: DieType, steps: number): DieType | null {
  const index = LADDER.indexOf(die);
  if (index < 0) {
    return null;
  }
  const target = index + steps;
  if (target < 0 || target >= LADDER.length) {
    return null;
  }
  return LADDER[target];
}

export interface OpposedShiftResult {
  actor: DieType;
  opponent: DieType;
}

/**
 * An open (opposed) shift — SG2-side; composes the Tier-0 `shift` atom, and is
 * NOT part of the shared cross-module contract. When the actor's shift stays on
 * the ladder the opponent is untouched. When it overflows an end, the actor is
 * pinned at the cap it hit and every overflowed rung becomes an equal-and-
 * OPPOSITE shift on the opponent's die (a top overflow pushes the opponent down;
 * a bottom overflow pushes it up). A transferred shift that would itself overflow
 * clamps the opponent at its cap.
 *
 * DESIGN FINDING (docs/decisions.md): the 1:1 overflow→opponent transfer ratio
 * is the clean neutral mechanism; the build plan's worked example was internally
 * inconsistent about the ratio. Reconcile against the GZG worked example before
 * the (post-MVP) Impact-vs-Armour and close-combat paths consume this.
 */
export function opposedShift(
  actorDie: DieType,
  actorSteps: number,
  opponentDie: DieType
): OpposedShiftResult {
  const moved = shift(actorDie, actorSteps);
  if (moved !== null) {
    return { actor: moved, opponent: opponentDie };
  }

  const index = LADDER.indexOf(actorDie);
  const target = index + actorSteps;

  if (target >= LADDER.length) {
    // Off the top: actor pins at d12, opponent shifts down by the overflow.
    const overflow = target - (LADDER.length - 1);
    const actor = LADDER[LADDER.length - 1];
    const opponent = shift(opponentDie, -overflow) ?? LADDER[0];
    return { actor, opponent };
  }

  // Off the bottom: actor pins at d4, opponent shifts up by the overflow.
  const overflow = -target;
  const actor = LADDER[0];
  const opponent = shift(opponentDie, overflow) ?? LADDER[LADDER.length - 1];
  return { actor, opponent };
}
