/**
 * The ship's threshold-check surface, and the design-vs-damage model for its
 * repairable systems. Each of FCS / PDS / screens carries a DESIGN count plus a
 * `…Lost` damage counter (remaining = design − lost), exactly mirroring the hull
 * `boxes`/`damage` pattern; drives carry a `driveHits` counter (0 = full, 1 =
 * half thrust, 2 = dead). Keeping the design intact is what makes damage-control
 * repair and an "N/M" SSD possible -- a plain decrement forgot the original.
 *
 * Pure -- the dice roll and the actor.update live in the combat orchestrator.
 *
 * Sources: FT2 "Threshold Check", "Fire Control System", "Screens"; More Thrust
 * "Damage Control".
 */

export type SystemRef =
  | { type: "weapon"; index: number }
  | { type: "fcs" }
  | { type: "pds" }
  | { type: "screen" }
  | { type: "drive" };

interface WeaponEntryLike {
  destroyed?: boolean;
}

export interface ShipSystemLike {
  thrust?: number;
  driveHits?: number;
  fcs?: number;
  fcsLost?: number;
  pds?: number;
  pdsLost?: number;
  screens?: number;
  screensLost?: number;
  weapons?: WeaponEntryLike[];
}

const clampMin0 = (n: number): number => (n > 0 ? n : 0);

/** Usable thrust after drive damage: full, half (floor), or dead. */
export function usableThrust(system: ShipSystemLike): number {
  const thrust = system.thrust ?? 0;
  const hits = system.driveHits ?? 0;
  if (hits >= 2) return 0;
  if (hits === 1) return Math.floor(thrust / 2);
  return thrust;
}

/** Remaining fire-control systems (design − lost). */
export function remainingFcs(system: ShipSystemLike): number {
  return clampMin0((system.fcs ?? 0) - (system.fcsLost ?? 0));
}
/** Remaining point-defence systems (design − lost). */
export function remainingPds(system: ShipSystemLike): number {
  return clampMin0((system.pds ?? 0) - (system.pdsLost ?? 0));
}
/** Remaining screen generators (design − lost). */
export function remainingScreens(system: ShipSystemLike): number {
  return clampMin0((system.screens ?? 0) - (system.screensLost ?? 0));
}

/**
 * One reference per surviving system icon: every live weapon, every remaining
 * FCS/PDS/screen, and -- if the drives still push -- the drives. This is the list
 * a threshold check rolls a die against.
 */
export function enumerateSurvivingSystems(system: ShipSystemLike): SystemRef[] {
  const refs: SystemRef[] = [];

  (system.weapons ?? []).forEach((weapon, index) => {
    if (!weapon.destroyed) {
      refs.push({ type: "weapon", index });
    }
  });

  for (let i = 0; i < remainingFcs(system); i++) refs.push({ type: "fcs" });
  for (let i = 0; i < remainingPds(system); i++) refs.push({ type: "pds" });
  for (let i = 0; i < remainingScreens(system); i++) refs.push({ type: "screen" });
  if (usableThrust(system) > 0) refs.push({ type: "drive" });

  return refs;
}

/**
 * The `actor.update` payload for a set of knocked-out systems: weapons flagged
 * destroyed by index, the FCS/PDS/screen LOST counters incremented per knockout,
 * and driveHits advanced (half then dead, capped at 2). The design counts are
 * never touched.
 */
export function applySystemKnockouts(
  system: ShipSystemLike,
  knocked: readonly SystemRef[]
): Record<string, any> {
  const weapons = (system.weapons ?? []).map((w) => ({ ...w }));
  let fcsLost = system.fcsLost ?? 0;
  let pdsLost = system.pdsLost ?? 0;
  let screensLost = system.screensLost ?? 0;
  let driveHits = system.driveHits ?? 0;

  for (const ref of knocked) {
    switch (ref.type) {
      case "weapon":
        if (weapons[ref.index]) weapons[ref.index].destroyed = true;
        break;
      case "fcs":
        fcsLost += 1;
        break;
      case "pds":
        pdsLost += 1;
        break;
      case "screen":
        screensLost += 1;
        break;
      case "drive":
        driveHits = Math.min(2, driveHits + 1);
        break;
    }
  }

  return {
    "system.weapons": weapons,
    "system.fcsLost": fcsLost,
    "system.pdsLost": pdsLost,
    "system.screensLost": screensLost,
    "system.driveHits": driveHits
  };
}

/**
 * The `actor.update` payload for a set of repaired systems (damage control):
 * decrement the matching LOST counter / step driveHits back toward full, never
 * past the design. Weapon repairs are handled elsewhere (a specific mount).
 */
export function applySystemRepairs(
  system: ShipSystemLike,
  repaired: readonly SystemRef[]
): Record<string, any> {
  let fcsLost = system.fcsLost ?? 0;
  let pdsLost = system.pdsLost ?? 0;
  let screensLost = system.screensLost ?? 0;
  let driveHits = system.driveHits ?? 0;

  for (const ref of repaired) {
    switch (ref.type) {
      case "fcs":
        fcsLost = Math.max(0, fcsLost - 1);
        break;
      case "pds":
        pdsLost = Math.max(0, pdsLost - 1);
        break;
      case "screen":
        screensLost = Math.max(0, screensLost - 1);
        break;
      case "drive":
        driveHits = Math.max(0, driveHits - 1);
        break;
    }
  }

  return {
    "system.fcsLost": fcsLost,
    "system.pdsLost": pdsLost,
    "system.screensLost": screensLost,
    "system.driveHits": driveHits
  };
}
