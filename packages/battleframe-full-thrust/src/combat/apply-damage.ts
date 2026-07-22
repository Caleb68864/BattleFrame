/**
 * Applies damage to a target ship and runs the threshold check that a completed
 * hull row triggers -- the shared tail of every attack, whether it came from a
 * ship's weapons or a fighter group. Extracted so both firing orchestrators use
 * one implementation. The dice pool is injected.
 *
 * Source: FT2 "Threshold Check".
 */

import { DIE_SIZE } from "../constants";
import { applyDamageToShip, type ShipActorLike } from "../data/ship-state";
import { thresholdKillOn, knockedOutIndices } from "../ship/threshold";
import { enumerateSurvivingSystems, applySystemKnockouts } from "../ship/systems";

export interface ThresholdDiceLike {
  rollPool: (count: number, dieSize: number, options?: unknown) => Promise<number[]>;
}

export interface ApplyDamageAndThresholdResult {
  destroyed: boolean;
  thresholdsCrossed: number[];
  systemsKnockedOut: number;
}

export async function applyDamageAndThreshold(
  target: ShipActorLike & { system?: Record<string, any> },
  points: number,
  dice: ThresholdDiceLike
): Promise<ApplyDamageAndThresholdResult> {
  const damageResult = await applyDamageToShip(target, points);
  const thresholdsCrossed = damageResult.hull.thresholdsCrossed;

  let systemsKnockedOut = 0;
  if (!damageResult.destroyed && thresholdsCrossed.length > 0) {
    const worst = Math.max(...thresholdsCrossed);
    const extra = thresholdsCrossed.length - 1;
    const killOn = thresholdKillOn(worst, extra);

    const refs = enumerateSurvivingSystems(target.system ?? {});
    if (refs.length > 0) {
      const faces = await dice.rollPool(refs.length, DIE_SIZE);
      const lostRefs = knockedOutIndices(faces, killOn).map((i) => refs[i]);
      systemsKnockedOut = lostRefs.length;
      if (lostRefs.length > 0) {
        await target.update(applySystemKnockouts(target.system ?? {}, lostRefs));
      }
    }
  }

  return { destroyed: damageResult.destroyed, thresholdsCrossed, systemsKnockedOut };
}
