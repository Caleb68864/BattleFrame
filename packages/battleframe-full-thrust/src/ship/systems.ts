/**
 * The ship's threshold-check surface: enumerating the surviving system icons a
 * threshold check rolls a die for, and turning a set of knocked-out systems into
 * the actor-update that records the losses. Pure -- the dice roll and the
 * actor.update call live in the combat orchestrator.
 *
 * Drives are modelled as one system whose knockout halves the ship's thrust
 * (FT2's "first hit halves, second kills"; repeated halving reaches 0, a small
 * documented simplification of the exact two-hit rule). Each FCS, PDS and screen
 * generator is its own icon, rolled separately, per FT2.
 *
 * Sources: FT2 "Threshold Check", "Fire Control System", "Screens".
 */

export type SystemRef =
  | { type: "weapon"; index: number }
  | { type: "fcs" }
  | { type: "pds" }
  | { type: "screen" }
  | { type: "drive" };

interface WeaponEntryLike {
  destroyed?: boolean;
  spent?: boolean;
}

interface ShipSystemLike {
  thrust?: number;
  fcs?: number;
  pds?: number;
  screens?: number;
  weapons?: WeaponEntryLike[];
}

/**
 * One reference per surviving system icon: every live weapon (by index), every
 * FCS, every PDS, every screen level, and -- if the ship still has thrust -- its
 * drives. This is the list a threshold check rolls a die against.
 */
export function enumerateSurvivingSystems(system: ShipSystemLike): SystemRef[] {
  const refs: SystemRef[] = [];

  const weapons = system.weapons ?? [];
  weapons.forEach((weapon, index) => {
    if (!weapon.destroyed) {
      refs.push({ type: "weapon", index });
    }
  });

  for (let i = 0; i < (system.fcs ?? 0); i++) {
    refs.push({ type: "fcs" });
  }
  for (let i = 0; i < (system.pds ?? 0); i++) {
    refs.push({ type: "pds" });
  }
  for (let i = 0; i < (system.screens ?? 0); i++) {
    refs.push({ type: "screen" });
  }
  if ((system.thrust ?? 0) > 0) {
    refs.push({ type: "drive" });
  }

  return refs;
}

/**
 * Builds the `actor.update` payload for a set of knocked-out systems: weapons
 * flagged destroyed by index, FCS/PDS/screen counts decremented per knockout,
 * and thrust halved once per drive knockout. Counts never go below zero.
 */
export function applySystemKnockouts(
  system: ShipSystemLike,
  knocked: readonly SystemRef[]
): Record<string, any> {
  const weapons = (system.weapons ?? []).map((w) => ({ ...w }));
  let fcs = system.fcs ?? 0;
  let pds = system.pds ?? 0;
  let screens = system.screens ?? 0;
  let thrust = system.thrust ?? 0;

  for (const ref of knocked) {
    switch (ref.type) {
      case "weapon":
        if (weapons[ref.index]) {
          weapons[ref.index].destroyed = true;
        }
        break;
      case "fcs":
        fcs = Math.max(0, fcs - 1);
        break;
      case "pds":
        pds = Math.max(0, pds - 1);
        break;
      case "screen":
        screens = Math.max(0, screens - 1);
        break;
      case "drive":
        thrust = Math.floor(thrust / 2);
        break;
    }
  }

  return {
    "system.weapons": weapons,
    "system.fcs": fcs,
    "system.pds": pds,
    "system.screens": screens,
    "system.thrust": thrust
  };
}
