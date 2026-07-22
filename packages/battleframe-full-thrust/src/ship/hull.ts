/**
 * The ship damage track: hull boxes arranged in rows, and the threshold
 * bookkeeping that completing a row triggers. Pure functions -- no Foundry, no
 * documents -- so the rules are testable in isolation. Rules numbers come from
 * ../constants (this file adds no rules constants of its own).
 *
 * Sources: FT2 "Ship Classes" (class by MASS), "Hull Boxes & Damage",
 * "Threshold Check".
 */

export type ShipClass = "escort" | "cruiser" | "capital";

/** FT2 class-by-MASS: escort <= 18, cruiser 19-36, capital 37+. */
export function shipClass(mass: number): ShipClass {
  if (mass <= 18) {
    return "escort";
  }
  if (mass <= 36) {
    return "cruiser";
  }
  return "capital";
}

/** Warship damage points = half the MASS, a half rounding up. */
export function warshipDamagePoints(mass: number): number {
  return Math.ceil(mass / 2);
}

/**
 * FT2 threshold rows by class: escort 2, cruiser 3, capital 4. The number of
 * threshold *checks* is one fewer -- completing the final row is destruction,
 * not a check.
 */
export function thresholdRows(cls: ShipClass): number {
  switch (cls) {
    case "escort":
      return 2;
    case "cruiser":
      return 3;
    case "capital":
      return 4;
  }
}

/**
 * Cumulative box counts at which each row completes. Uneven boxes go into the
 * UPPER rows first (Fleet Book), so 26 boxes over 4 rows is 7/7/6/6 ->
 * boundaries [7, 14, 20, 26]. The last entry equals `boxes` (destruction).
 */
export function rowBoundaries(boxes: number, rows: number): number[] {
  // A row count below 1 (a bad import / manual edit) would divide by zero and
  // yield NaN boundaries, permanently disabling threshold checks -- treat it as
  // a single row (the whole track completes at once).
  const safeRows = rows >= 1 ? Math.floor(rows) : 1;
  const base = Math.floor(boxes / safeRows);
  const extra = boxes % safeRows;

  const boundaries: number[] = [];
  let cumulative = 0;
  for (let r = 0; r < safeRows; r++) {
    cumulative += base + (r < extra ? 1 : 0);
    boundaries.push(cumulative);
  }
  return boundaries;
}

export interface ApplyHullDamageParams {
  damageBefore: number;
  incoming: number;
  boxes: number;
  rows: number;
}

export interface HullDamageResult {
  /** Total boxes now crossed off (clamped to `boxes`). */
  damage: number;
  /** True once every box is gone -- the ship is removed from play. */
  destroyed: boolean;
  /**
   * Threshold numbers (1-indexed by row) whose boundary was passed by THIS
   * attack, excluding the final-row boundary (which is destruction). Empty when
   * no interior row completed. Used to drive the threshold check.
   */
  thresholdsCrossed: number[];
}

/**
 * Applies `incoming` damage points to the hull track, reporting the new damage,
 * whether the ship is destroyed, and which interior thresholds were crossed on
 * the way (for the threshold check). Damage is clamped at the box count.
 */
export function applyHullDamage(params: ApplyHullDamageParams): HullDamageResult {
  const { damageBefore, incoming, boxes, rows } = params;

  const damage = Math.min(damageBefore + incoming, boxes);
  const destroyed = damage >= boxes;

  const boundaries = rowBoundaries(boxes, rows);
  const thresholdsCrossed: number[] = [];
  // Interior boundaries only: index 0..rows-2. The last (index rows-1, == boxes)
  // is destruction, never a threshold check.
  for (let i = 0; i < boundaries.length - 1; i++) {
    const boundary = boundaries[i];
    if (damageBefore < boundary && boundary <= damage) {
      thresholdsCrossed.push(i + 1);
    }
  }

  return { damage, destroyed, thresholdsCrossed };
}
