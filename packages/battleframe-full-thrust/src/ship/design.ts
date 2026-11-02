/**
 * FT2 Mass/Points ship-design helpers: the arithmetic that turns a ship's size,
 * drives and systems into its Points combat value (used to match fleets). Pure;
 * a design UI or a validation check calls these. A ship with a `hullGrade` prices
 * its hull by the Fleet Book variable-hull system instead; the two systems are not
 * balance-compatible, so a fleet should use one or the other.
 *
 * Sources: FT2 "Mass & Points", "Drive Systems Cost", "Beam Weapon Batteries",
 * the Ship Design cheat sheet.
 */

import { shipClass, type ShipClass } from "./hull";
import { hullPointsForGrade } from "./variable-hull";
import { requireRules } from "../rules-profile";
import type { HullGrade } from "../constants";

/** Dividing by a value the world left empty yields zero rather than Infinity. */
function divide(amount: number, divisor: number): number {
  return divisor > 0 ? amount / divisor : 0;
}

/** Warship hull cost in points, from the world's per-MASS cost. */
export function hullCost(mass: number): number {
  return requireRules().hullCostPerMass * mass;
}

/** Warship system-mass budget: the world's share of the ship's MASS. */
export function systemsMassBudget(mass: number): number {
  return Math.floor(divide(mass, requireRules().systemsMassDivisor));
}

/** The world's per-class value for one of the class-keyed tables. */
function byClass(cls: ShipClass, escort: number, cruiser: number, capital: number): number {
  return cls === "escort" ? escort : cls === "cruiser" ? cruiser : capital;
}

/** Main-drive cost in points, by the world's per-class divisor. Drives cost no MASS. */
export function mainDriveCost(cls: ShipClass, mass: number, thrust: number): number {
  const rules = requireRules();
  const divisor = byClass(cls, rules.driveCostDivisorEscort, rules.driveCostDivisorCruiser, rules.driveCostDivisorCapital);
  return Math.ceil(divide(mass * thrust, divisor));
}

/** Optional FTL drive: costs its MASS in points. */
export function ftlDriveCost(mass: number): number {
  return mass;
}

/** Free fire-control systems, by the world's per-class allowance. */
export function freeFcs(cls: ShipClass): number {
  const rules = requireRules();
  return byClass(cls, rules.freeFcsEscort, rules.freeFcsCruiser, rules.freeFcsCapital);
}

/** Beam-battery point cost: base + per-arc x arcs, both derived from the class. */
export function beamBatteryCost(cls: number, arcs: number): number {
  const base = cls + 1;
  const perArc = cls;
  return base + perArc * arcs;
}

/** Beam-battery MASS: equals the class number. */
export function beamBatteryMass(cls: number): number {
  return cls;
}

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
  /** Screen level; the world prices the first two levels. */
  screens?: number;
  pdaf?: number;
  adaf?: number;
  needles?: number;
  torpedoes?: number;
  submunitions?: number;
  /** Extra fire-control systems beyond the free allowance. */
  extraFcs?: number;
  batteries?: BatterySpec[];
  /** Fleet Book variable hull: prices the hull by this grade instead of the fixed rule. */
  hullGrade?: HullGrade | "";
}

/**
 * Total Points value of a ship design: hull + drives + every fitted system.
 * (Computes the Points combat value only; it does not sum system MASS or
 * validate it against the half-MASS budget -- that is a separate design check.)
 */
export function designPoints(spec: DesignSpec): number {
  const rules = requireRules();
  let total = spec.hullGrade ? hullPointsForGrade(spec.mass, spec.hullGrade) : hullCost(spec.mass);
  total += mainDriveCost(spec.shipClass, spec.mass, spec.thrust);
  if (spec.ftl) {
    total += ftlDriveCost(spec.mass);
  }

  if (spec.screens === 1) total += rules.pointsScreenLevel1;
  if (spec.screens === 2) total += rules.pointsScreenLevel2;

  total += (spec.pdaf ?? 0) * rules.pointsPdaf;
  total += (spec.adaf ?? 0) * rules.pointsAdaf;
  total += (spec.needles ?? 0) * rules.pointsNeedle;
  total += (spec.torpedoes ?? 0) * rules.pointsTorpedo;
  total += (spec.submunitions ?? 0) * rules.pointsSubmunition;
  total += (spec.extraFcs ?? 0) * rules.pointsExtraFcs;

  for (const battery of spec.batteries ?? []) {
    total += beamBatteryCost(battery.cls, battery.arcs) * battery.count;
  }

  return total;
}

interface ShipSystemForPoints {
  hullGrade?: HullGrade | "";
  mass?: number;
  thrust?: number;
  ftl?: boolean;
  screens?: number;
  pds?: number;
  fcs?: number;
  weapons?: Array<{ kind?: string; weaponClass?: number | null; arcs?: unknown[] }>;
}

/**
 * The Points value of a ship from its live in-play systems (mass, thrust, ftl,
 * screens, pds, fcs, weapon mounts) -- mapping the play model onto a `DesignSpec`
 * and running `designPoints`. Beams become batteries (class + arc count); PDS are
 * costed as PDAF; FCS beyond the free class allowance is charged. An informative
 * FT2 estimate, not a full designer.
 */
export function shipPointsFromSystem(system: ShipSystemForPoints): number {
  const mass = system.mass ?? 0;
  const cls = shipClass(mass);
  const weapons = system.weapons ?? [];

  const batteries = weapons
    .filter((w) => w.kind === "beam" && (w.weaponClass ?? 0) >= 1)
    .map((w) => ({ cls: w.weaponClass as number, arcs: (w.arcs ?? []).length, count: 1 }));

  const countKind = (kind: string): number => weapons.filter((w) => w.kind === kind).length;

  const spec: DesignSpec = {
    mass,
    hullGrade: system.hullGrade,
    shipClass: cls,
    thrust: system.thrust ?? 0,
    ftl: system.ftl ?? false,
    // designPoints only prices screen levels 1 and 2; treat level 3 as 2 for cost.
    screens: Math.min(2, system.screens ?? 0),
    pdaf: system.pds ?? 0,
    torpedoes: countKind("torpedo"),
    submunitions: countKind("submunition"),
    needles: countKind("needle"),
    extraFcs: Math.max(0, (system.fcs ?? 0) - freeFcs(cls)),
    batteries
  };

  return designPoints(spec);
}
