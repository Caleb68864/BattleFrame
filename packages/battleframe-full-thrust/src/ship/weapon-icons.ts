/**
 * Weapon-type icon markers: a small game-icon shown next to each weapon row on
 * the ship SSD, so a mount's kind reads at a glance. Pure so the mapping is
 * unit-tested without a live sheet; the sheet's `_prepareContext` calls it and
 * the template renders the returned path.
 *
 * The icons are the module's shipped game-icons.net art (CC BY 3.0, see
 * ATTRIBUTIONS.md). A kind with no sensible fit maps to `undefined` (no marker)
 * rather than a misleading picture -- kgun (a Kra'Vak kinetic railgun) has no
 * shipped icon that reads as it, so it deliberately stays unmarked.
 */

import { MODULE_ID } from "../constants";

/** Weapon kind -> shipped icon file. Omitted kinds render no marker. */
const WEAPON_ICON_FILE: Record<string, string> = {
  beam: "beam.svg",
  torpedo: "rocket.svg", // pulse torpedo -- a launched projectile
  salvo: "missiles.svg", // salvo missile launcher -- a flight of missiles
  needle: "system.svg", // needle beam -- surgically kills one system
  submunition: "explosion.svg" // submunition pack -- a bursting flak cloud
};

/**
 * The icon path for a weapon kind, or `undefined` when no shipped icon fits
 * (e.g. kgun). Returns a `modules/<id>/icons/<file>.svg` path ready for an
 * `<img src>`.
 */
export function weaponTypeIcon(type: string): string | undefined {
  const file = WEAPON_ICON_FILE[type];
  return file ? `modules/${MODULE_ID}/icons/${file}` : undefined;
}
