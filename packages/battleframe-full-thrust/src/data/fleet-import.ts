/**
 * Fleet import: turns a bring-your-own-data fleet (a JSON object/string the
 * player writes) into Foundry Actor create-data, so a player can import their
 * whole fleet at once rather than the GM hand-building every ship. Pure parsing
 * + validation here; the `Actor.create` call is the importer glue.
 *
 * We ship NO fleet data -- this only reads the USER's own file. Unknown/invalid
 * fields are defaulted or dropped (with an error note) rather than rejected, so a
 * small typo does not lose the whole fleet.
 */

import {
  MODULE_ID,
  SHIP_ACTOR_TYPE,
  FIRE_ARCS,
  WEAPON_KINDS,
  type FireArc,
  type WeaponKind
} from "../constants";
import { shipClass, warshipDamagePoints, thresholdRows } from "../ship/hull";
import { requireRules } from "../rules-profile";

export interface ShipCreateData {
  name: string;
  type: string;
  system: Record<string, any>;
}

export interface FleetParseResult {
  ships: ShipCreateData[];
  errors: string[];
}

/** Rounds + clamps a numeric field to [min, max]; uses fallback only when absent/non-numeric. */
function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? Math.round(value) : NaN;
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}

/** A non-negative integer, defaulting when absent/invalid (no upper clamp). */
function nonNegInt(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? Math.round(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseWeapon(raw: any, shipName: string, errors: string[]): Record<string, any> | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  if (!WEAPON_KINDS.includes(raw.kind)) {
    errors.push(`${shipName}: dropped weapon with unknown kind "${raw.kind}"`);
    return null;
  }
  const kind = raw.kind as WeaponKind;
  const arcs = Array.isArray(raw.arcs)
    ? raw.arcs.filter((a: unknown): a is FireArc => FIRE_ARCS.includes(a as FireArc))
    : [];
  const weaponClass =
    typeof raw.weaponClass === "number" && raw.weaponClass >= 1 ? Math.round(raw.weaponClass) : null;

  return { kind, weaponClass, arcs, destroyed: false, spent: false };
}

function parseShip(raw: any, errors: string[]): ShipCreateData | null {
  if (!raw || typeof raw !== "object") {
    errors.push("skipped a fleet entry that was not an object");
    return null;
  }

  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name : "Ship";
  const mass = clampInt(raw.mass, 1, 100, 30);

  // Hull: explicit if given, else derived from MASS (warship half-MASS boxes,
  // rows by class).
  const cls = shipClass(mass);
  const hull = raw.hull && typeof raw.hull === "object"
    ? {
        boxes: clampInt(raw.hull.boxes, 1, 10_000, warshipDamagePoints(mass)),
        rows: clampInt(raw.hull.rows, 1, 100, thresholdRows(cls)),
        damage: 0
      }
    : { boxes: warshipDamagePoints(mass), rows: thresholdRows(cls), damage: 0 };

  const armour = { boxes: nonNegInt(raw.armour?.boxes, 0), damage: 0 };

  const weapons = Array.isArray(raw.weapons)
    ? raw.weapons.map((w: any) => parseWeapon(w, name, errors)).filter((w: any): w is Record<string, any> => w !== null)
    : [];

  return {
    name,
    type: `${MODULE_ID}.${SHIP_ACTOR_TYPE}`,
    system: {
      mass,
      thrust: clampInt(raw.thrust, 0, requireRules().maxThrust, 4),
      ftl: raw.ftl === undefined ? true : raw.ftl !== false,
      driveHits: 0,
      hull,
      armour,
      fcs: nonNegInt(raw.fcs, 1),
      screens: clampInt(raw.screens, 0, requireRules().maxScreenLevel, 0),
      pds: nonNegInt(raw.pds, 0),
      damageControl: nonNegInt(raw.damageControl, 0),
      velocity: nonNegInt(raw.velocity, 0),
      course: clampInt(raw.course, 1, requireRules().courses, 12),
      pointsValue: nonNegInt(raw.pointsValue, 0),
      weapons
    }
  };
}

/**
 * Parses a fleet (a JSON string or an already-parsed object with a `ships`
 * array) into ship Actor create-data. Returns the ships plus any non-fatal
 * errors (dropped weapons, skipped entries).
 */
export function parseFleet(input: unknown): FleetParseResult {
  const errors: string[] = [];

  let data: any = input;
  if (typeof input === "string") {
    try {
      data = JSON.parse(input);
    } catch {
      return { ships: [], errors: ["could not parse the fleet JSON"] };
    }
  }

  const rawShips = Array.isArray(data) ? data : data?.ships;
  if (!Array.isArray(rawShips)) {
    return { ships: [], errors: ['expected a fleet with a "ships" array (or a bare array of ships)'] };
  }

  const ships: ShipCreateData[] = [];
  for (const raw of rawShips) {
    const ship = parseShip(raw, errors);
    if (ship) {
      ships.push(ship);
    }
  }

  return { ships, errors };
}
