/**
 * The remaining specialised fighter types (More Thrust), as pure math. Heavy
 * (Level-1 screen), Interceptor (+1/die dogfight) and Long-Range (endurance 5)
 * already live in `fighters.ts`/`dogfight.ts`, and Attack's +1/die vs ships is
 * applied in `fire-fighters.ts`; this file adds the still-missing pieces:
 *
 *   - Fast: the 18mu movement allowance (a number for a movement orchestrator).
 *   - Torpedo: the one-shot anti-ship torpedo attack run (to-hit + damage).
 *   - the Attack/spent-Torpedo reduced dogfight kill table (only a 6, one kill).
 *
 * A Foundry orchestrator (who moves, when the torpedo is spent) is out of scope --
 * these are the numbers/predicates it would call.
 *
 * Source: More Thrust "Specialised Fighter Types"; "Fighter-to-Fighter Combat".
 */
import { requireRules } from "../rules-profile";

/** A group's movement allowance (mu): Fast moves 18, every other type the standard 12. */
export function fighterMoveForType(fighterType?: string): number {
  return fighterType === "fast" ? requireRules().fighterMoveFastMu : requireRules().fighterMoveMu;
}

/**
 * Torpedo attack run, step 1: one to-hit die per fighter, each a hit on 4+.
 * Returns the number of hits (each of which is then re-rolled for damage).
 */
export function torpedoHitCount(faces: readonly number[]): number {
  return faces.reduce((hits, face) => hits + (face >= requireRules().torpedoHitMin ? 1 : 0), 0);
}

/**
 * Torpedo attack run, step 2: each hit is re-rolled and does damage equal to the
 * number rolled. Pass one re-roll face per hit; total damage is their sum. The
 * note gives no screen reduction for torpedo damage, so none is applied.
 */
export function torpedoRunDamage(rerollFaces: readonly number[]): number {
  return rerollFaces.reduce((total, face) => total + face, 0);
}

/**
 * Dogfight kills for an Attack fighter (and a Torpedo group after its one-shot
 * torpedo is spent): they fight only in anti-fighter mode and "kill only on a 6
 * (one kill)" -- a single kill per 6, never the universal table's 2-on-a-6.
 */
export function attackFighterDogfightKills(faces: readonly number[]): number {
  return faces.reduce(
    (kills, face) => kills + (face >= requireRules().attackFighterDogfightKillOn ? 1 : 0),
    0
  );
}
