/**
 * FT2 Mass/Points ship-design helpers: the arithmetic that turns a ship's size,
 * drives and systems into its Points combat value (used to match fleets). Pure;
 * a design UI or a validation check calls these. Only the FT2 system is modelled
 * (not the alternative Fleet Book variable-hull system -- the two are not
 * balance-compatible).
 *
 * Sources: FT2 "Mass & Points", "Drive Systems Cost", "Beam Weapon Batteries",
 * the Ship Design cheat sheet.
 */

import type { ShipClass } from "./hull";

/** Warship hull cost in points: 2 x MASS. */
export function hullCost(mass: number): number {
  return 2 * mass;
}

/** Warship system-mass budget: half the ship's MASS. */
export function systemsMassBudget(mass: number): number {
  return Math.floor(mass / 2);
}

/**
 * Main-drive cost in points, scaling by class: escort MASS x thrust / 4, cruiser
 * / 2, capital / 1. Drives cost points but no MASS.
 */
export function mainDriveCost(cls: ShipClass, mass: number, thrust: number): number {
  const divisor = cls === "escort" ? 4 : cls === "cruiser" ? 2 : 1;
  return Math.ceil((mass * thrust) / divisor);
}

/** Optional FTL drive: costs its MASS in points. */
export function ftlDriveCost(mass: number): number {
  return mass;
}

/** Free fire-control systems by class: escort 1, cruiser 2, capital 3. */
export function freeFcs(cls: ShipClass): number {
  return cls === "escort" ? 1 : cls === "cruiser" ? 2 : 3;
}

/**
 * Beam-battery point cost: base + per-arc x arcs, where a Class-N battery has
 * base (N+1) and per-arc N. (FT2 'A'/'B'/'C' = class 3/2/1: A 3-arc = 13, etc.)
 */
export function beamBatteryCost(cls: number, arcs: number): number {
  const base = cls + 1;
  const perArc = cls;
  return base + perArc * arcs;
}

/** Beam-battery MASS in the FT2 range: equals the class number (C=1, B=2, A=3). */
export function beamBatteryMass(cls: number): number {
  return cls;
}

/** Fixed point costs of the common non-beam systems (FT2). */
export const SYSTEM_POINTS = {
  pdaf: 3,
  adaf: 10,
  needle: 6,
  torpedo: 15,
  submunition: 3,
  extraFcs: 10,
  screenLevel1: 25,
  screenLevel2: 50
} as const;

export interface BatterySpec {
  cls: number;
  arcs: number;
  count: number;
}

export interface DesignSpec {
  mass: number;
  shipClass: ShipClass;
  thrust: number;
  ftl?: boolean;
  /** Screen level 0-2 (FT2 costs a level-1 at 25, level-2 at 50). */
  screens?: number;
  pdaf?: number;
  adaf?: number;
  needles?: number;
  torpedoes?: number;
  submunitions?: number;
  /** Extra fire-control systems beyond the free allowance. */
  extraFcs?: number;
  batteries?: BatterySpec[];
}

/** Total Points value of a ship design: hull + drives + every fitted system. */
export function designPoints(spec: DesignSpec): number {
  let total = hullCost(spec.mass);
  total += mainDriveCost(spec.shipClass, spec.mass, spec.thrust);
  if (spec.ftl) {
    total += ftlDriveCost(spec.mass);
  }

  if (spec.screens === 1) total += SYSTEM_POINTS.screenLevel1;
  if (spec.screens === 2) total += SYSTEM_POINTS.screenLevel2;

  total += (spec.pdaf ?? 0) * SYSTEM_POINTS.pdaf;
  total += (spec.adaf ?? 0) * SYSTEM_POINTS.adaf;
  total += (spec.needles ?? 0) * SYSTEM_POINTS.needle;
  total += (spec.torpedoes ?? 0) * SYSTEM_POINTS.torpedo;
  total += (spec.submunitions ?? 0) * SYSTEM_POINTS.submunition;
  total += (spec.extraFcs ?? 0) * SYSTEM_POINTS.extraFcs;

  for (const battery of spec.batteries ?? []) {
    total += beamBatteryCost(battery.cls, battery.arcs) * battery.count;
  }

  return total;
}
