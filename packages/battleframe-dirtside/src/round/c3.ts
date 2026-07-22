/**
 * A11 — the flattened C3 (command & control) force state (build plan §3, §4).
 *
 * Pure transforms over a force-level C3 object (which the glue layer persists on
 * a Combat flag). Destroying a command ELEMENT ripples up to the whole FORCE —
 * the concrete proof of the two-tier bet (plan risk #4): every unit loses a
 * confidence level and the force is locked out of new offensives and rallying
 * until command is re-established.
 */

/** The confidence ladder, worst → best. -1 steps toward broken, +1 toward confident. */
export type Confidence = "broken" | "shaken" | "steady" | "confident";

const CONFIDENCE_ORDER: readonly Confidence[] = ["broken", "shaken", "steady", "confident"];

/** Steps a confidence level by `delta`, clamped at both ends of the ladder. */
export function stepConfidence(confidence: Confidence, delta: number): Confidence {
  const index = CONFIDENCE_ORDER.indexOf(confidence) + delta;
  const clamped = Math.max(0, Math.min(CONFIDENCE_ORDER.length - 1, index));
  return CONFIDENCE_ORDER[clamped];
}

export interface ForceC3 {
  units: Array<{ id: string; confidence: Confidence }>;
  /** Set once command is lost: no new offensive orders may be issued. */
  noNewOffensives: boolean;
  /** Set once command is lost: units may not attempt to rally. */
  noRally: boolean;
}

/**
 * The command-loss ripple: every unit in the force drops one confidence level
 * and the force is barred from new offensives and rallying. Returns a new force
 * object; does not mutate the input.
 */
export function applyCommandLoss(force: ForceC3): ForceC3 {
  return {
    units: force.units.map((unit) => ({
      ...unit,
      confidence: stepConfidence(unit.confidence, -1),
    })),
    noNewOffensives: true,
    noRally: true,
  };
}

export interface RallyResult {
  rallied: boolean;
  /** Confidence-level change on success (+1), else 0. */
  clDelta: number;
  /** A rally attempt ALWAYS costs the unit's activation, pass or fail. */
  spentActivation: boolean;
}

/**
 * A rally attempt: the unit's quality roll must strictly exceed
 * `ralliedLR + cmdLR` (the rallied unit's leadership bar plus the commanding
 * unit's). Success raises confidence one level; either way the activation is
 * spent.
 */
export function resolveRally(qualityRoll: number, ralliedLR: number, cmdLR: number): RallyResult {
  const rallied = qualityRoll > ralliedLR + cmdLR;
  return { rallied, clDelta: rallied ? 1 : 0, spentActivation: true };
}
