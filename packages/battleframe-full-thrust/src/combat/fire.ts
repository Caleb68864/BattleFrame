/**
 * Weapon-fire resolution: given a firing ship's weapons and one target's range,
 * bearing and screen level, roll each weapon and total the damage. Pure over an
 * injected dice pool (`rollPool`), so the whole firing sequence tests without
 * Foundry; the Foundry-facing orchestrator (reads actors, uses
 * game.battleframe.measure/facing/dice, applies damage) wraps this.
 *
 * Sources: FT2 "Beam Weapons", "Pulse Torpedoes", "Submunition Packs",
 * "Screens", "Fire Arcs".
 */

import { type FireArc, type WeaponKind } from "../constants";
import { beamDiceAtRange, poolBeamDamage } from "./beam";
import { poolPenetratingDamage } from "../ship/fleet-book";
import { torpedoToHit, submunitionDiceAtRange } from "./weapons";
import { kgunToHit, kgunDamageForFace } from "./kravak";
import { weaponBearsOn } from "./arcs";
import { requireRules } from "../rules-profile";

export interface WeaponMount {
  kind: WeaponKind;
  /** Beam class / battery number; ignored by non-beam weapons. */
  weaponClass?: number | null;
  arcs: FireArc[];
  destroyed?: boolean;
  spent?: boolean;
}

export interface DiceLike {
  rollPool(count: number, dieSize: number): Promise<number[]>;
}

/** Why a weapon did not fire, when it did not. */
export type NoFireReason = "destroyed" | "spent" | "out-of-arc" | "out-of-range" | "no-class";

export interface WeaponShot {
  index: number;
  kind: WeaponKind;
  fired: boolean;
  damage: number;
  reason?: NoFireReason;
  faces?: number[];
}

export interface ResolveWeaponFireParams {
  weapons: readonly WeaponMount[];
  distanceMu: number;
  bearing: number;
  targetScreenLevel: number;
  dice: DiceLike;
  /** Fleet Book optional layer: beams do penetrating (rerolling) damage. Default off. */
  penetrating?: boolean;
}

export interface WeaponFireResult {
  totalDamage: number;
  shots: WeaponShot[];
  /** Indices of one-shot weapons that fired and must be marked spent. */
  spent: number[];
  /**
   * Kra'Vak K-gun hits, one DP figure per HITTING K-gun, kept SEPARATE from
   * `totalDamage`. The K-gun pierces armour per-hit (only the first DP of each
   * single hit is stopped by armour), which the pooled "sum then apply armour
   * once" model of `totalDamage` cannot express -- so these hits bypass that pool
   * and are applied downstream, one at a time, via `applyKgunHit`. Kept as a list
   * (never pre-summed) precisely because the pierce is per-hit.
   */
  piercingHits: number[];
}

async function resolveBeam(
  weapon: WeaponMount,
  distanceMu: number,
  screenLevel: number,
  dice: DiceLike,
  penetrating: boolean
): Promise<{ damage: number; faces: number[]; reason?: NoFireReason }> {
  const cls = weapon.weaponClass;
  if (!cls || cls < 1) {
    return { damage: 0, faces: [], reason: "no-class" };
  }
  const diceCount = beamDiceAtRange(cls, distanceMu);
  if (diceCount <= 0) {
    return { damage: 0, faces: [], reason: "out-of-range" };
  }
  const faces = await dice.rollPool(diceCount, requireRules().dieSize);
  if (!penetrating) {
    return { damage: poolBeamDamage(faces, screenLevel), faces };
  }
  // Fleet Book penetrating damage: every 6 scores AND rerolls, chaining. Roll the
  // whole reroll chain (each 6 spawns one more) so `poolPenetratingDamage` can
  // score it; screens reduce only the initial dice.
  const rerollFaces: number[] = [];
  let pending = faces.filter((f) => f === requireRules().dieTwoDamage).length;
  while (pending > 0) {
    const batch = await dice.rollPool(pending, requireRules().dieSize);
    rerollFaces.push(...batch);
    pending = batch.filter((f) => f === requireRules().dieTwoDamage).length;
  }
  return { damage: poolPenetratingDamage(faces, rerollFaces, screenLevel), faces: [...faces, ...rerollFaces] };
}

async function resolveTorpedo(
  distanceMu: number,
  dice: DiceLike
): Promise<{ damage: number; faces: number[]; reason?: NoFireReason }> {
  const toHit = torpedoToHit(distanceMu);
  if (toHit === null) {
    return { damage: 0, faces: [], reason: "out-of-range" };
  }
  // One launcher = one to-hit die; screens do not reduce torpedoes.
  const [hitFace] = await dice.rollPool(1, requireRules().dieSize);
  if (hitFace === undefined || hitFace < toHit) {
    return { damage: 0, faces: hitFace === undefined ? [] : [hitFace] };
  }
  const [damageFace] = await dice.rollPool(1, requireRules().dieSize);
  return { damage: damageFace ?? 0, faces: [hitFace, damageFace ?? 0] };
}

