/**
 * Tier-0 shared die-ladder atom (build plan §6, §7).
 *
 * LOCKED cross-module contract — this file is built byte-for-byte identically in
 * the Stargrunt II module. Keep the signature ruleset-free: it is the leading
 * candidate for promotion to the engine `dice` service (`dice.shift`) once both
 * MVPs land (two witnesses: DSII vehicles + SG2 infantry, both `d4↔d12` ladders).
 *
 * Lowercase `dN` is mandatory so a rung drops straight into a Foundry
 * `Roll("1d10")` formula. `null` off EITHER end, NO clamping — clamp-vs-impossible
 * is a caller-side decision (DSII reads bottom-null as auto-miss; a future
 * stacked-shift call site caps the top with `?? "d12"`).
 */

export type DieType = "d4" | "d6" | "d8" | "d10" | "d12";

const LADDER: readonly DieType[] = ["d4", "d6", "d8", "d10", "d12"];

/**
 * Walks the ladder `d4↔d6↔d8↔d10↔d12` by `steps` rungs. Returns the resulting
 * die, or `null` when the step leaves the ladder at either end. Does not clamp.
 */
export function shift(die: DieType, steps: number): DieType | null {
  const index = LADDER.indexOf(die) + steps;
  return LADDER[index] ?? null;
}
