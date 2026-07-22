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

import { DIE_SIZE, type FireArc, type WeaponKind } from "../constants";
import { beamDiceAtRange, poolBeamDamage } from "./beam";
import { torpedoToHit, submunitionDiceAtRange } from "./weapons";
import { weaponBearsOn } from "./arcs";

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
}

export interface WeaponFireResult {
  totalDamage: number;
  shots: WeaponShot[];
  /** Indices of one-shot weapons that fired and must be marked spent. */
  spent: number[];
}

async function resolveBeam(
  weapon: WeaponMount,
  distanceMu: number,
  screenLevel: number,
  dice: DiceLike
): Promise<{ damage: number; faces: number[]; reason?: NoFireReason }> {
  const cls = weapon.weaponClass;
  if (!cls || cls < 1) {
    return { damage: 0, faces: [], reason: "no-class" };
  }
  const diceCount = beamDiceAtRange(cls, distanceMu);
  if (diceCount <= 0) {
    return { damage: 0, faces: [], reason: "out-of-range" };
  }
  const faces = await dice.rollPool(diceCount, DIE_SIZE);
  return { damage: poolBeamDamage(faces, screenLevel), faces };
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
  const [hitFace] = await dice.rollPool(1, DIE_SIZE);
  if (hitFace === undefined || hitFace < toHit) {
    return { damage: 0, faces: hitFace === undefined ? [] : [hitFace] };
  }
  const [damageFace] = await dice.rollPool(1, DIE_SIZE);
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
  const faces = await dice.rollPool(diceCount, DIE_SIZE);
  // Submunitions ignore screens: score them on the unscreened table.
  return { damage: poolBeamDamage(faces, 0), faces };
}

/**
 * Resolves every weapon on a ship firing at one target. Weapons that are
 * destroyed, spent, out of arc, or out of range do not fire (with a reason);
 * the rest roll and their damage is pooled into `totalDamage`.
 */
export async function resolveWeaponFire(
  params: ResolveWeaponFireParams
): Promise<WeaponFireResult> {
  const { weapons, distanceMu, bearing, targetScreenLevel, dice } = params;

  const shots: WeaponShot[] = [];
  const spent: number[] = [];
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

    let outcome: { damage: number; faces: number[]; reason?: NoFireReason };
    switch (weapon.kind) {
      case "beam":
        outcome = await resolveBeam(weapon, distanceMu, targetScreenLevel, dice);
        break;
      case "torpedo":
        outcome = await resolveTorpedo(distanceMu, dice);
        break;
      case "submunition":
        outcome = await resolveSubmunition(distanceMu, dice);
        break;
      default:
        // Needle beams target a specific system, not the hull -- resolved elsewhere.
        outcome = { damage: 0, faces: [], reason: "no-class" };
    }

    if (outcome.reason) {
      shots.push({ index, kind: weapon.kind, fired: false, damage: 0, reason: outcome.reason, faces: outcome.faces });
      continue;
    }

    totalDamage += outcome.damage;
    shots.push({ index, kind: weapon.kind, fired: true, damage: outcome.damage, faces: outcome.faces });

    if (weapon.kind === "submunition") {
      spent.push(index);
    }
  }

  return { totalDamage, shots, spent };
}