async function resolveSubmunition(
  distanceMu: number,
  dice: DiceLike
): Promise<{ damage: number; faces: number[]; reason?: NoFireReason }> {
  const diceCount = submunitionDiceAtRange(distanceMu);
  if (diceCount <= 0) {
    return { damage: 0, faces: [], reason: "out-of-range" };
  }
  const faces = await dice.rollPool(diceCount, requireRules().dieSize);
  // Submunitions ignore screens: score them on the unscreened table.
  return { damage: poolBeamDamage(faces, 0), faces };
}

/**
 * Kra'Vak K-gun: roll ONE to-hit die against the band target number
 * (`kgunToHit`, kinetic so screens never apply); on a hit roll a penetration die
 * and score it against gun class (`kgunDamageForFace`). Returns the single hit's
 * DP so the caller can route it into `piercingHits` -- the K-gun does NOT feed
 * the armour-eligible `totalDamage` pool, because its damage pierces armour
 * per-hit (applied downstream via `applyKgunHit`). A miss still "fired" but adds
 * no hit (damage 0, no `piercingHit`).
 */
async function resolveKgun(
  weapon: WeaponMount,
  distanceMu: number,
  dice: DiceLike
): Promise<{ damage: number; faces: number[]; reason?: NoFireReason; piercingHit?: number }> {
  const cls = weapon.weaponClass;
  if (!cls || cls < 1) {
    return { damage: 0, faces: [], reason: "no-class" };
  }
  const toHit = kgunToHit(distanceMu);
  if (toHit === null) {
    return { damage: 0, faces: [], reason: "out-of-range" };
  }
  const [hitFace] = await dice.rollPool(1, requireRules().dieSize);
  if (hitFace === undefined || hitFace < toHit) {
    return { damage: 0, faces: hitFace === undefined ? [] : [hitFace] };
  }
  const [penFace] = await dice.rollPool(1, requireRules().dieSize);
  const damage = kgunDamageForFace(cls, penFace ?? 0);
  return { damage, faces: [hitFace, penFace ?? 0], piercingHit: damage };
}

/**
 * Resolves every weapon on a ship firing at one target. Weapons that are
 * destroyed, spent, out of arc, or out of range do not fire (with a reason);
 * the rest roll and their damage is pooled into `totalDamage`.
 */
export async function resolveWeaponFire(
  params: ResolveWeaponFireParams
): Promise<WeaponFireResult> {
  const { weapons, distanceMu, bearing, targetScreenLevel, dice, penetrating } = params;

  const shots: WeaponShot[] = [];
  const spent: number[] = [];
  const piercingHits: number[] = [];
  let totalDamage = 0;

  for (let index = 0; index < weapons.length; index++) {
    const weapon = weapons[index];

    if (weapon.destroyed) {
      shots.push({ index, kind: weapon.kind, fired: false, damage: 0, reason: "destroyed" });
      continue;
    }
    if (weapon.spent) {
      shots.push({ index, kind: weapon.kind, fired: false, damage: 0, reason: "spent" });
      continue;
    }
    if (!weaponBearsOn(weapon.arcs, bearing)) {
      shots.push({ index, kind: weapon.kind, fired: false, damage: 0, reason: "out-of-arc" });
      continue;
    }

    let outcome: { damage: number; faces: number[]; reason?: NoFireReason; piercingHit?: number };
    switch (weapon.kind) {
      case "beam":
        outcome = await resolveBeam(weapon, distanceMu, targetScreenLevel, dice, penetrating ?? false);
        break;
      case "torpedo":
        outcome = await resolveTorpedo(distanceMu, dice);
        break;
      case "submunition":
        outcome = await resolveSubmunition(distanceMu, dice);
        break;
      case "kgun":
        outcome = await resolveKgun(weapon, distanceMu, dice);
        break;
      default:
        // Needle beams target a specific system, not the hull -- resolved elsewhere.
        outcome = { damage: 0, faces: [], reason: "no-class" };
    }

    if (outcome.reason) {
      shots.push({ index, kind: weapon.kind, fired: false, damage: 0, reason: outcome.reason, faces: outcome.faces });
      continue;
    }

    // The K-gun's damage pierces armour per-hit, so it does NOT join the pooled
    // `totalDamage` (which is summed then run through armour once); it is carried
    // separately in `piercingHits` and applied downstream via `applyKgunHit`.
    if (outcome.piercingHit !== undefined) {
      piercingHits.push(outcome.piercingHit);
    } else {
      totalDamage += outcome.damage;
    }
    shots.push({ index, kind: weapon.kind, fired: true, damage: outcome.damage, faces: outcome.faces });

    if (weapon.kind === "submunition") {
      spent.push(index);
    }
  }

  return { totalDamage, shots, spent, piercingHits };
}
