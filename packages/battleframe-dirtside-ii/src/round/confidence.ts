/**
 * A8 — the confidence (morale) test: roll a quality die and compare to a bar.
 * (Build plan §4; a two-witness engine `dice.check` candidate alongside
 * GREATHELM's courage test — kept as a neutral `(roll, threshold) → {pass, band}`
 * shape so promotion is a move, not a rewrite.)
 */

export interface ConfidenceResult {
  /** True when the roll beat the bar. */
  pass: boolean;
  /** Confidence-level change: 0 pass, -1 fail, -2 bad fail. */
  clDelta: number;
}

/**
 * bar = `leadership + threat`. `threat` is the SINGLE highest threat in play
 * (the caller selects it; this never sums threats). Roll strictly above the bar
 * passes with no change; roll at-or-below the bar fails and drops one confidence
 * level; roll at-or-below half the bar is a bad fail and drops two.
 */
export function confidenceTest(roll: number, leadership: number, threat: number): ConfidenceResult {
  const bar = leadership + threat;
  if (roll > bar) {
    return { pass: true, clDelta: 0 };
  }
  if (roll <= bar / 2) {
    return { pass: false, clDelta: -2 };
  }
  return { pass: false, clDelta: -1 };
}
