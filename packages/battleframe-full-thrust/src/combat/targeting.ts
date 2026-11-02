/**
 * Pre-fire targeting preview (roadmap P1 #11): for each weapon on a firing ship,
 * decide -- WITHOUT rolling any dice -- whether it bears on a target and what it
 * would do at this range, so a player sees "which weapons reach, in which band"
 * before committing to fire rather than learning "out of arc" only afterwards.
 *
 * The fire/no-fire precedence mirrors combat/fire.ts `resolveWeaponFire` exactly
 * (destroyed -> spent -> out-of-arc -> per-kind range), so the preview can never
 * disagree with what actually happens on commit. Salvo and needle -- which have
 * their own scene tools rather than the general Fire tool -- are previewed on
 * their own ranges (Nmu / Nmu) so the whole loadout's reach is visible at once.
 *
 * Pure: no Foundry, no dice. The scene glue passes the already-measured range +
 * bearing (from game.battleframe.measure/facing) and formats the rows.
 *
 * Sources: FT2 "Fire Arcs", "Weapon Ranges & Damage Rolls"; ranges live in
 * constants.ts alongside the resolution code that shares them.
 */

import { tr } from "../localize";
import { type WeaponKind } from "../constants";
import type { WeaponMount } from "./fire";
import { weaponBears, type AftFireOption } from "./aft-fire";
import { beamDiceAtRange } from "./beam";
import { torpedoToHit, submunitionDiceAtRange } from "./weapons";
import { kgunToHit } from "./kravak";
import { requireRules } from "../rules-profile";

/** Why a weapon would or would not fire at this target, no dice rolled. */
export type TargetingStatus =
  | "destroyed"
  | "spent"
  | "out-of-arc"
  | "out-of-range"
  | "no-class"
  | "will-fire";

export interface TargetingRow {
  index: number;
  kind: WeaponKind;
  status: TargetingStatus;
  /** Dice this weapon would roll at range (dice weapons), else null. */
  dice: number | null;
  /** To-hit number this weapon needs at range (torpedoes), else null. */
  toHit: number | null;
  /** A short human-readable summary of the row for a tooltip / chat line. */
  effect: string;
}

export interface PreviewTargetingParams {
  weapons: readonly WeaponMount[];
  distanceMu: number;
  bearing: number;
  /** Fleet Book optional layer: conditional aft fire. Absent = rule off. */
  aftFire?: AftFireOption;
}

function statusLabel(status: TargetingStatus): string {
  switch (status) {
    case "destroyed":
      return tr("battleframe-full-thrust.targeting.destroyed", "destroyed");
    case "spent":
      return tr("battleframe-full-thrust.targeting.spent", "spent");
    case "out-of-arc":
      return tr("battleframe-full-thrust.targeting.outOfArc", "out of arc");
    case "out-of-range":
      return tr("battleframe-full-thrust.targeting.outOfRange", "out of range");
    case "no-class":
      return tr("battleframe-full-thrust.targeting.noClass", "no class set");
    case "will-fire":
      return tr("battleframe-full-thrust.targeting.bears", "bears");
  }
}

/** A dice pool, naming the world's die rather than assuming one. */
function diceEffect(dice: number): string {
  const size = requireRules().dieSize;
  return tr("battleframe-full-thrust.targeting.dice", `${dice}D${size}`, { n: dice, size });
}

/** A to-hit number; the top face has no "or better" to it. */
function hitEffect(toHit: number): string {
  return toHit >= requireRules().dieSize
    ? tr("battleframe-full-thrust.targeting.hitOn", `hit on ${toHit}`, { n: toHit })
    : tr("battleframe-full-thrust.targeting.hitOnPlus", `hit on ${toHit}+`, { n: toHit });
}

/** Resolve one weapon's targeting row once it is confirmed available and in arc. */
function inArcRow(index: number, weapon: WeaponMount, distanceMu: number): TargetingRow {
  const base = { index, kind: weapon.kind, dice: null as number | null, toHit: null as number | null };
  switch (weapon.kind) {
    case "beam": {
      const cls = weapon.weaponClass;
      if (!cls || cls < 1) {
        return { ...base, status: "no-class", effect: statusLabel("no-class") };
      }
      const dice = beamDiceAtRange(cls, distanceMu);
      if (dice <= 0) {
        return { ...base, status: "out-of-range", effect: statusLabel("out-of-range") };
      }
      return { ...base, status: "will-fire", dice, effect: diceEffect(dice) };
    }
    case "torpedo": {
      const toHit = torpedoToHit(distanceMu);
      if (toHit === null) {
        return { ...base, status: "out-of-range", effect: statusLabel("out-of-range") };
      }
      return {
        ...base,
        status: "will-fire",
        toHit,
        effect: hitEffect(toHit)
      };
    }
    case "submunition": {
      const dice = submunitionDiceAtRange(distanceMu);
      if (dice <= 0) {
        return { ...base, status: "out-of-range", effect: statusLabel("out-of-range") };
      }
      return { ...base, status: "will-fire", dice, effect: diceEffect(dice) };
    }
    case "salvo": {
      if (!Number.isFinite(distanceMu) || distanceMu > requireRules().salvoRangeMu) {
        return { ...base, status: "out-of-range", effect: statusLabel("out-of-range") };
      }
      return { ...base, status: "will-fire", effect: tr("battleframe-full-thrust.targeting.salvoOf", `salvo of ${requireRules().salvoSize}`, { n: requireRules().salvoSize }) };
    }
    case "needle": {
      if (!Number.isFinite(distanceMu) || distanceMu > requireRules().needleMaxRangeMu) {
        return { ...base, status: "out-of-range", effect: statusLabel("out-of-range") };
      }
      return { ...base, status: "will-fire", effect: tr("battleframe-full-thrust.targeting.knocksOn", `knocks a system on ${requireRules().needleKillOn}`, { n: requireRules().needleKillOn }) };
    }
    case "kgun": {
      // Every K-gun class shares one to-hit band table; class only sets the
      // penetrating damage. Mirror resolveWeaponFire's precedence: a classless
      // K-gun is "no-class", not "out-of-range".
      const cls = weapon.weaponClass;
      if (!cls || cls < 1) {
        return { ...base, status: "no-class", effect: statusLabel("no-class") };
      }
      const toHit = kgunToHit(distanceMu);
      if (toHit === null) {
        return { ...base, status: "out-of-range", effect: statusLabel("out-of-range") };
      }
      return {
        ...base,
        status: "will-fire",
        toHit,
        effect: hitEffect(toHit)
      };
    }
    default:
      return { ...base, status: "out-of-range", effect: statusLabel("out-of-range") };
  }
}

/**
 * A targeting row per weapon, in mount order. Availability and arc are checked
 * before range so the row's reason matches resolveWeaponFire's; range is checked
 * per weapon kind against its own reach.
 */
export function previewTargeting(params: PreviewTargetingParams): TargetingRow[] {
  const { weapons, distanceMu, bearing, aftFire } = params;
  return weapons.map((weapon, index) => {
    const base = { index, kind: weapon.kind, dice: null as number | null, toHit: null as number | null };
    if (weapon.destroyed) {
      return { ...base, status: "destroyed", effect: statusLabel("destroyed") };
    }
    if (weapon.spent) {
      return { ...base, status: "spent", effect: statusLabel("spent") };
    }
    if (!weaponBears(weapon.arcs, bearing, aftFire)) {
      return { ...base, status: "out-of-arc", effect: statusLabel("out-of-arc") };
    }
    return inArcRow(index, weapon, distanceMu);
  });
}
