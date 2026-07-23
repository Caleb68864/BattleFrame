/**
 * Which Full Thrust actions a ship can actually perform RIGHT NOW, derived purely
 * from its data + damage state. This is the decluttering brain behind the token
 * HUD (`ui/token-hud-actions.ts`): a selected ship offers only the buttons it can
 * use -- a plain beam frigate shows Plot + Fire and nothing else, while a needle
 * cruiser, salvo destroyer, or carrier surfaces its own extra actions, and a
 * drive-dead or fire-control-out hull loses the actions it can no longer take.
 *
 * Pure (no Foundry, no DOM) so the availability logic is unit-tested independently
 * of how the buttons are drawn, and cleanly liftable if another ruleset wants the
 * same "show only what this unit can do" HUD pattern.
 *
 * Mirrors the gates the real actions enforce: `usableThrust` (movement),
 * `remainingFcs` + a live fire-capable weapon (fire, matching `fireShipAtTarget`),
 * the weapon `kind`/`destroyed`/`spent` fields (needle/salvo), and `bays`
 * (carrier ops).
 */

import { usableThrust, remainingFcs, type ShipSystemLike } from "./systems";

/** Weapon kinds the general Fire action actually resolves against a hull (see
 * `combat/fire.ts`); needle + salvo have their own dedicated actions. */
const FIRE_KINDS = new Set(["beam", "torpedo", "submunition", "kgun"]);

export interface ShipActionAvailability {
  /** Plot a movement order -- the ship still has thrust to manoeuvre with. */
  plot: boolean;
  /** Fire at a target -- a live fire-capable weapon remains and fire control is up. */
  fire: boolean;
  /** Split fire across targets -- two or more fire-control systems remain. */
  splitFire: boolean;
  /** Needle beam -- an undamaged needle mount is fitted (and fire control is up). */
  needle: boolean;
  /** Salvo missiles -- an unspent salvo launcher is fitted. */
  salvo: boolean;
  /** Launch a fighter group -- the ship is a carrier (has bays). */
  launchFighters: boolean;
  /** Recover a fighter group -- the ship is a carrier (has bays). */
  recoverFighters: boolean;
  /** Spinal Nova Cannon -- the ship is flagged as mounting one. */
  nova: boolean;
  /** Spinal Wave Gun -- the ship is flagged as mounting one. */
  waveGun: boolean;
}

interface WeaponLike {
  kind?: string;
  destroyed?: boolean;
  spent?: boolean;
}

/**
 * The spinal-weapon flags are read defensively from optional system booleans
 * (`novaCannon` / `waveGun`). The ship data model does not yet define fields for
 * these mega-weapons, so in the current schema they are always absent and the
 * spinal actions stay on the scene toolbar only -- but the moment a world (or a
 * later schema addition) sets the flag, the HUD surfaces them with no code change.
 */
interface SpinalFlags {
  novaCannon?: boolean;
  waveGun?: boolean;
  /** Fighter bays (carrier); not part of the threshold-check ShipSystemLike. */
  bays?: number;
}

export function availableShipActions(system: ShipSystemLike & SpinalFlags): ShipActionAvailability {
  const s = (system ?? {}) as ShipSystemLike & SpinalFlags;
  const weapons = (Array.isArray(s.weapons) ? s.weapons : []) as WeaponLike[];
  const isLive = (w: WeaponLike): boolean => !!w && !w.destroyed && !w.spent;

  const hasFireWeapon = weapons.some((w) => isLive(w) && FIRE_KINDS.has(w.kind ?? ""));
  const hasNeedle = weapons.some((w) => isLive(w) && w.kind === "needle");
  const hasSalvo = weapons.some((w) => isLive(w) && w.kind === "salvo");

  // Matches fireShipAtTarget: an undefined fcs field defaults to "able" (design
  // default 1), so only a ship whose remaining fire control is zero is barred.
  const fcsRemaining = s.fcs === undefined ? 1 : remainingFcs(s);
  const fireControlUp = fcsRemaining >= 1;

  const bays = Number(s.bays ?? 0);

  return {
    plot: usableThrust(s) > 0,
    fire: hasFireWeapon && fireControlUp,
    splitFire: hasFireWeapon && fcsRemaining >= 2,
    needle: hasNeedle && fireControlUp,
    salvo: hasSalvo,
    launchFighters: bays > 0,
    recoverFighters: bays > 0,
    nova: !!s.novaCannon,
    waveGun: !!s.waveGun
  };
}
