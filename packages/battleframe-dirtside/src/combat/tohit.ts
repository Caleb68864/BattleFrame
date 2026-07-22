/**
 * Stage-1 — the opposed single-die to-hit (build plan §4, tasks A3–A5).
 *
 * Tier-1 GZG-family math: depends only on the Tier-0 `shift` atom and its own
 * args, no DSII data-model imports, so it extracts to the shared vehicle lib as a
 * move, not a rewrite. All lookup tables (fire-control base dice are geometry-ish
 * quality mappings; the signature→die table is USER-entered) carry no GZG data.
 */

import { shift, type DieType } from "../dice/ladder";

export type FireControl = "basic" | "enhanced" | "superior";

/** Fire-control quality → base firer die. A quality mapping, not GZG design data. */
const FIRE_CONTROL_BASE: Readonly<Record<FireControl, DieType>> = {
  basic: "d6",
  enhanced: "d8",
  superior: "d10",
};

/** Ladder order for die-type comparison (local; the atom file stays locked). */
const LADDER_ORDER: readonly DieType[] = ["d4", "d6", "d8", "d10", "d12"];
const rung = (die: DieType): number => LADDER_ORDER.indexOf(die);

/**
 * A3 — the firer die: fire-control base shifted by the range `step` (A2's
 * bandStep) and down one more if the firer moved over half its range. Returns
 * `null` when the shifts fall off the bottom of the ladder — DSII reads that as
 * an auto-miss. (Top-`null` never occurs at MVP shift ranges.)
 */
export function firerDie(
  fireControl: FireControl,
  step: number,
  movedOverHalf: boolean
): DieType | null {
  const base = FIRE_CONTROL_BASE[fireControl];
  return shift(base, step - (movedOverHalf ? 1 : 0));
}

/**
 * A4 — the target die: the better (higher on the ladder) of the target's
 * signature die (looked up in the USER `signature→die` table by effective
 * signature) and its best applicable posture secondary die. Returns `null` when
 * the signature is off the table and no posture secondary applies.
 */
export function targetDie(
  effSignature: number,
  postureSecondaries: readonly DieType[],
  sigTable: Readonly<Record<number, DieType>>
): DieType | null {
  const candidates: DieType[] = [];
  const primary = sigTable[effSignature];
  if (primary) {
    candidates.push(primary);
  }
  candidates.push(...postureSecondaries);

  if (candidates.length === 0) {
    return null;
  }
  return candidates.reduce((best, die) => (rung(die) > rung(best) ? die : best));
}

/**
 * A5 — the opposed compare: the firer HITS iff its single face strictly exceeds
 * the target's best defending face. A tie is a miss. No defending dice → the
 * firer auto-hits.
 */
export function resolveHit(firerFace: number, targetFaces: readonly number[]): boolean {
  return targetFaces.length === 0 || firerFace > Math.max(...targetFaces);
}
