import { shift, type DieType } from "../dice/ladder";

/**
 * B6 — the Range Die a target rolls, derived from the firer-to-target distance.
 *
 * The band size (in inches) is the Quality-die type number (`"d8"` -> 8"). The
 * number of whole-or-part bands to the target picks the base Range Die:
 *   band 1 -> d4, 2 -> d6, 3 -> d8, 4 -> d10, 5 -> d12, > 5 -> impossible.
 * Cover (`coverShift`: soft = 1, hard = 2) and In-Position (+1) then shift that
 * die UP the ladder via the Tier-0 `shift` atom — a bigger Range Die is harder
 * for the firer to beat. A shift that steps past d12 makes the shot impossible.
 *
 * `distanceInches` is consumed from `measure.between(firer, target).distance` by
 * the UI glue; this function is pure and Foundry-free.
 */
export type RangeDie = DieType | "impossible";

const BAND_TO_DIE: readonly DieType[] = ["d4", "d6", "d8", "d10", "d12"];

/** The face count of a die type, e.g. `"d8"` -> 8. Used as the band size. */
function dieFaces(die: DieType): number {
  return Number(die.slice(1));
}

export function rangeDieFromDistance(
  distanceInches: number,
  qualityDie: DieType,
  coverShift: number,
  inPosition: boolean
): RangeDie {
  const bandSize = dieFaces(qualityDie);
  const bands = Math.max(1, Math.ceil(distanceInches / bandSize));

  if (bands > BAND_TO_DIE.length) {
    return "impossible";
  }

  const baseDie = BAND_TO_DIE[bands - 1];
  const totalShift = coverShift + (inPosition ? 1 : 0);
  const shifted = shift(baseDie, totalShift);

  return shifted ?? "impossible";
}
